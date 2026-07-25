"""
FUGUSAU Portal — Demo Data Seeder
Usage: python manage.py seed_demo

Creates demo accounts for all roles:
  - 1 Admin      (already exists — skipped if found)
  - 3 Lecturers  (Dr. Abubakar, Prof. Fatima, Dr. Ibrahim)
  - 5 Students   (100L–400L, various departments)
  - 2 Parents    (linked to demo students)

Also seeds:
  - 2 Faculties  (Science & Technology, Arts & Social Sciences)
  - 4 Departments (CSC, MTH, ENG, BUS)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import date


class Command(BaseCommand):
    help = 'Seed demo accounts for all roles (student, lecturer, admin, parent)'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
            help='Delete all existing demo accounts before seeding')

    def handle(self, *args, **options):
        from django.contrib.auth import get_user_model
        from fugusau.apps.students.models import (
            Faculty, Department, StudentProfile, LecturerProfile, ParentProfile
        )
        from fugusau.apps.users.models import ParentStudentLink

        User = get_user_model()

        if options['reset']:
            demo_emails = [
                'admin@fugusau.edu.ng',
                'abubakar.suleiman@fug.edu.ng',
                'fatima.ibrahim@fug.edu.ng',
                'ibrahim.musa@fug.edu.ng',
                'sadiq.abdullahi@student.fug.edu.ng',
                'aisha.umar@student.fug.edu.ng',
                'yusuf.bello@student.fug.edu.ng',
                'zainab.garba@student.fug.edu.ng',
                'usman.danladi@student.fug.edu.ng',
                'maryam.parent@gmail.com',
                'alhaji.parent@gmail.com',
            ]
            deleted, _ = User.objects.filter(email__in=demo_emails).delete()
            self.stdout.write(self.style.WARNING(f'  Deleted {deleted} existing demo users'))

        with transaction.atomic():

            # ── Faculties ──────────────────────────────────────────────
            self.stdout.write('\nSeeding Faculties & Departments...')

            sci_tech, _ = Faculty.objects.get_or_create(
                code='FST',
                defaults={'name': 'Faculty of Science and Technology', 'numeric_id': '03'}
            )
            if not sci_tech.numeric_id:
                sci_tech.numeric_id = '03'
                sci_tech.save(update_fields=['numeric_id'])

            arts, _ = Faculty.objects.get_or_create(
                code='FAS',
                defaults={'name': 'Faculty of Arts and Social Sciences', 'numeric_id': '05'}
            )
            if not arts.numeric_id:
                arts.numeric_id = '05'
                arts.save(update_fields=['numeric_id'])

            # ── Departments ────────────────────────────────────────────
            csc, _ = Department.objects.get_or_create(
                code='CSC',
                defaults={'name': 'Computer Science', 'faculty': sci_tech, 'numeric_id': '08'}
            )
            if not csc.numeric_id:
                csc.numeric_id = '08'
                csc.save(update_fields=['numeric_id'])

            mth, _ = Department.objects.get_or_create(
                code='MTH',
                defaults={'name': 'Mathematics', 'faculty': sci_tech, 'numeric_id': '09'}
            )
            if not mth.numeric_id:
                mth.numeric_id = '09'
                mth.save(update_fields=['numeric_id'])

            eng, _ = Department.objects.get_or_create(
                code='ENG',
                defaults={'name': 'English Language', 'faculty': arts, 'numeric_id': '02'}
            )
            if not eng.numeric_id:
                eng.numeric_id = '02'
                eng.save(update_fields=['numeric_id'])

            bus, _ = Department.objects.get_or_create(
                code='BUS',
                defaults={'name': 'Business Administration', 'faculty': arts, 'numeric_id': '04'}
            )
            if not bus.numeric_id:
                bus.numeric_id = '04'
                bus.save(update_fields=['numeric_id'])

            self.stdout.write(self.style.SUCCESS(
                f'  ✓ Faculties: {sci_tech.name}, {arts.name}\n'
                f'  ✓ Departments: CSC, MTH, ENG, BUS'
            ))

            # ── Admin ──────────────────────────────────────────────────
            self.stdout.write('\nSeeding Admin...')
            admin, created = User.objects.get_or_create(
                email='admin@fugusau.edu.ng',
                defaults={
                    'first_name': 'Admin',
                    'last_name':  'User',
                    'role':       User.ADMIN,
                    'is_staff':   True,
                    'is_verified': True,
                    'gender':     'M',
                }
            )
            if created:
                admin.set_password('Admin@1234')
                admin.save()
                self.stdout.write(self.style.SUCCESS('  ✓ Created admin@fugusau.edu.ng / Admin@1234'))
            else:
                self.stdout.write(self.style.WARNING('  [SKIP] Admin already exists'))

            # ── Lecturers ──────────────────────────────────────────────
            self.stdout.write('\nSeeding Lecturers...')

            lecturers_data = [
                {
                    'email':      'abubakar.suleiman@fug.edu.ng',
                    'first_name': 'Abubakar',
                    'last_name':  'Suleiman',
                    'gender':     'M',
                    'phone':      '08012345001',
                    'staff_id':   'FUG/STAFF/0001',
                    'title':      'Dr.',
                    'qualification': 'Ph.D Computer Science, ABU Zaria',
                    'specialization_area': 'Artificial Intelligence & Machine Learning',
                    'department': csc,
                    'password':   'Lecturer@1234',
                },
                {
                    'email':      'fatima.ibrahim@fug.edu.ng',
                    'first_name': 'Fatima',
                    'last_name':  'Ibrahim',
                    'gender':     'F',
                    'phone':      '08012345002',
                    'staff_id':   'FUG/STAFF/0002',
                    'title':      'Prof.',
                    'qualification': 'Ph.D Mathematics, University of Lagos',
                    'specialization_area': 'Applied Mathematics & Statistics',
                    'department': mth,
                    'password':   'Lecturer@1234',
                },
                {
                    'email':      'ibrahim.musa@fug.edu.ng',
                    'first_name': 'Ibrahim',
                    'last_name':  'Musa',
                    'gender':     'M',
                    'phone':      '08012345003',
                    'staff_id':   'FUG/STAFF/0003',
                    'title':      'Dr.',
                    'qualification': 'Ph.D Business Admin, University of Abuja',
                    'specialization_area': 'Strategic Management & Entrepreneurship',
                    'department': bus,
                    'password':   'Lecturer@1234',
                },
            ]

            for ld in lecturers_data:
                dept       = ld.pop('department')
                staff_id   = ld.pop('staff_id')
                title      = ld.pop('title')
                qual       = ld.pop('qualification')
                spec       = ld.pop('specialization_area')
                password   = ld.pop('password')

                user, created = User.objects.get_or_create(
                    email=ld['email'],
                    defaults={**ld, 'role': User.LECTURER, 'is_verified': True}
                )
                if created:
                    user.set_password(password)
                    user.save()

                LecturerProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'staff_id':           staff_id,
                        'department':         dept,
                        'title':              title,
                        'qualification':      qual,
                        'specialization_area': spec,
                    }
                )
                status = 'Created' if created else 'Already exists'
                self.stdout.write(
                    self.style.SUCCESS(f'  {status}: {title} {user.get_full_name()} — {ld["email"]} / {password}')
                    if created else
                    self.style.WARNING(f'  {status}: {ld["email"]}')
                )

            # ── Students ───────────────────────────────────────────────
            self.stdout.write('\nSeeding Students...')

            students_data = [
                {
                    'email':      'sadiq.abdullahi@student.fug.edu.ng',
                    'first_name': 'Sadiq',
                    'last_name':  'Abdullahi',
                    'gender':     'M',
                    'phone':      '08034303594',
                    'matric':     '22/1/03/08/001',
                    'department': csc,
                    'level':      300,
                    'cgpa':       '3.85',
                    'state':      'Zamfara',
                    'lga':        'Gusau',
                    'blood_group':'O+',
                    'genotype':   'AA',
                    'next_of_kin': 'Abdullahi Musa',
                    'next_of_kin_phone': '08011111111',
                    'session':    '2022/2023',
                    'year':       2022,
                    'jamb_score': 285,
                    'password':   'Student@1234',
                },
                {
                    'email':      'aisha.umar@student.fug.edu.ng',
                    'first_name': 'Aisha',
                    'last_name':  'Umar',
                    'gender':     'F',
                    'phone':      '08022222222',
                    'matric':     '23/1/03/09/001',
                    'department': mth,
                    'level':      200,
                    'cgpa':       '4.20',
                    'state':      'Katsina',
                    'lga':        'Katsina',
                    'blood_group':'A+',
                    'genotype':   'AS',
                    'next_of_kin': 'Umar Bello',
                    'next_of_kin_phone': '08022000000',
                    'session':    '2023/2024',
                    'year':       2023,
                    'jamb_score': 301,
                    'password':   'Student@1234',
                },
                {
                    'email':      'yusuf.bello@student.fug.edu.ng',
                    'first_name': 'Yusuf',
                    'last_name':  'Bello',
                    'gender':     'M',
                    'phone':      '08033333333',
                    'matric':     '21/1/05/02/001',
                    'department': eng,
                    'level':      400,
                    'cgpa':       '3.50',
                    'state':      'Kebbi',
                    'lga':        'Birnin Kebbi',
                    'blood_group':'B+',
                    'genotype':   'AA',
                    'next_of_kin': 'Bello Yusuf',
                    'next_of_kin_phone': '08033000000',
                    'session':    '2021/2022',
                    'year':       2021,
                    'jamb_score': 260,
                    'password':   'Student@1234',
                },
                {
                    'email':      'zainab.garba@student.fug.edu.ng',
                    'first_name': 'Zainab',
                    'last_name':  'Garba',
                    'gender':     'F',
                    'phone':      '08044444444',
                    'matric':     '24/1/05/04/001',
                    'department': bus,
                    'level':      100,
                    'cgpa':       '0.00',
                    'state':      'Sokoto',
                    'lga':        'Sokoto North',
                    'blood_group':'AB+',
                    'genotype':   'AA',
                    'next_of_kin': 'Garba Mohammed',
                    'next_of_kin_phone': '08044000000',
                    'session':    '2024/2025',
                    'year':       2024,
                    'jamb_score': 245,
                    'password':   'Student@1234',
                },
                {
                    'email':      'usman.danladi@student.fug.edu.ng',
                    'first_name': 'Usman',
                    'last_name':  'Danladi',
                    'gender':     'M',
                    'phone':      '08055555555',
                    'matric':     '23/2/03/08/002',
                    'department': csc,
                    'level':      200,
                    'cgpa':       '2.95',
                    'state':      'Niger',
                    'lga':        'Minna',
                    'blood_group':'O-',
                    'genotype':   'SS',
                    'next_of_kin': 'Danladi Hassan',
                    'next_of_kin_phone': '08055000000',
                    'session':    '2023/2024',
                    'year':       2023,
                    'jamb_score': 251,
                    'password':   'Student@1234',
                },
            ]

            created_students = []
            for sd in students_data:
                dept   = sd.pop('department')
                matric = sd.pop('matric')
                level  = sd.pop('level')
                cgpa   = sd.pop('cgpa')
                state  = sd.pop('state')
                lga    = sd.pop('lga')
                blood  = sd.pop('blood_group')
                geno   = sd.pop('genotype')
                nok    = sd.pop('next_of_kin')
                nokp   = sd.pop('next_of_kin_phone')
                sess   = sd.pop('session')
                year   = sd.pop('year')
                jamb   = sd.pop('jamb_score')
                pw     = sd.pop('password')

                user, created = User.objects.get_or_create(
                    email=sd['email'],
                    defaults={**sd, 'role': User.STUDENT, 'is_verified': True}
                )
                if created:
                    user.set_password(pw)
                    user.save()

                profile, _ = StudentProfile.objects.get_or_create(
                    user=user,
                    defaults={
                        'matric_number':    matric,
                        'department':       dept,
                        'level':            level,
                        'cgpa':             cgpa,
                        'admission_year':   year,
                        'admission_session': sess,
                        'status':           'active',
                        'state_of_origin':  state,
                        'lga_of_origin':    lga,
                        'blood_group':      blood,
                        'genotype':         geno,
                        'next_of_kin':      nok,
                        'next_of_kin_phone': nokp,
                        'jamb_score':       jamb,
                    }
                )
                created_students.append((user, profile))
                status = 'Created' if created else 'Already exists'
                self.stdout.write(
                    self.style.SUCCESS(f'  {status}: {user.get_full_name()} ({matric}) — {sd["email"]} / {pw}')
                    if created else
                    self.style.WARNING(f'  {status}: {sd["email"]}')
                )

            # ── Parents ────────────────────────────────────────────────
            self.stdout.write('\nSeeding Parents...')

            parents_data = [
                {
                    'email':      'maryam.parent@gmail.com',
                    'first_name': 'Maryam',
                    'last_name':  'Abdullahi',
                    'gender':     'F',
                    'phone':      '08066666666',
                    'occupation': 'Civil Servant',
                    'relationship': 'Mother',
                    'ward_email': 'sadiq.abdullahi@student.fug.edu.ng',
                    'password':   'Parent@1234',
                },
                {
                    'email':      'alhaji.parent@gmail.com',
                    'first_name': 'Alhaji',
                    'last_name':  'Umar',
                    'gender':     'M',
                    'phone':      '08077777777',
                    'occupation': 'Businessman',
                    'relationship': 'Father',
                    'ward_email': 'aisha.umar@student.fug.edu.ng',
                    'password':   'Parent@1234',
                },
            ]

            for pd in parents_data:
                ward_email   = pd.pop('ward_email')
                occupation   = pd.pop('occupation')
                relationship = pd.pop('relationship')
                pw           = pd.pop('password')

                user, created = User.objects.get_or_create(
                    email=pd['email'],
                    defaults={**pd, 'role': User.PARENT, 'is_verified': True}
                )
                if created:
                    user.set_password(pw)
                    user.save()

                parent_profile, _ = ParentProfile.objects.get_or_create(
                    user=user,
                    defaults={'occupation': occupation, 'relationship': relationship}
                )

                # Link to ward
                try:
                    ward_user    = User.objects.get(email=ward_email)
                    ward_profile = StudentProfile.objects.get(user=ward_user)
                    parent_profile.wards.add(ward_profile)

                    ParentStudentLink.objects.get_or_create(
                        parent=user,
                        student=ward_user,
                        defaults={'verified': True}
                    )
                    ward_name = ward_user.get_full_name()
                except (User.DoesNotExist, StudentProfile.DoesNotExist):
                    ward_name = ward_email

                status = 'Created' if created else 'Already exists'
                self.stdout.write(
                    self.style.SUCCESS(f'  {status}: {user.get_full_name()} (ward: {ward_name}) — {pd["email"]} / {pw}')
                    if created else
                    self.style.WARNING(f'  {status}: {pd["email"]}')
                )

        # ── Summary ────────────────────────────────────────────────────
        self.stdout.write('\n' + '═' * 60)
        self.stdout.write(self.style.SUCCESS('FUGUSAU Demo Accounts Ready!\n'))
        self.stdout.write('  ROLE        EMAIL                                   PASSWORD')
        self.stdout.write('  ─────────────────────────────────────────────────────────────')
        accounts = [
            ('Admin',    'admin@fugusau.edu.ng',                      'Admin@1234'),
            ('Lecturer', 'abubakar.suleiman@fug.edu.ng',              'Lecturer@1234'),
            ('Lecturer', 'fatima.ibrahim@fug.edu.ng',                  'Lecturer@1234'),
            ('Lecturer', 'ibrahim.musa@fug.edu.ng',                    'Lecturer@1234'),
            ('Student',  'sadiq.abdullahi@student.fug.edu.ng',        'Student@1234'),
            ('Student',  'aisha.umar@student.fug.edu.ng',             'Student@1234'),
            ('Student',  'yusuf.bello@student.fug.edu.ng',            'Student@1234'),
            ('Student',  'zainab.garba@student.fug.edu.ng',           'Student@1234'),
            ('Student',  'usman.danladi@student.fug.edu.ng',          'Student@1234'),
            ('Parent',   'maryam.parent@gmail.com',                   'Parent@1234'),
            ('Parent',   'alhaji.parent@gmail.com',                   'Parent@1234'),
        ]
        for role, email, pw in accounts:
            self.stdout.write(f'  {role:<10} {email:<43} {pw}')
        self.stdout.write('═' * 60 + '\n')

        # ── Default Chat Rooms ─────────────────────────────────────
        self.stdout.write('\nSeeding Default Chat Rooms...')
        from fugusau.apps.chat.models import ChatRoom

        all_users = list(User.objects.filter(is_active=True))

        rooms_to_create = [
            {
                'name':         'general',
                'display_name': 'General',
                'room_type':    'general',
                'members':      all_users,
            },
            {
                'name':         'csc-300-students',
                'display_name': 'CSC 300 Students',
                'room_type':    'course',
                'members':      [
                    u for u in all_users
                    if u.role in ('student', 'lecturer') or u.role == 'admin'
                ],
            },
            {
                'name':         'admin-support',
                'display_name': 'Admin Support',
                'room_type':    'support',
                'members':      all_users,
            },
            {
                'name':         'staff-room',
                'display_name': 'Staff Room',
                'room_type':    'general',
                'members':      [u for u in all_users if u.role in ('admin', 'lecturer')],
            },
        ]

        for rd in rooms_to_create:
            members = rd.pop('members')
            room, created = ChatRoom.objects.get_or_create(
                name=rd['name'],
                defaults={
                    'display_name': rd['display_name'],
                    'room_type':    rd['room_type'],
                    'created_by':   User.objects.filter(role='admin').first(),
                }
            )
            for m in members:
                room.members.add(m)

            status = 'Created' if created else 'Already exists'
            self.stdout.write(
                self.style.SUCCESS(f'  {status}: #{rd["name"]} ({len(members)} members)')
                if created else
                self.style.WARNING(f'  {status}: #{rd["name"]}')
            )

        self.stdout.write(self.style.SUCCESS('\nAll done! Chat rooms ready to use.\n'))
