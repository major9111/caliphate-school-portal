"""
FUGUSAU Portal — Courses Migration: Add CoursePrerequisite table
Path: fugusau/apps/courses/migrations/0004_course_prerequisite.py

Fix #3: CoursePrerequisite was added to courses/models.py but had no migration.
Without this file `python manage.py migrate` never creates the
`course_prerequisites` table, so any call to
CoursePrerequisite.objects.filter(...) raises:
    ProgrammingError: relation "course_prerequisites" does not exist
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        # Must come after the last existing courses migration
        ('courses', '0003_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CoursePrerequisite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                (
                    'course',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='prerequisites',
                        to='courses.course',
                    ),
                ),
                (
                    'prerequisite',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='required_for',
                        to='courses.course',
                    ),
                ),
                (
                    'min_grade',
                    models.CharField(
                        default='D',
                        help_text='Minimum grade to satisfy prerequisite',
                        max_length=3,
                    ),
                ),
            ],
            options={
                'db_table': 'course_prerequisites',
            },
        ),
        migrations.AlterUniqueTogether(
            name='courseprerequisite',
            unique_together={('course', 'prerequisite')},
        ),
    ]
