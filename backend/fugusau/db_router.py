"""
FUGUSAU Portal — Database Router
File: fugusau/db_router.py

Routes SELECT queries to the read replica and all writes to the primary.

Setup:
1. Add to settings/base.py:
       DATABASE_ROUTERS = ['fugusau.db_router.PrimaryReplicaRouter']

2. Add to settings/production.py:
       DATABASES['replica'] = {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME':     config('DB_REPLICA_NAME',     default='fugusau_db'),
           'USER':     config('DB_REPLICA_USER',     default='fugusau_replica'),
           'PASSWORD': config('DB_REPLICA_PASSWORD', default=''),
           'HOST':     config('DB_REPLICA_HOST',     default='localhost'),
           'PORT':     config('DB_REPLICA_PORT',     default='5432'),
           'TEST':     {'MIRROR': 'default'},  # Tests use primary
       }

3. In docker-compose.prod.yml add a db-replica service (PostgreSQL streaming replica).
"""


class PrimaryReplicaRouter:
    """
    A Django database router that:
      - sends all SELECT queries to the 'replica' database
      - sends all writes (INSERT / UPDATE / DELETE) to 'default' (primary)
      - falls back to 'default' if 'replica' is not configured
    """

    # These apps need strict consistency — always use primary
    PRIMARY_ONLY_APPS = frozenset({
        'sessions',
        'token_blacklist',          # JWT blacklist must be immediately consistent
        'django_celery_beat',       # Beat uses advisory locks on primary
        'django_celery_results',
        'admin',
    })

    def db_for_read(self, model, **hints):
        """Route all reads to replica when available."""
        from django.db import connections
        if model._meta.app_label in self.PRIMARY_ONLY_APPS:
            return 'default'
        if 'replica' in connections.databases:
            return 'replica'
        return 'default'

    def db_for_write(self, model, **hints):
        """All writes go to primary."""
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        """Allow relations between objects on primary and replica."""
        dbs = {'default', 'replica'}
        return obj1._state.db in dbs and obj2._state.db in dbs

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Only run migrations on primary."""
        return db == 'default'
