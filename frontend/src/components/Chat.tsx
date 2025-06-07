'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Session } from '@supabase/supabase-js'

type Message = Database['public']['Tables']['messages']['Row']

interface ChatProps {
  session: Session
  spaceId: string
}

interface LLMRequest {
  spaceId: string
  messages: Array<{ role: string; content: string }>
  systemPrompt: string
  provider: string
}

export default function Chat({ session, spaceId }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [spaceName, setSpaceName] = useState('Loading...')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSpaceInfo = useCallback(async () => {
    const { data: space, error } = await supabase
      .from('spaces')
      .select('name')
      .eq('id', spaceId)
      .single()

    if (error) {
      console.error('Error fetching space info:', error)
      setSpaceName('Unknown Space')
    } else {
      setSpaceName(space.name)
    }
  }, [spaceId])

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages:', error)
    } else {
      setMessages(data || [])
    }
  }, [spaceId])

  useEffect(() => {
    const initialize = async () => {
      await fetchSpaceInfo()
      await fetchMessages()
    }
    
    initialize()
    
    // Subscribe to real-time messages
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `space_id=eq.${spaceId}`,
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [spaceId, fetchMessages, fetchSpaceInfo])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setLoading(true)
    
    const { error } = await supabase
      .from('messages')
      .insert({
        space_id: spaceId,
        user_id: session.user.id,
        content: newMessage,
        is_ai: false
      })

    if (error) {
      console.error('Error sending message:', error)
    } else {
      setNewMessage('')
      
      // Check if message mentions AI and trigger LLM response
      if (newMessage.toLowerCase().includes('@ai') || newMessage.toLowerCase().includes('@assistant')) {
        triggerAIResponse()
      }
    }
    
    setLoading(false)
  }

  const triggerAIResponse = async () => {
    try {
      const response = await fetch(`${process.env.NODE_ENV === 'production' ? 'http://backend:3001' : 'http://localhost:3011'}/api/llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId,
          messages: messages.slice(-5).map(m => ({
            role: m.is_ai ? 'assistant' : 'user',
            content: m.content
          })),
          systemPrompt: 'You are a helpful assistant participating in a multiplayer chat. Respond conversationally and helpfully.',
          provider: 'openai'
        } as LLMRequest),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">{spaceName}</h1>
          <p className="text-sm text-gray-500">Space ID: {spaceId}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to Spaces
          </button>
          <span className="text-sm text-gray-600">{session.user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.is_ai ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.is_ai
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-blue-500 text-white'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message... (mention @ai to get AI response)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}