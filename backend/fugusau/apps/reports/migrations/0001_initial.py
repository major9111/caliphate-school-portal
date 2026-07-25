"""
FUGUSAU Portal — Reports App Initial Migration
Path: fugusau/apps/reports/migrations/0001_initial.py

Companion to Fix #9 (reports/models.py).
Creates the report_snapshots table for the new ReportSnapshot model.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportSnapshot',
            fields=[
                ('id',            models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('report_type',   models.CharField(max_length=30, choices=[
                    ('ENROLLMENT', 'Enrollment Summary'),
                    ('RESULTS',    'Exam Results'),
                    ('FEES',       'Fee Collections'),
                    ('ATTENDANCE', 'Attendance'),
                    ('LIBRARY',    'Library Activity'),
                    ('HOSTEL',     'Hostel Occupancy'),
                    ('SECURITY',   'Security Events'),
                    ('ADMISSIONS', 'Admissions'),
                    ('GENERAL',    'General'),
                ])),
                ('title',         models.CharField(max_length=255)),
                ('generated_by',  models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='generated_reports',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('parameters',    models.JSONField(blank=True, default=dict)),
                ('file',          models.FileField(blank=True, null=True, upload_to='reports/%Y/%m/')),
                ('output_format', models.CharField(
                    choices=[('pdf','PDF'),('csv','CSV'),('xlsx','Excel'),('json','JSON')],
                    default='pdf',
                    max_length=10,
                )),
                ('row_count',     models.IntegerField(default=0)),
                ('generated_at',  models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table':  'report_snapshots',
                'ordering':  ['-generated_at'],
                'verbose_name':        'Report Snapshot',
                'verbose_name_plural': 'Report Snapshots',
            },
        ),
    ]
