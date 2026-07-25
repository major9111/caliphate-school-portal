export default function VCWelcome() {
  return (
    <section className="container-page py-20">
      <div className="glass-card rounded-3xl p-8 md:p-14 grid md:grid-cols-5 gap-10 items-center">
        <div className="md:col-span-2 flex justify-center">
          <div className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white/70">
            <i className="bi bi-person-fill text-7xl" />
          </div>
        </div>
        <div className="md:col-span-3">
          <p className="section-label mb-3">A Message from the Vice Chancellor</p>
          <blockquote className="text-lg sm:text-xl font-medium leading-relaxed italic text-muted mb-6">
            "[Add the Vice Chancellor's welcome message here — a short, warm introduction to the University's
            mission and what makes FUGUSAU the right choice for prospective and current students.]"
          </blockquote>
          <div>
            <p className="font-bold">[Vice Chancellor's Name]</p>
            <p className="text-sm text-muted">Vice Chancellor, Federal University Gusau</p>
          </div>
        </div>
      </div>
    </section>
  )
}
