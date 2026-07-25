from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fugusau.apps.users'
    verbose_name = 'Users'

    def ready(self):
        import fugusau.apps.users.audit_signals  # noqa — registers all signals
