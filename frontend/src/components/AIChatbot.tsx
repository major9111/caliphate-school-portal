/**
 * FUGUSAU — Floating AI Chatbot Widget
 * Powered by Claude (claude-3-haiku) via FUGUSAU backend
 * Features: Conversation history, streaming, suggested questions, markdown-lite rendering
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'

function IconBot(p: any) {
  return <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="15" x2="8" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/></svg>
}
function IconSend(p: any) {
  return <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
}
function IconClose(p: any) {
  return <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function IconTrash(p: any) {
  return <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={p.className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
}
function IconMinus(p: any) {
  return <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={p.className}><line x1="5" y1="12" x2="19" y2="12"/></svg>
}

const SUGGESTED = [
  'How do I check my results?',
  'How do I pay my school fees?',
  'How do I apply for hostel?',
  'What is my CGPA?',
  'How do I register for courses?',
  'When is the exam period?',
]

// Very simple markdown-lite renderer
function renderText(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<p class="font-bold text-white mt-2 mb-1">$1</p>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/\n/g, '<br/>')
}

interface Msg { role: 'user'|'assistant'; content: string; id: string }

export default function AIChatbot() {
  const { user } = useAuthStore()
  const [open,     setOpen]     = useState(false)
  const [mini,     setMini]     = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [dots,     setDots]     = useState(0)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!loading) return
    const t = setInterval(() => setDots(d => (d + 1) % 4), 400)
    return () => clearInterval(t)
  }, [loading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Add welcome message on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role:    'assistant',
        content: `Hello ${user?.name?.split(' ')[0] || 'there'}! I am FUGUSAU AI Assistant. I can help you with:\n\n- **Results & CGPA** — check your academic performance\n- **Fees & Payments** — payment guidance and balance\n- **Course Registration** — how to register for courses\n- **Hostel & Library** — accommodation and eBooks\n- **General Academic Support** — study tips and university policies\n\nHow can I help you today?`,
        id:      'welcome',
      }])
    }
  }, [open])

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Msg = { role:'user', content, id: `u-${Date.now()}` }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)
    setError('')

    // Reset textarea height
    if (inputRef.current) { inputRef.current.style.height = 'auto' }

    try {
      const res = await api.post('/ai/chat/', {
        messages: history.map(m => ({ role: m.role, content: m.content })),
      })
      const reply = res.data?.reply || 'Sorry, I could not generate a response.'
      setMessages(prev => [...prev, { role:'assistant', content: reply, id: `a-${Date.now()}` }])
    } catch (e: any) {
      const msg = e?.response?.data?.error || 'Something went wrong. Please try again.'
      setError(msg)
      // Remove the user message if it failed
      setMessages(prev => prev.filter(m => m.id !== userMsg.id))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, messages, loading])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
  }

  const clearChat = () => {
    setMessages([])
    setError('')
    // Re-trigger welcome message
    setTimeout(() => {
      setMessages([{
        role:    'assistant',
        content: 'Chat cleared. How can I help you?',
        id:      `w-${Date.now()}`,
      }])
    }, 100)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #006B3F, #00A85A)', boxShadow: '0 8px 32px rgba(0,107,63,0.5)' }}
        title="FUGUSAU AI Assistant">
        <IconBot size={24} className="text-white"/>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-dark-2 animate-pulse"/>
      </button>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col glass-strong border border-white/[0.12] rounded-2xl shadow-2xl transition-all duration-300 ${
      mini ? 'h-14 w-80' : 'w-96 h-[580px]'
    }`}
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.08] flex-shrink-0 rounded-t-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(0,107,63,0.3), rgba(0,40,25,0.4))' }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#006B3F,#00A85A)' }}>
          <IconBot size={16} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">FUGUSAU AI</p>
          {!mini && <p className="text-[10px] text-white/40">Academic Assistant · Powered by Claude</p>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat}
            className="w-7 h-7 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            title="Clear chat">
            <IconTrash size={12}/>
          </button>
          <button onClick={() => setMini(!mini)}
            className="w-7 h-7 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
            title={mini ? 'Expand' : 'Minimize'}>
            <IconMinus size={14}/>
          </button>
          <button onClick={() => setOpen(false)}
            className="w-7 h-7 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors">
            <IconClose size={14}/>
          </button>
        </div>
      </div>

      {!mini && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* Suggested questions (shown when only welcome message) */}
            {messages.length <= 1 && (
              <div className="space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Suggested</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="glass border border-white/[0.08] rounded-xl px-3 py-1.5 text-[11px] text-white/60 hover:text-white hover:border-primary/30 transition-all text-left">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background:'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                    <IconBot size={12} className="text-white"/>
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-tr-sm text-white'
                    : 'glass border border-white/[0.07] text-white/90 rounded-tl-sm'
                }`}
                  style={msg.role === 'user' ? { background:'linear-gradient(135deg,#006B3F,#00A85A)' } : {}}>
                  <div dangerouslySetInnerHTML={{ __html: renderText(msg.content) }}
                    className="[&_li]:mt-0.5 [&_strong]:text-white [&_em]:text-white/70"/>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background:'linear-gradient(135deg,#006B3F,#00A85A)' }}>
                  <IconBot size={12} className="text-white"/>
                </div>
                <div className="glass border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    <span className="text-[11px] text-white/40">Thinking</span>
                    <div className="flex gap-0.5 ml-1">
                      {[0,1,2].map(i => (
                        <div key={i}
                          className={`w-1 h-1 rounded-full bg-primary/60 transition-opacity ${dots > i ? 'opacity-100' : 'opacity-20'}`}/>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="glass border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
                {error}
                <button onClick={() => setError('')} className="ml-2 underline text-red-400/60 hover:text-red-400">Dismiss</button>
              </div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Input bar */}
          <div className="px-3 py-3 border-t border-white/[0.06] flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKey}
                placeholder="Ask me anything about FUGUSAU…"
                disabled={loading}
                rows={1}
                className="flex-1 glass-input rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 resize-none disabled:opacity-40 leading-relaxed"
                style={{ minHeight:40, maxHeight:100 }}/>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0 transition-all hover:scale-105 active:scale-95">
                <IconSend size={14}/>
              </button>
            </div>
            <p className="text-[9px] text-white/15 mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      )}
    </div>
  )
}
