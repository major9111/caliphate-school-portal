import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import ContactPage from '@/pages/ContactPage'
import AIPage from '@/pages/AIPage'
import SectionPage from '@/pages/SectionPage'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/:slug" element={<SectionPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
