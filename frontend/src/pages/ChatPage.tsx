/**
 * FUGUSAU Portal — Chat (Full Featured)
 * Edit · Delete · Reply · React · Pin · @Mention · Search · Pinned panel
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatAPI } from '@/services/api'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { IconSearch, IconPlus, IconX, IconCheck, IconEdit, IconDownload } from '@/components/icons'
import toast from 'react-hot-toast'

// ── Icons ────────────────────────────────────────────────────────────────────
const I = (d: string, size=18, cls='') => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={cls}>
    <path d={d}/>
  </svg>
)
const IconMsg    = ({size=18,className=''}) => I('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', size, className)
const IconSend   = ({size=18,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const IconPin    = ({size=14,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
const IconReply  = ({size=14,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
const IconTrash  = ({size=14,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
const IconMore   = ({size=16,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
const IconAt     = ({size=16,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
const IconGroup  = ({size=16,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconMic    = ({size=16,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
const IconFile   = ({size=16,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
const IconGraduation = ({size=16,className=''}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>

const WS_BASE    = (() => { const p = window.location.protocol === 'https:' ? 'wss:' : 'ws:'; return `${p}//${window.location.host}` })()
const QUICK_EMOJIS = ['👍','❤️','😂','😮','😢','🙏','🔥','✅'] // kept for reaction toggle only

function Avatar({ name, size=36, online }: { name: string; size?: number; online?: boolean }) {
  const COLORS = ['#006B3F','#3B82F6','#8B5CF6','#D4A017','#EC4899','#F97316','#06B6D4']
  const color  = COLORS[(name||'?').charCodeAt(0) % COLORS.length]
  const init   = (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
  return (
    <div className="relative flex-shrink-0">
      <div className="rounded-xl flex items-center justify-center font-bold"
        style={{width:size,height:size,fontSize:size*.35,background:`${color}25`,border:`1.5px solid ${color}40`,color}}>
        {init}
      </div>
      {online !== undefined && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-dark-2 ${online?'bg-primary':'bg-white/20'}`}/>
      )}
    </div>
  )
}

function relTime(d: string) {
  if (!d) return ''
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff/60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}h`
  return new Date(d).toLocaleDateString('en-NG',{day:'2-digit',month:'short'})
}

function getRoomName(room: any, myId?: string) {
  if (room?.display_name) return room.display_name
  if (room?.room_type === 'direct') {
    const ids   = room?.member_ids   || []
    const names = room?.member_names || []
    const idx   = ids.findIndex((id: string) => id !== myId)
    return idx >= 0 ? names[idx] : room?.name
  }
  return room?.name || 'Room'
}

type WsSt = 'connecting'|'open'|'closed'

export default function ChatPage() {
  const { user }    = useAuthStore()
  const qc          = useQueryClient()
  const myId        = (user as any)?.id || ''

  // State
  const [activeRoom,    setActiveRoom]    = useState<any>(null)
  const [messages,      setMessages]      = useState<any[]>([])
  const [input,         setInput]         = useState('')
  const [wsStatus,      setWsStatus]      = useState<WsSt>('closed')
  const [roomSearch,    setRoomSearch]    = useState('')
  const [typingUsers,   setTypingUsers]   = useState<string[]>([])
  const [replyTo,       setReplyTo]       = useState<any>(null)
  const [editingMsg,    setEditingMsg]    = useState<any>(null)
  const [editInput,     setEditInput]     = useState('')
  const [msgMenu,       setMsgMenu]       = useState<string|null>(null)      // message id with open menu
  const [showReact,     setShowReact]     = useState<string|null>(null)      // message id emoji picker
  const [showPinned,    setShowPinned]    = useState(false)
  const [showSearch,    setShowSearch]    = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showNewChat,   setShowNewChat]   = useState(false)
  const [userSearch,    setUserSearch]    = useState('')
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [groupName,     setGroupName]     = useState('')
  const [chatMode,      setChatMode]      = useState<'dm'|'group'>('dm')
  const [mentionQuery,  setMentionQuery]  = useState('')
  const [showMentions,  setShowMentions]  = useState(false)
  const [tutorMode,     setTutorMode]     = useState(false)
  const [isRecording,   setIsRecording]   = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const wsRef        = useRef<WebSocket|null>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLTextAreaElement>(null)
  const typingTimer  = useRef<any>(null)
  const reconnTimer  = useRef<any>(null)

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: roomsData, isLoading: roomsLoading } = useQuery<any, any>({
    queryKey: ['chat-rooms'],
    queryFn:  chatAPI.getRooms,
    refetchInterval: 15000,
  })
  const { data: usersData } = useQuery<any, any>({
    queryKey: ['chat-users', userSearch],
    queryFn:  () => api.get('/auth/users/', { params: { search: userSearch||undefined } }),
    enabled:  showNewChat || showMentions,
  })
  const { data: pinnedData } = useQuery<any, any>({
    queryKey: ['pinned', activeRoom?.id],
    queryFn:  () => chatAPI.getPinned(activeRoom.id),
    enabled:  !!activeRoom && showPinned,
  })

  const rooms    = (roomsData?.data?.results ?? roomsData?.data ?? []) as any[]
  const allUsers = (usersData?.data?.results ?? usersData?.data ?? []) as any[]
  const otherUsers = allUsers.filter(u => u.id !== myId)
  const pinned   = (pinnedData?.data?.results ?? pinnedData?.data ?? []) as any[]

  // Mention suggestions from room members
  const memberSuggestions = activeRoom
    ? (activeRoom.member_names || []).filter((n: string) =>
        mentionQuery ? n.toLowerCase().startsWith(mentionQuery.toLowerCase()) : true
      ).slice(0, 6)
    : []

  const aiRoom = rooms.find(r => r.room_type === 'ai')

  const filteredRooms = rooms.filter(r =>
    r.room_type !== 'ai' && getRoomName(r, myId).toLowerCase().includes(roomSearch.toLowerCase())
  )

  function handleOpenAiChat() {
    if (aiRoom) {
      setActiveRoom(aiRoom)
    } else {
      createMutation.mutate({ room_type: 'ai', name: '' })
    }
  }

  // ── Create room ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: object) => chatAPI.createRoom(d),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ['chat-rooms'] })
      setShowNewChat(false); setSelectedUsers([]); setGroupName(''); setUserSearch('')
      setActiveRoom((res as any).data)
    },
    onError: () => toast.error('Failed to create room'),
  })

  function handleCreateRoom() {
    if (!selectedUsers.length) return
    if (chatMode === 'dm') {
      createMutation.mutate({ member_ids:[selectedUsers[0].id], room_type:'direct', name:'' })
    } else {
      if (!groupName.trim()) { toast.error('Enter a group name'); return }
      createMutation.mutate({ member_ids:selectedUsers.map(u=>u.id), room_type:'group', display_name:groupName, name:'' })
    }
  }

  // ── WS connect ───────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (!activeRoom) return
    wsRef.current?.close(); wsRef.current = null
    const token = (() => {
      try { const r = JSON.parse(localStorage.getItem('fugusau-auth')||'{}'); return r?.state?.accessToken || r?.accessToken || '' }
      catch { return '' }
    })()
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${activeRoom.name}/?token=${token}`)
    wsRef.current = ws; setWsStatus('connecting')

    ws.onopen  = () => { setWsStatus('open'); if (reconnTimer.current) clearTimeout(reconnTimer.current) }
    ws.onclose = () => { setWsStatus('closed'); reconnTimer.current = setTimeout(connectWS, 4000) }
    ws.onerror = () => setWsStatus('closed')

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        if (data.type === 'message_history') {
          setMessages(data.messages || [])
          return
        }
        if (data.type === 'message') {
          setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
          if (data.sender_id !== myId) ws.send(JSON.stringify({ type:'read_receipt', message_id:data.id }))
          qc.invalidateQueries({ queryKey: ['chat-rooms'] })
          return
        }
        if (data.type === 'message_edited') {
          setMessages(prev => prev.map(m => m.id === data.message_id
            ? { ...m, content: data.content, is_edited: true, edited_at: data.edited_at }
            : m))
          return
        }
        if (data.type === 'message_deleted') {
          setMessages(prev => prev.map(m => m.id === data.message_id
            ? { ...m, content: 'This message was deleted.', is_deleted: true }
            : m))
          return
        }
        if (data.type === 'message_reacted') {
          setMessages(prev => prev.map(m => m.id === data.message_id
            ? { ...m, reactions: data.reactions }
            : m))
          return
        }
        if (data.type === 'message_pinned') {
          setMessages(prev => prev.map(m => m.id === data.message_id
            ? { ...m, is_pinned: data.is_pinned }
            : m))
          if (data.is_pinned) toast(`${data.pinned_by} pinned a message`)
          qc.invalidateQueries({ queryKey: ['pinned', activeRoom?.id] })
          return
        }
        if (data.type === 'typing') {
          if (data.user_id !== myId) {
            setTypingUsers(prev =>
              data.is_typing
                ? prev.includes(data.user_name) ? prev : [...prev, data.user_name]
                : prev.filter(n => n !== data.user_name)
            )
            setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== data.user_name)), 3000)
          }
          return
        }
      } catch {}
    }
  }, [activeRoom?.id, activeRoom?.name, myId])

  useEffect(() => {
    if (!activeRoom) return
    setMessages([]); setReplyTo(null); setEditingMsg(null)
    connectWS()
    return () => { wsRef.current?.close(); wsRef.current = null; if (reconnTimer.current) clearTimeout(reconnTimer.current) }
  }, [activeRoom?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, typingUsers])

  // ── Send ─────────────────────────────────────────────────────────────────
  const sendMsg = useCallback(() => {
    const text = input.trim()
    if (!text || wsStatus !== 'open' || !wsRef.current) return
    wsRef.current.send(JSON.stringify({
      type:        'message',
      content:     text,
      message_type:'text',
      reply_to_id: replyTo?.id || null,
      tutor_mode:  tutorMode,
    }))
    setInput(''); setReplyTo(null); setShowMentions(false)
    const opt = { id:`opt-${Date.now()}`, content:text, sender_id:myId, sender_name:user?.name||'', sender_role:(user as any)?.role||'', timestamp:new Date().toISOString(), is_read:false, is_edited:false, is_pinned:false, is_deleted:false, reply_to:replyTo, reactions:{}, _opt:true }
    setMessages(prev => [...prev, opt])
    inputRef.current?.focus()
  }, [input, wsStatus, replyTo, myId, tutorMode])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || wsStatus !== 'open') return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const msgType = file.type.startsWith('image/') ? 'image' : 'file'
      wsRef.current?.send(JSON.stringify({
        type: 'message',
        content: '',
        message_type: msgType,
        file_data: base64,
        file_name: file.name,
        tutor_mode: tutorMode
      }))
      
      const opt = {
        id: `opt-${Date.now()}`,
        content: file.name,
        message_type: msgType,
        file_url: URL.createObjectURL(file),
        file_name: file.name,
        sender_id: myId,
        sender_name: user?.name || '',
        sender_role: (user as any)?.role || '',
        timestamp: new Date().toISOString(),
        is_read: false,
        is_edited: false,
        is_pinned: false,
        is_deleted: false,
        reactions: {},
        _opt: true
      }
      setMessages(prev => [...prev, opt])
    }
    reader.readAsDataURL(file)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          wsRef.current?.send(JSON.stringify({
            type: 'message',
            content: '',
            message_type: 'file',
            file_data: base64,
            file_name: 'voice_message.webm',
            tutor_mode: tutorMode
          }))
          
          const opt = {
            id: `opt-${Date.now()}`,
            content: 'Voice Message',
            message_type: 'file',
            file_url: URL.createObjectURL(blob),
            file_name: 'voice_message.webm',
            sender_id: myId,
            sender_name: user?.name || '',
            sender_role: (user as any)?.role || '',
            timestamp: new Date().toISOString(),
            is_read: false,
            is_edited: false,
            is_pinned: false,
            is_deleted: false,
            reactions: {},
            _opt: true
          }
          setMessages(prev => [...prev, opt])
        }
        reader.readAsDataURL(blob)
        stream.getTracks().forEach(track => track.stop())
      }
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (err) {
      toast.error('Could not access microphone')
    }
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setIsRecording(false)
  }

  const sendTyping = useCallback((t: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify({ type:'typing', is_typing:t }))
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setInput(val)
    sendTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => sendTyping(false), 1500)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
    // Detect @mention
    const atMatch = val.slice(0, e.target.selectionStart).match(/@(\w*)$/)
    if (atMatch) { setMentionQuery(atMatch[1]); setShowMentions(true) }
    else setShowMentions(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && replyTo) { setReplyTo(null); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg() }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  const submitEdit = () => {
    if (!editingMsg || !editInput.trim()) return
    wsRef.current?.send(JSON.stringify({ type:'edit', message_id:editingMsg.id, content:editInput.trim() }))
    setEditingMsg(null); setEditInput('')
  }

  // ── Reaction ─────────────────────────────────────────────────────────────
  const sendReact = (msgId: string, emoji: string) => {
    wsRef.current?.send(JSON.stringify({ type:'react', message_id:msgId, emoji }))
    setShowReact(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const sendDelete = (msgId: string) => {
    wsRef.current?.send(JSON.stringify({ type:'delete', message_id:msgId }))
    setMsgMenu(null)
  }

  // ── Pin ────────────────────────────────────────────────────────────────────
  const sendPin = (msgId: string) => {
    wsRef.current?.send(JSON.stringify({ type:'pin', message_id:msgId }))
    setMsgMenu(null)
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  const doSearch = async () => {
    if (!searchQuery.trim() || !activeRoom) return
    try {
      const res = await chatAPI.searchMessages(activeRoom.id, searchQuery)
      setSearchResults((res as any).data || [])
    } catch { setSearchResults([]) }
  }

  const activeRoomName = activeRoom ? getRoomName(activeRoom, myId) : ''

  // ── Role badge ─────────────────────────────────────────────────────────────
  function RoleBadge({ role }: { role: string }) {
    const m: Record<string, string> = {
      admin:'bg-red-500/20 text-red-300',
      lecturer:'bg-blue-500/20 text-blue-300',
      parent:'bg-amber-500/20 text-amber-300',
      student:'bg-white/10 text-white/30',
      ai:'bg-primary/20 text-primary-light border border-primary/20'
    }
    return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium capitalize ${m[role]||m.student}`}>{role}</span>
  }

  // ── Message bubble ─────────────────────────────────────────────────────────
  function MsgBubble({ msg, prev, next }: { msg: any; prev?: any; next?: any }) {
    const isOwn      = msg.sender_id === myId
    const showHead   = !prev || prev.sender_id !== msg.sender_id
    const showTime   = !next  || next.sender_id  !== msg.sender_id
    const isDeleted  = msg.is_deleted
    const hasMenu    = msgMenu === msg.id
    const hasReact   = showReact === msg.id

    return (
      <div className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : ''}`}>

        {/* Avatar */}
        <div className="flex-shrink-0 w-7 self-end">
          {showHead && !isOwn && <Avatar name={msg.sender_name||'U'} size={28}/>}
        </div>

        <div className={`flex flex-col max-w-[72%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender name */}
          {showHead && !isOwn && (
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-[11px] text-white/60 font-semibold">{msg.sender_name}</span>
              <RoleBadge role={msg.sender_role}/>
            </div>
          )}

          {/* Pin indicator */}
          {msg.is_pinned && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400/70 mb-1 px-1">
              <IconPin size={10}/> Pinned
            </div>
          )}

          {/* Reply preview */}
          {msg.reply_to && !isDeleted && (
            <div className={`glass border-l-2 border-primary/50 px-3 py-1.5 rounded-lg mb-1 max-w-full ${isOwn?'items-end':''}`}>
              <p className="text-[10px] text-primary-light font-semibold">{msg.reply_to.sender_name}</p>
              <p className="text-[11px] text-white/45 truncate">{msg.reply_to.content}</p>
            </div>
          )}

          {/* Bubble + action bar */}
          <div className={`flex items-end gap-1.5 ${isOwn ? 'flex-row-reverse' : ''}`}>

            {/* Action bar (on hover) */}
            {!isDeleted && (
              <div className={`flex items-center gap-0.5 transition-opacity ${hasMenu||hasReact?'opacity-100':'opacity-0 group-hover:opacity-100'} ${isOwn?'flex-row-reverse':''}`}>
                {/* React button */}
                <button onClick={(e) => { e.stopPropagation(); setShowReact(hasReact ? null : msg.id) }}
                  className="w-6 h-6 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white">
                  <svg width={11} height={11} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={1.5} strokeLinecap='round' strokeLinejoin='round'><circle cx='12' cy='12' r='10'/><path d='M8 14s1.5 2 4 2 4-2 4-2'/><line x1='9' y1='9' x2='9.01' y2='9'/><line x1='15' y1='9' x2='15.01' y2='9'/></svg>
                </button>
                {/* Reply */}
                <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); inputRef.current?.focus() }}
                  className="w-6 h-6 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white">
                  <IconReply size={11}/>
                </button>
                {/* More (edit/delete/pin) */}
                <button onClick={(e) => { e.stopPropagation(); setMsgMenu(hasMenu ? null : msg.id) }}
                  className="w-6 h-6 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white">
                  <IconMore size={11}/>
                </button>
              </div>
            )}

            <div className="relative">
              {/* Main bubble */}
              <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-full ${
                isDeleted
                  ? 'bg-white/[0.04] border border-white/[0.06] italic text-white/30'
                  : isOwn
                    ? 'rounded-tr-sm text-white'
                    : 'glass border border-white/[0.07] text-white/90 rounded-tl-sm'
              } ${msg._opt ? 'opacity-70' : ''}`}
                style={isOwn && !isDeleted ? { background:'linear-gradient(135deg,#006B3F,#00A85A)' } : {}}>
                {isDeleted
                  ? <span className="flex items-center gap-1.5"><IconTrash size={11}/> Message deleted</span>
                  : <>
                      {msg.message_type === 'image' && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-sm shadow-md">
                          <img src={msg.file_url || msg.content} alt={msg.file_name || 'Uploaded image'} className="w-full h-auto object-cover max-h-60" />
                        </div>
                      )}
                      {msg.message_type === 'file' && (
                        (msg.file_name?.endsWith('.webm') || msg.file_name?.endsWith('.wav') || msg.file_name?.endsWith('.mp3') || msg.file_name?.endsWith('.m4a')) ? (
                          <div className="my-1.5 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5 max-w-sm">
                            <IconMic size={20} className="text-primary-light"/>
                            <audio src={msg.file_url || msg.content} controls className="h-8 max-w-full outline-none" />
                          </div>
                        ) : (
                          <a href={msg.file_url || msg.content} target="_blank" rel="noopener noreferrer"
                            className="my-1 flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 max-w-sm transition-all">
                            <IconFile size={22} className="text-blue-400"/>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{msg.file_name || 'Document'}</p>
                              <p className="text-[10px] text-white/40">Click to view/download</p>
                            </div>
                          </a>
                        )
                      )}
                      {/* Mentions highlighted */}
                      {msg.content && msg.content !== msg.file_url && (
                        <span dangerouslySetInnerHTML={{
                          __html: msg.content.replace(/@(\w+(?:\s\w+)?)/g,
                            '<span class="text-primary-light font-semibold">@$1</span>')
                        }}/>
                      )}
                      {msg.is_edited && <span className="text-[9px] opacity-40 ml-1.5">(edited)</span>}
                    </>}
              </div>

              {/* Emoji picker popup */}
              {hasReact && (
                <div className={`absolute z-30 bottom-full mb-1 glass border border-white/[0.1] rounded-xl p-2 flex gap-1.5 shadow-glass ${isOwn?'right-0':'left-0'}`}
                  onClick={e=>e.stopPropagation()}>
                  {(['Like','Love','Haha','Wow','Sad','Thanks','Fire','Done']).map((label, i) => {
                    const emojis = ['👍','❤️','😂','😮','😢','🙏','🔥','✅']
                    return (
                      <button key={label} onClick={(e) => { e.stopPropagation(); sendReact(msg.id, emojis[i]) }}
                        className="text-[10px] font-semibold text-white/60 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap">
                        {label}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Message context menu */}
              {hasMenu && (
                <div className={`absolute z-30 bottom-full mb-1 glass border border-white/[0.1] rounded-xl py-1 shadow-glass min-w-[150px] ${isOwn?'right-0':'left-0'}`}
                  onClick={e=>e.stopPropagation()}>
                  {msg.sender_id === myId && (
                    <button onClick={(e) => { e.stopPropagation(); setEditingMsg(msg); setEditInput(msg.content); setMsgMenu(null) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
                      <IconEdit size={12}/> Edit
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setMsgMenu(null); inputRef.current?.focus() }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <IconReply size={12}/> Reply
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); sendPin(msg.id) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <IconPin size={12}/> {msg.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.content); toast.success('Copied'); setMsgMenu(null) }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <IconDownload size={12}/> Copy
                  </button>
                  {(msg.sender_id === myId || (user as any)?.role === 'admin') && (
                    <button onClick={(e) => { e.stopPropagation(); sendDelete(msg.id) }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors">
                      <IconTrash size={12}/> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reactions row */}
          {Object.keys(msg.reactions||{}).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 px-1">
              {Object.entries(msg.reactions).map(([emoji, data]: [string, any]) => {
                const labelMap: Record<string,string> = {'👍':'Like','❤️':'Love','😂':'Haha','😮':'Wow','😢':'Sad','🙏':'Thanks','🔥':'Fire','✅':'Done'}
                const label = labelMap[emoji] || emoji
                return (
                  <button key={emoji} onClick={(e) => { e.stopPropagation(); sendReact(msg.id, emoji) }}
                    className="flex items-center gap-1 glass border border-white/[0.08] rounded-full px-2.5 py-0.5 text-[10px] font-semibold hover:border-primary/30 transition-colors"
                    title={data.users?.join(', ')}>
                    <span className="text-white/60">{label}</span>
                    <span className="text-white/40">{data.count}</span>
                  </button>
                )
              })}
              <button onClick={(e) => { e.stopPropagation(); setShowReact(msg.id) }}
                className="glass border border-white/[0.06] rounded-full px-2 py-0.5 text-[10px] text-white/25 hover:text-white/60 transition-colors">
                +
              </button>
            </div>
          )}

          {/* Timestamp + read status */}
          {showTime && (
            <div className={`flex items-center gap-1.5 mt-1 px-1 ${isOwn?'flex-row-reverse':''}`}>
              <span className="text-[9px] text-white/20">{relTime(msg.timestamp)}</span>
              {isOwn && <span className="text-[9px] text-white/20">{msg.is_read ? '✓✓' : '✓'}</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Edit overlay ──────────────────────────────────────────────────────────
  function EditOverlay() {
    if (!editingMsg) return null
    return (
      <div className="mx-4 mb-2 glass border border-amber-500/25 rounded-xl p-3 flex items-center gap-3">
        <IconEdit size={14} className="text-amber-400 flex-shrink-0"/>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-amber-400 font-semibold mb-1">Editing message</p>
          <input value={editInput} onChange={e=>setEditInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();submitEdit()} if(e.key==='Escape'){setEditingMsg(null);setEditInput('')} }}
            className="glass-input w-full rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/25 text-xs"
            autoFocus/>
        </div>
        <div className="flex gap-1.5">
          <button onClick={submitEdit} className="btn-primary rounded-lg px-3 py-1.5 text-xs font-bold text-white">Save</button>
          <button onClick={()=>{setEditingMsg(null);setEditInput('')}} className="glass border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white/50">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fade-in"
      onClick={() => { setMsgMenu(null); setShowReact(null) }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 glass border border-white/[0.07] rounded-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconMsg size={16} className="text-primary-light"/>
              <h2 className="font-bold text-sm text-white">Messages</h2>
            </div>
            <button onClick={() => setShowNewChat(true)}
              className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-light hover:bg-primary/30 transition-all">
              <IconPlus size={14}/>
            </button>
          </div>
          <div className="relative">
            <IconSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
            <input value={roomSearch} onChange={e=>setRoomSearch(e.target.value)}
              placeholder="Search conversations…"
              className="glass-input w-full rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/25"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {user?.role === 'student' && (
            <button onClick={handleOpenAiChat}
              className={`w-full flex items-center gap-3 px-3 py-3 mx-1 rounded-xl text-left transition-all mb-2 ${
                activeRoom?.room_type === 'ai'
                  ? 'bg-primary/15 border border-primary/25'
                  : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04]'
              }`}
              style={{ width: 'calc(100% - 8px)' }}>
              <div className="relative flex-shrink-0">
                <div className="rounded-xl flex items-center justify-center font-bold w-9 h-9 bg-primary/20 border border-primary/30 text-primary-light text-sm">
                  AI
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-dark-2 bg-primary"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-white">AI Academic Assistant</p>
                  <span className="text-[8px] bg-primary/30 text-primary-light px-1 py-0.25 rounded font-bold">FREE</span>
                </div>
                <p className="text-[10px] text-white/40 truncate font-normal">Ask me anything about your studies!</p>
              </div>
            </button>
          )}

          {roomsLoading ? Array.from({length:4}).map((_,i)=><div key={i} className="mx-2 h-14 skeleton rounded-xl mb-1.5"/>) :
           filteredRooms.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <IconMsg size={28} className="text-white/15 mx-auto"/>
              <p className="text-xs text-white/30">No conversations yet.</p>
              <button onClick={()=>setShowNewChat(true)} className="btn-primary rounded-xl px-3 py-1.5 text-xs font-bold text-white mx-auto flex items-center gap-1.5">
                <IconPlus size={11}/> Start Chat
              </button>
            </div>
          ) : filteredRooms.map(room => {
            const name     = getRoomName(room, myId)
            const isActive = activeRoom?.id === room.id
            const last     = room.last_message
            return (
              <button key={room.id} onClick={()=>{ setActiveRoom(room); setMessages([]) }}
                className={`w-full flex items-center gap-3 px-3 py-3 mx-1 rounded-xl text-left transition-all ${isActive?'bg-primary/15 border border-primary/25':'hover:bg-white/[0.04] border border-transparent'}`}
                style={{ width:'calc(100% - 8px)' }}>
                <Avatar name={name} size={36}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-semibold text-white truncate flex-1">{name}</p>
                    {room.pinned_count > 0 && <IconPin size={10} className="text-amber-400/60 flex-shrink-0"/>}
                    {(room.unread_count||0) > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {room.unread_count > 9 ? '9+' : room.unread_count}
                      </span>
                    )}
                  </div>
                  {last && <p className="text-[10px] text-white/35 truncate">{last.sender?.split(' ')[0]}: {last.content}</p>}
                  {last?.timestamp && <p className="text-[9px] text-white/20 mt-0.5">{relTime(last.timestamp)}</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Chat pane ─────────────────────────────────────────────────── */}
      <div className="flex-1 glass border border-white/[0.07] rounded-2xl flex flex-col overflow-hidden">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={activeRoomName} size={36}/>
                <div>
                  <p className="font-bold text-sm text-white flex items-center gap-2">
                    {activeRoomName}
                    {activeRoom?.room_type === 'ai' && (
                      <span className="text-[9px] bg-primary/20 border border-primary/30 text-primary-light px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Multimodal Router
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${wsStatus==='open'?'bg-primary animate-pulse':wsStatus==='connecting'?'bg-amber-400 animate-pulse':'bg-red-400'}`}/>
                      <span className="text-[10px] text-white/30 capitalize">{wsStatus}</span>
                    </div>
                    {activeRoom?.room_type !== 'ai' && (
                      <span className="text-[10px] text-white/25">{activeRoom.member_names?.length} members</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {activeRoom?.room_type === 'ai' && (
                  <button onClick={() => setTutorMode(!tutorMode)}
                    className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      tutorMode
                        ? 'bg-primary/20 border-primary/40 text-primary-light shadow-lg shadow-primary/10'
                        : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.06]'
                    }`}>
                    <IconGraduation size={14} className={tutorMode ? 'text-primary-light' : 'text-white/40'}/>
                    <span>Tutor Mode: {tutorMode ? 'Active' : 'Off'}</span>
                  </button>
                )}
                {activeRoom?.room_type !== 'ai' && (
                  <>
                    <button onClick={()=>setShowSearch(!showSearch)}
                      className={`w-8 h-8 glass border rounded-lg flex items-center justify-center transition-colors ${showSearch?'border-primary/40 text-primary-light':'border-white/[0.08] text-white/40 hover:text-white'}`}>
                      <IconSearch size={14}/>
                    </button>
                    <button onClick={()=>{ setShowPinned(!showPinned); setShowSearch(false) }}
                      className={`w-8 h-8 glass border rounded-lg flex items-center justify-center transition-colors ${showPinned?'border-amber-500/40 text-amber-400':'border-white/[0.08] text-white/40 hover:text-white'}`}>
                      <IconPin size={14}/>
                      {activeRoom.pinned_count > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{activeRoom.pinned_count}</span>}
                    </button>
                    <button onClick={()=>setShowMentions(!showMentions)}
                      className="w-8 h-8 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors">
                      <IconAt size={14}/>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search bar */}
            {showSearch && (
              <div className="px-5 py-2.5 border-b border-white/[0.04] flex gap-2">
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter') doSearch() }}
                  placeholder="Search messages… (Enter)"
                  className="glass-input flex-1 rounded-xl px-4 py-2 text-sm text-white placeholder-white/25"/>
                <button onClick={doSearch} className="btn-primary rounded-xl px-4 py-2 text-xs font-bold text-white">Search</button>
                <button onClick={()=>{ setShowSearch(false); setSearchResults([]); setSearchQuery('') }}
                  className="glass border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white/50 hover:text-white">
                  <IconX size={13}/>
                </button>
              </div>
            )}

            {/* Search results overlay */}
            {showSearch && searchResults.length > 0 && (
              <div className="px-5 py-3 border-b border-white/[0.04] max-h-48 overflow-y-auto space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{searchResults.length} results</p>
                {searchResults.map((msg: any) => (
                  <div key={msg.id} className="glass border border-white/[0.06] rounded-xl px-4 py-2.5">
                    <p className="text-[10px] text-white/40 mb-1">{msg.sender_name} · {relTime(msg.timestamp)}</p>
                    <p className="text-xs text-white/70" dangerouslySetInnerHTML={{
                      __html: msg.content.replace(new RegExp(searchQuery,'gi'), m=>`<mark class="bg-amber-500/30 text-amber-300 rounded px-0.5">${m}</mark>`)
                    }}/>
                  </div>
                ))}
              </div>
            )}

            {/* Pinned panel */}
            {showPinned && (
              <div className="px-5 py-3 border-b border-amber-500/15 bg-amber-500/[0.03] max-h-40 overflow-y-auto">
                <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><IconPin size={10}/> Pinned Messages</p>
                {pinned.length === 0
                  ? <p className="text-xs text-white/30">No pinned messages.</p>
                  : pinned.map((msg: any) => (
                    <div key={msg.id} className="glass border border-white/[0.06] rounded-xl px-4 py-2.5 mb-2">
                      <p className="text-[10px] text-white/40 mb-1">{msg.sender_name} · {relTime(msg.timestamp)}</p>
                      <p className="text-xs text-white/70 truncate">{msg.content}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1.5"
              onClick={()=>{ setMsgMenu(null); setShowReact(null) }}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <IconMsg size={28} className="text-primary-light/50"/>
                  </div>
                  <p className="text-white/30 text-sm">No messages yet.</p>
                  <p className="text-white/20 text-xs mt-1">Be the first to say something!</p>
                </div>
              ) : messages.map((msg, i) => (
                <MsgBubble key={msg.id||i} msg={msg} prev={messages[i-1]} next={messages[i+1]}/>
              ))}
              {typingUsers.length > 0 && (
                <div className="flex gap-2.5 items-center">
                  <div className="w-7"/>
                  <div className="glass border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-white/40 italic">{typingUsers.join(', ')} {typingUsers.length===1?'is':'are'} typing</span>
                      {[0,1,2].map(i=><div key={i} className="w-1 h-1 rounded-full bg-white/30 animate-bounce" style={{animationDelay:`${i*.15}s`}}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Edit overlay */}
            <EditOverlay/>

            {/* Reply bar */}
            {replyTo && !editingMsg && (
              <div className="mx-4 mb-2 glass border border-primary/25 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <IconReply size={13} className="text-primary-light flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-primary-light font-semibold">Replying to {replyTo.sender_name}</p>
                  <p className="text-[11px] text-white/40 truncate">{replyTo.content}</p>
                </div>
                <button onClick={()=>setReplyTo(null)} className="text-white/30 hover:text-white"><IconX size={13}/></button>
              </div>
            )}

            {/* @Mention suggestions */}
            {showMentions && memberSuggestions.length > 0 && (
              <div className="mx-4 mb-2 glass border border-white/[0.1] rounded-xl py-1 max-h-36 overflow-y-auto">
                {memberSuggestions.map((name: string) => (
                  <button key={name} onClick={() => {
                    const before = input.slice(0, input.lastIndexOf('@'))
                    setInput(before + `@${name} `)
                    setShowMentions(false)
                    inputRef.current?.focus()
                  }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <Avatar name={name} size={22}/>
                    {name}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div className="px-4 py-3.5 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex gap-2 items-end">
                <input type="file" id="chat-file-input" className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                <button onClick={() => document.getElementById('chat-file-input')?.click()} disabled={wsStatus !== 'open'}
                  title="Upload image or PDF"
                  className="w-11 h-11 rounded-2xl glass border border-white/[0.08] hover:bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white flex-shrink-0 transition-all">
                  <IconPlus size={16} />
                </button>
                
                <button onClick={isRecording ? stopRecording : startRecording} disabled={wsStatus !== 'open'}
                  title={isRecording ? "Stop recording" : "Record voice message"}
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center flex-shrink-0 transition-all ${
                    isRecording 
                      ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                      : 'glass border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.06]'
                  }`}>
                  <IconMic size={16} className={isRecording ? 'text-red-400' : ''}/>
                </button>

                <div className="flex-1">
                  <textarea ref={inputRef} value={input} onChange={handleInput} onKeyDown={handleKey}
                    placeholder={wsStatus==='open'?`Message ${activeRoomName}… (@name to mention)`:wsStatus==='connecting'?'Connecting…':'Reconnecting…'}
                    disabled={wsStatus!=='open'} rows={1}
                    className="glass-input w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none disabled:opacity-40 leading-relaxed"
                    style={{ minHeight:44, maxHeight:120 }}/>
                </div>
                <button onClick={sendMsg} disabled={(!input.trim() && !isRecording) || wsStatus!=='open'}
                  className="w-11 h-11 rounded-2xl btn-primary flex items-center justify-center text-white disabled:opacity-40 flex-shrink-0 transition-all hover:scale-105 active:scale-95">
                  <IconSend size={16}/>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
              <IconMsg size={36} className="text-primary-light/50"/>
            </div>
            <h3 className="font-bold text-white text-base mb-2">Select a conversation</h3>
            <p className="text-white/30 text-sm max-w-xs leading-relaxed mb-5">Choose a room or start a new conversation.</p>
            <button onClick={()=>setShowNewChat(true)}
              className="btn-primary rounded-xl px-5 py-2.5 text-sm font-bold text-white flex items-center gap-2">
              <IconPlus size={14}/> New Conversation
            </button>
          </div>
        )}
      </div>

      {/* ── New Conversation Modal ──────────────────────────────────────── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={()=>setShowNewChat(false)}>
          <div className="glass-strong border border-white/[0.1] rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="font-bold text-white">New Conversation</h3>
              <button onClick={()=>setShowNewChat(false)} className="w-7 h-7 glass border border-white/[0.08] rounded-lg flex items-center justify-center text-white/40 hover:text-white"><IconX size={14}/></button>
            </div>
            <div className="px-6 pt-4 pb-3">
              <div className="flex gap-1 p-1 glass rounded-xl border border-white/[0.06]">
                {(['dm','group'] as const).map(m=>(
                  <button key={m} onClick={()=>setChatMode(m)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${chatMode===m?'bg-primary text-white':'text-white/40 hover:text-white/70'}`}>
                    {m==='dm'?'Direct Message':'Group Chat'}
                  </button>
                ))}
              </div>
            </div>
            {chatMode === 'group' && (
              <div className="px-6 pb-3">
                <input value={groupName} onChange={e=>setGroupName(e.target.value)}
                  placeholder="Group name" className="glass-input w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25"/>
              </div>
            )}
            <div className="px-6 pb-3">
              <div className="relative">
                <IconSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/>
                <input value={userSearch} onChange={e=>setUserSearch(e.target.value)}
                  placeholder="Search users…" className="glass-input w-full rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-white/25"/>
              </div>
            </div>
            {selectedUsers.length > 0 && (
              <div className="px-6 pb-3 flex flex-wrap gap-2">
                {selectedUsers.map(u=>(
                  <div key={u.id} className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 rounded-full px-3 py-1">
                    <span className="text-xs text-primary-light font-medium">{u.first_name} {u.last_name}</span>
                    <button onClick={()=>setSelectedUsers(prev=>prev.filter(x=>x.id!==u.id))}><IconX size={10} className="text-primary-light/60"/></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 min-h-[120px]">
              {otherUsers.map(u => {
                const sel = selectedUsers.some(x=>x.id===u.id)
                return (
                  <button key={u.id} onClick={()=>{
                    if(sel) setSelectedUsers(prev=>prev.filter(x=>x.id!==u.id))
                    else if(chatMode==='dm') setSelectedUsers([u])
                    else setSelectedUsers(prev=>[...prev,u])
                  }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${sel?'bg-primary/15 border border-primary/25':'hover:bg-white/[0.04] border border-transparent'}`}>
                    <Avatar name={`${u.first_name} ${u.last_name}`} size={32}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.first_name} {u.last_name}</p>
                      <p className="text-[11px] text-white/35 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                        u.role==='admin'?'bg-red-500/20 text-red-300':u.role==='lecturer'?'bg-blue-500/20 text-blue-300':'bg-white/10 text-white/30'
                      }`}>{u.role}</span>
                      {sel && <IconCheck size={13} className="text-primary-light"/>}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-6 pb-6 pt-3 border-t border-white/[0.06]">
              <button onClick={handleCreateRoom}
                disabled={!selectedUsers.length||(chatMode==='group'&&!groupName.trim())||createMutation.isPending}
                className="w-full btn-primary rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2">
                {createMutation.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creating…</>
                  : chatMode==='dm'?'Start Direct Message':'Create Group Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
