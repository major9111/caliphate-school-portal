from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # Intentionally empty - indexes removed due to cross-app migration conflict
    ]
