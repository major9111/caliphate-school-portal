"""FUGUSAU Portal — Courses App Models"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from fugusau.apps.students.models import Department, StudentProfile

User = get_user_model()


class AcademicSession(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name       = models.CharField(max_length=20, unique=True, help_text='e.g. 2025/2026')
    is_current = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date   = models.DateField()

    class Meta:
        db_table = 'academic_sessions'
        ordering = ['-name']

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicSession.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)

    def __str__(self): return self.name


class Course(models.Model):
    FIRST  = 'first'
    SECOND = 'second'
    BOTH   = 'both'

    SEMESTER_CHOICES = [(FIRST,'First'),(SECOND,'Second'),(BOTH,'Both')]
    LEVEL_CHOICES    = [(100,'100L'),(200,'200L'),(300,'300L'),(400,'400L'),(500,'500L')]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code         = models.CharField(max_length=10, unique=True)
    title        = models.CharField(max_length=300)
    department   = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='courses')
    credit_units = models.PositiveIntegerField()
    level        = models.IntegerField(choices=LEVEL_CHOICES)
    semester     = models.CharField(max_length=10, choices=SEMESTER_CHOICES)
    description  = models.TextField(blank=True)
    is_elective  = models.BooleanField(default=False)
    is_active    = models.BooleanField(default=True)

    class Meta:
        db_table = 'courses'
        ordering = ['code']

    def __str__(self): return f'{self.code} — {self.title}'


class CourseAssignment(models.Model):
    """Which lecturer teaches which course in which session"""
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course   = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    lecturer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='course_assignments')
    session  = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    semester = models.CharField(max_length=10)
    max_students = models.IntegerField(default=200)

    class Meta:
        db_table = 'course_assignments'
        unique_together = ['course', 'session', 'semester']


class Enrollment(models.Model):
    REGISTERED = 'registered'
    DROPPED    = 'dropped'
    COMPLETED  = 'completed'

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student  = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='enrollments')
    course   = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    session  = models.ForeignKey(AcademicSession, on_delete=models.CASCADE)
    semester = models.CharField(max_length=10)
    status   = models.CharField(max_length=20, default=REGISTERED)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'enrollments'
        unique_together = ['student', 'course', 'session', 'semester']


class Timetable(models.Model):
    DAYS = [('MON','Monday'),('TUE','Tuesday'),('WED','Wednesday'),
            ('THU','Thursday'),('FRI','Friday'),('SAT','Saturday')]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(CourseAssignment, on_delete=models.CASCADE, related_name='timetable')
    day        = models.CharField(max_length=3, choices=DAYS)
    start_time = models.TimeField()
    end_time   = models.TimeField()
    venue      = models.CharField(max_length=100)
    week_type  = models.CharField(max_length=10, default='every', help_text='every, odd, even')

    class Meta:
        db_table = 'timetable'
        ordering = ['day', 'start_time']


class Attendance(models.Model):
    PRESENT = 'present'
    ABSENT  = 'absent'
    EXCUSED = 'excused'

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='attendance')
    date       = models.DateField()
    status     = models.CharField(max_length=10, choices=[(PRESENT,'Present'),(ABSENT,'Absent'),(EXCUSED,'Excused')], default=PRESENT)
    marked_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    marked_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ['enrollment', 'date']

"""
Add to fugusau/apps/courses/models.py

Prerequisite model:
"""
class CoursePrerequisite(models.Model):
    """course requires prerequisite to be passed before enrollment."""
    course       = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='prerequisites')
    prerequisite = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='required_for')
    min_grade    = models.CharField(max_length=3, default='D', help_text='Minimum grade to satisfy prerequisite')

    class Meta:
        db_table = 'course_prerequisites'
        unique_together = ['course', 'prerequisite']

    def __str__(self):
        return f'{self.prerequisite.code} → {self.course.code} (min {self.min_grade})'


"""
Add to EnrollCourseView.post() in courses/views.py, before creating the Enrollment:
"""
def check_prerequisites(student_profile, course) -> list[str]:
    """Returns list of unmet prerequisite messages, empty if all met."""
    # CoursePrerequisite is defined in this same module
    from fugusau.apps.exams.models import Result

    GRADE_ORDER = ['A', 'B+', 'B', 'C+', 'C', 'D', 'F']
    failures = []

    for prereq in CoursePrerequisite.objects.filter(course=course).select_related('prerequisite'):
        passed = Result.objects.filter(
            enrollment__student=student_profile,
            enrollment__course=prereq.prerequisite,
            is_senate_approved=True,
        ).first()

        if not passed:
            failures.append(
                f"You must complete {prereq.prerequisite.code} ({prereq.prerequisite.title}) before enrolling in {course.code}."
            )
        elif GRADE_ORDER.index(passed.grade) > GRADE_ORDER.index(prereq.min_grade):
            failures.append(
                f"You need at least grade {prereq.min_grade} in {prereq.prerequisite.code} to enroll in {course.code} (you got {passed.grade})."
            )

    return failures

# In EnrollCourseView.post(), after fetching the course:
# failures = check_prerequisites(student_profile, course)
# if failures:
#     return Response({'error': 'Prerequisite requirements not met', 'details': failures}, status=400)
