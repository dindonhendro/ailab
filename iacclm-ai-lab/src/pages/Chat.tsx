import { useEffect, useRef, useState } from 'react'
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Bot,
  User,
  Dna,
  AlertCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useChatStore } from '../stores/chatStore'
import { Card, Spinner, EmptyState } from '../components/ui/ui'
import Button from '../components/ui/Button'
import type { Message } from '../types'

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser ? 'bg-primary-100' : 'bg-violet-100'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-primary-700" />
        ) : (
          <Bot size={14} className="text-violet-700" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm ${
            isUser
              ? 'bg-primary-700 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          ) : (
            <div className="prose-medical">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <span className="text-[10px] text-gray-400 px-1">
          {format(new Date(msg.created_at), 'HH:mm', { locale: idLocale })}
        </span>
      </div>
    </div>
  )
}

export default function Chat() {
  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    fetchConversations,
    selectConversation,
    createConversation,
    deleteConversation,
    sendMessage,
    clearActiveConversation,
  } = useChatStore()

  const [input, setInput]               = useState('')
  const [fhirContext, setFhirContext]   = useState(false)
  const bottomRef                        = useRef<HTMLDivElement>(null)
  const textareaRef                      = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { fetchConversations() }, [fetchConversations])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    await sendMessage(text, fhirContext)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="h-full flex gap-4">
      {/* ── Conversation Sidebar ─────────────────────────── */}
      <div className="w-60 flex flex-col gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => { clearActiveConversation(); createConversation() }}
          leftIcon={<Plus size={14} />}
          className="w-full"
        >
          Percakapan Baru
        </Button>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {conversations.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">Belum ada percakapan</p>
          )}
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                activeConversation?.id === conv.id
                  ? 'bg-primary-50 border border-primary-100'
                  : 'hover:bg-gray-50'
              }`}
            >
              <MessageSquare size={13} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-700 truncate flex-1">{conv.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chat Main Area ───────────────────────────────── */}
      <Card padding="none" className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {activeConversation?.title ?? 'AI Chat IACCLM'}
              </p>
              <p className="text-[10px] text-gray-400">FHIR-aware · Bahasa Indonesia Medis</p>
            </div>
          </div>
          {/* FHIR context toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Dna size={14} className={fhirContext ? 'text-primary-600' : 'text-gray-400'} />
            <span className="text-xs text-gray-500 font-medium">FHIR Context</span>
            <div
              onClick={() => setFhirContext((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                fhirContext ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                  fhirContext ? 'left-4' : 'left-0.5'
                }`}
              />
            </div>
          </label>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {!activeConversation && (
            <EmptyState
              icon={<Bot size={40} />}
              title="Mulai percakapan baru"
              description="Tanyakan tentang interpretasi laboratorium, nilai rujukan IACCLM, atau panduan LOINC dan FHIR kepada asisten AI."
            />
          )}

          {activeConversation && messages.length === 0 && (
            <EmptyState
              icon={<MessageSquare size={36} />}
              title="Percakapan masih kosong"
              description="Kirim pesan pertama Anda di bawah ini."
            />
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-violet-700" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 px-4 py-3">
          {/* Suggested questions */}
          {!activeConversation && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                'Apa nilai rujukan kreatinin (LOINC 2160-0)?',
                'Bagaimana interpretasi SGPT tinggi?',
                'Jelaskan format Observation FHIR',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); textareaRef.current?.focus() }}
                  className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Tanyakan sesuatu tentang laboratorium klinik…"
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                         max-h-32 min-h-[40px] overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.currentTarget
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 128) + 'px'
              }}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-10 w-10 !px-0"
            >
              {isLoading ? <Spinner size="sm" /> : <Send size={16} />}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Enter untuk kirim · Shift+Enter untuk baris baru
          </p>
        </div>
      </Card>
    </div>
  )
}
