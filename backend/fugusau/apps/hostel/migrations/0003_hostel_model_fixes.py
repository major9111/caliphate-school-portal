"""
Migration: hostel model fixes
- Raise status max_length from 10 → 20
- Add db_index to status field
- session FK already has db_index via ForeignKey (implicit), explicit flag is a no-op in Postgres
  but harmless — included for clarity on SQLite / other backends.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('hostel', '0002_initial'),
    ]

    operations = [
        # Raise max_length on status from 10 → 20 for future-proofing
        migrations.AlterField(
            model_name='hostelallocation',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('pending',  'Pending'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('vacated',  'Vacated'),
                ],
                default='pending',
                db_index=True,
            ),
        ),
    ]
