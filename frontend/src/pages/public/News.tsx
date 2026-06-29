export function PublicNews() {
  const news = [
    { title: 'New Academic Session Begins', date: 'September 5, 2026', excerpt: 'We welcome all students back for the 2026/2027 session.' },
    { title: 'Inter-House Sports Competition', date: 'October 15, 2026', excerpt: 'Annual sports competition showcasing athletic talents.' },
    { title: 'Quranic Recitation Competition', date: 'November 20, 2026', excerpt: 'Students demonstrate their memorization skills.' },
  ]

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">News & Events</h1>
          <p className="text-lg text-secondary-600 mb-12">Stay updated with the latest happenings at Caliphate Schools.</p>
          <div className="space-y-6">
            {news.map((item, i) => (
              <article key={i} className="bg-white rounded-2xl p-6 shadow-soft border border-secondary-200">
                <p className="text-sm text-primary-600 font-medium mb-2">{item.date}</p>
                <h2 className="text-2xl font-bold mb-3">{item.title}</h2>
                <p className="text-secondary-600">{item.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicNews
