// Central nav/section config. Each top-level section renders through the
// generic SectionPage unless it has a dedicated page (Home, About).
// `items[].href` -> a real, working link (e.g. into the existing student
// portal). Items without `href` render as "Content coming soon" cards
// rather than fabricated copy — see PORTAL_URL below.

export const PORTAL_URL = 'https://fugusau-portal.vercel.app'

export interface SectionItem {
  label: string
  description?: string
  href?: string       // present => real working link; absent => "coming soon"
  external?: boolean
}

export interface Section {
  slug: string
  label: string
  description: string
  items: SectionItem[]
}

export const SECTIONS: Section[] = [
  {
    slug: 'about',
    label: 'About',
    description: 'History, vision, mission, leadership and everything that makes FUGUSAU what it is.',
    items: [
      { label: 'History' },
      { label: 'Vision' },
      { label: 'Mission' },
      { label: 'Core Values' },
      { label: 'University Motto' },
      { label: 'University Anthem' },
      { label: 'Organizational Structure' },
      { label: 'Campus Map' },
      { label: 'Principal Officers' },
      { label: 'University Leadership' },
    ],
  },
  {
    slug: 'administration',
    label: 'Administration',
    description: 'The Council, Senate and Management Team that govern the University.',
    items: [
      { label: 'Visitor' },
      { label: 'Chancellor' },
      { label: 'Pro-Chancellor' },
      { label: 'Governing Council' },
      { label: 'Vice Chancellor' },
      { label: 'Deputy Vice Chancellors' },
      { label: 'Registrar' },
      { label: 'Bursar' },
      { label: 'University Librarian' },
      { label: 'Senate' },
      { label: 'Management Team' },
    ],
  },
  {
    slug: 'academics',
    label: 'Academics',
    description: 'Faculties, departments and programmes across all levels of study.',
    items: [
      { label: 'Faculties' },
      { label: 'Departments' },
      { label: 'Undergraduate Programmes' },
      { label: 'Postgraduate Programmes' },
      { label: 'Diploma Programmes' },
      { label: 'Academic Calendar' },
      { label: 'Course Catalogue' },
      { label: 'Admission Requirements', href: '/admissions' },
    ],
  },
  {
    slug: 'admissions',
    label: 'Admissions',
    description: 'Everything you need to apply and join FUGUSAU.',
    items: [
      { label: 'Undergraduate Admission', href: `${PORTAL_URL}/admission`, external: true },
      { label: 'Direct Entry' },
      { label: 'Postgraduate Admission' },
      { label: 'International Admission' },
      { label: 'Admission Requirements' },
      { label: 'Screening', href: `${PORTAL_URL}/admission`, external: true },
      { label: 'Acceptance Fee' },
      { label: 'Admission Status', href: `${PORTAL_URL}/admission?check=1`, external: true },
      { label: 'Apply Now', href: `${PORTAL_URL}/admission`, external: true },
    ],
  },
  {
    slug: 'students',
    label: 'Students',
    description: 'Resources and services for current students.',
    items: [
      { label: 'Student Portal', href: `${PORTAL_URL}/login`, external: true },
      { label: 'Registration Guide' },
      { label: 'School Fees', href: `${PORTAL_URL}/login`, external: true },
      { label: 'Hostel' },
      { label: 'Scholarships' },
      { label: 'Student Handbook' },
      { label: 'Timetable', href: `${PORTAL_URL}/login`, external: true },
      { label: 'Examination Information' },
      { label: 'Results', href: `${PORTAL_URL}/login`, external: true },
    ],
  },
  {
    slug: 'services',
    label: 'Online Services',
    description: 'Digital services for students, staff and the public.',
    items: [
      { label: 'Student Portal', href: `${PORTAL_URL}/login`, external: true },
      { label: 'Staff Portal', href: `${PORTAL_URL}/login`, external: true },
      { label: 'E-Learning' },
      { label: 'E-Transcript' },
      { label: 'Transcript Tracking' },
      { label: 'Payment Verification' },
      { label: 'Clearance' },
      { label: 'Digital Certificates' },
    ],
  },
  {
    slug: 'research',
    label: 'Research',
    description: 'Centres, publications and innovation at FUGUSAU.',
    items: [
      { label: 'Research Centres' },
      { label: 'Publications' },
      { label: 'Innovation Hub' },
      { label: 'Grants' },
      { label: 'Conferences' },
      { label: 'Journals' },
    ],
  },
  {
    slug: 'library',
    label: 'Library',
    description: 'The University Library and its digital resources.',
    items: [
      { label: 'Digital Library' },
      { label: 'OPAC (Catalogue Search)' },
      { label: 'Institutional Repository' },
      { label: 'E-Resources' },
    ],
  },
  {
    slug: 'news',
    label: 'News & Events',
    description: 'What is happening at FUGUSAU.',
    items: [
      { label: 'News' },
      { label: 'Events' },
      { label: 'Gallery' },
      { label: 'Videos' },
      { label: 'Convocation' },
      { label: 'Matriculation' },
    ],
  },
  {
    slug: 'downloads',
    label: 'Downloads',
    description: 'Official documents, forms and policies.',
    items: [
      { label: 'Academic Calendar' },
      { label: 'Student Handbook' },
      { label: 'Admission Forms', href: `${PORTAL_URL}/admission`, external: true },
      { label: 'Senate Regulations' },
      { label: 'Policies' },
      { label: 'Prospectus' },
    ],
  },
]

export const NAV_LINKS = [
  { slug: 'about',          label: 'About' },
  { slug: 'administration', label: 'Administration' },
  { slug: 'academics',      label: 'Academics' },
  { slug: 'admissions',     label: 'Admissions' },
  { slug: 'students',       label: 'Students' },
  { slug: 'services',       label: 'Services' },
  { slug: 'research',       label: 'Research' },
  { slug: 'library',        label: 'Library' },
  { slug: 'news',           label: 'News' },
  { slug: 'downloads',      label: 'Downloads' },
  { slug: 'contact',        label: 'Contact' },
]
