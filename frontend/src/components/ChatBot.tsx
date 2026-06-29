import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { aiChatApi, type ChatMessage } from '@/lib/api'

interface Message {
  role: 'bot' | 'user'
  text: string
  timestamp: Date
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: 'Assalamu Alaikum! Welcome to Caliphate International Schools. I am Iqra, your AI school assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return
    const userMessage: Message = { role: 'user', text: input.trim(), timestamp: new Date() }
    setMessages((prev) => [...prev, userMessage])
    const currentInput = input.trim()
    setInput('')
    setIsTyping(true)

    try {
      const history: ChatMessage[] = messages.map((msg) => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        text: msg.text,
      }))
      const response = await aiChatApi.sendMessage(currentInput, history, sessionId)
      const botMessage: Message = { role: 'bot', text: response.response, timestamp: new Date() }
      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'bot',
        text: 'I apologize, but I am having trouble connecting. Please call +234 800 000 0000.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9998] h-14 w-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-2xl hover:shadow-primary-500/50 transition-all hover:scale-110 flex items-center justify-center"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9998] w-[calc(100vw-3rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-secondary-200 overflow-hidden flex flex-col max-h-[600px]">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center relative">
                <Bot className="h-6 w-6" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Iqra</h3>
                  <Sparkles className="h-3 w-3 text-yellow-300" />
                </div>
                <p className="text-xs text-blue-100">AI School Assistant</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-secondary-50 to-white min-h-[300px]">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-primary-100 text-primary-700' : 'bg-gradient-to-br from-primary-500 to-primary-700 text-white'
                    }`}>
                      {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-br-sm'
                        : 'bg-white text-secondary-900 border border-secondary-200 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-white border border-secondary-200 rounded-2xl p-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-4 bg-white border-t border-secondary-200">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Ask Iqra anything..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button onClick={handleSend} size="icon" disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
