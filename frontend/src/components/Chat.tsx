'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { ArrowLeft, Send, Settings, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Message = Database['public']['Tables']['messages']['Row'] & {
  profiles?: {
    username: string | null
  } | null
}

type SpaceMember = Database['public']['Tables']['space_members']['Row'] & {
  profiles?: {
    username: string | null
    id: string
  } | null
}

interface ChatProps {
  session: Session
  spaceId: string
}


export default function Chat({ session, spaceId }: ChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [spaceName, setSpaceName] = useState('Loading...')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [isOwner, setIsOwner] = useState(false)
  const [members, setMembers] = useState<SpaceMember[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [nimbusTyping, setNimbusTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [completedMessageId, setCompletedMessageId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSpaceInfo = useCallback(async () => {
    const { data: space, error } = await supabase
      .from('spaces')
      .select('name, system_prompt, temperature')
      .eq('id', spaceId)
      .single()

    if (error) {
      console.error('Error fetching space info:', error)
      setSpaceName('Unknown Space')
    } else {
      setSpaceName(space.name)
      setSystemPrompt(space.system_prompt)
      setTemperature(space.temperature || 0.7)
    }

    // Check if user is owner
    const { data: memberData } = await supabase
      .from('space_members')
      .select('role')
      .eq('space_id', spaceId)
      .eq('user_id', session.user.id)
      .single()

    setIsOwner(memberData?.role === 'owner')
  }, [spaceId, session.user.id])

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('space_members')
      .select(`
        *,
        profiles(
          id,
          username
        )
      `)
      .eq('space_id', spaceId)

    if (!error && data) {
      setMembers(data)
    }
  }, [spaceId])

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles(
          username
        )
      `)
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
      await fetchMembers()
      await fetchMessages()
    }
    
    initialize()
    
    // Subscribe to real-time messages
    console.log('🔌 Setting up real-time subscription for space:', spaceId)
    const subscription = supabase
      .channel(`messages:${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `space_id=eq.${spaceId}`,
        },
        async (payload) => {
          console.log('🔔 Real-time INSERT event:', payload.new)
          // Skip if this is our own optimistic message
          if (payload.new.id.toString().startsWith('temp-')) {
            return
          }

          // Fetch the complete message with profile data
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles(
                username
              )
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            console.log('📨 Processing new message:', data.id, 'Expected:', completedMessageId)
            // Only add if not already in messages (avoid duplicates)
            setMessages(prev => {
              const exists = prev.some(m => m.id === data.id)
              if (!exists) {
                console.log('➕ Adding new message to state')
                return [...prev, data]
              }
              console.log('⚠️ Message already exists, skipping')
              return prev
            })
            
            // If this is the completed streaming message, clear streaming state
            if (data.is_ai && data.id === completedMessageId) {
              console.log('✅ Real-time picked up completed message, clearing streaming state')
              setStreamingMessage('')
              setCompletedMessageId(null)
            }
            
            // If this is an AI message with empty content, it means Nimbus is starting to type
            if (data.is_ai && data.content === '') {
              setNimbusTyping(true)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `space_id=eq.${spaceId}`,
        },
        async (payload) => {
          // Fetch the updated message with profile data
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles(
                username
              )
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            // Update the existing message in the list
            setMessages(prev => 
              prev.map(m => m.id === data.id ? data : m)
            )
            
            // If this is an AI message and it has content, Nimbus is done typing
            if (data.is_ai && data.content && data.content.length > 0) {
              setNimbusTyping(false)
            }
          }
        }
      )
      .subscribe()

    // Handle page visibility changes to ensure real-time works when tab regains focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Refresh messages when tab becomes visible to ensure we haven't missed anything
        fetchMessages()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Cleanup EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [spaceId, fetchMessages, fetchSpaceInfo, fetchMembers])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, completedMessageId])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))
    
    if (imageFile) {
      handleImageSelect(imageFile)
    }
  }

  const handleImageSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${spaceId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError)
      return null
    }

    const { data } = supabase.storage
      .from('chat-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && !imageFile) return

    const messageContent = newMessage
    setLoading(true)
    let mediaUrl = null

    // Upload image if present
    if (imageFile) {
      setUploadingImage(true)
      mediaUrl = await uploadImage(imageFile)
      setUploadingImage(false)
      setImageFile(null)
      setImagePreview(null)
    }

    // Create optimistic message
    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      space_id: spaceId,
      user_id: session.user.id,
      content: messageContent,
      media_url: mediaUrl,
      is_ai: false,
      created_at: new Date().toISOString(),
      profiles: {
        username: session.user.email?.split('@')[0] || 'You'
      }
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        space_id: spaceId,
        user_id: session.user.id,
        content: messageContent,
        media_url: mediaUrl,
        is_ai: false
      })
      .select(`
        *,
        profiles(
          username
        )
      `)
      .single()

    if (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
    } else if (data) {
      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(m => m.id === optimisticMessage.id ? data : m)
      )
      
      // Check if message mentions Nimbus
      if (messageContent.toLowerCase().includes('@nimbus')) {
        triggerAIResponse()
      }
    }
    
    setLoading(false)
  }

  const triggerAIResponse = async () => {
    try {
      console.log('🚀 STARTING AI RESPONSE - YOU SHOULD SEE THIS!')
      // Start streaming state
      setIsStreaming(true)
      setNimbusTyping(true)
      setStreamingMessage('')
      setCompletedMessageId(null)
      
      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      
      // Create new EventSource with POST data as query params (EventSource only supports GET)
      const params = new URLSearchParams({
        spaceId,
        systemPrompt: systemPrompt || 'You are Nimbus, a helpful AI assistant participating in a multiplayer chat. Respond conversationally and helpfully.',
        provider: 'openai',
        temperature: temperature.toString(),
        messages: JSON.stringify(messages.slice(-10).map(m => ({
          role: m.is_ai ? 'assistant' : 'user',
          content: m.content
        })))
      })
      
      const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/llm?${params}`)
      eventSourceRef.current = eventSource
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          switch (data.type) {
            case 'start':
              break
              
            case 'chunk':
              // Add chunk to streaming message
              setStreamingMessage(prev => prev + data.content)
              break
              
            case 'complete':
              console.log('📥 Streaming completed, message saved:', data.messageId)
              // Manually fetch the saved message instead of relying on real-time
              setIsStreaming(false)
              setNimbusTyping(false)
              setCompletedMessageId(data.messageId)
              eventSource.close()
              
              // Fetch the complete message with profile data
              setTimeout(async () => {
                const { data: savedMessage } = await supabase
                  .from('messages')
                  .select(`
                    *,
                    profiles(
                      username
                    )
                  `)
                  .eq('id', data.messageId)
                  .single()
                
                if (savedMessage) {
                  console.log('✅ Manually fetched completed message:', savedMessage.id)
                  // Add the real message
                  setMessages(prev => {
                    const exists = prev.some(m => m.id === savedMessage.id)
                    if (!exists) {
                      return [...prev, savedMessage]
                    }
                    return prev
                  })
                  
                  // Clear streaming state
                  setStreamingMessage('')
                  setCompletedMessageId(null)
                }
              }, 100)
              break
              
            case 'error':
              console.error('Streaming error:', data.message)
              setIsStreaming(false)
              setNimbusTyping(false)
              setStreamingMessage('')
              eventSource.close()
              break
          }
        } catch (parseError) {
          console.error('Error parsing SSE event:', parseError)
        }
      }
      
      eventSource.onerror = () => {
        setIsStreaming(false)
        setNimbusTyping(false)
        setStreamingMessage('')
        eventSource.close()
      }
      
    } catch (error) {
      console.error('Error setting up AI response stream:', error)
      setIsStreaming(false)
      setNimbusTyping(false)
      setStreamingMessage('')
    }
  }

  const updateSpaceSettings = async () => {
    const { error } = await supabase
      .from('spaces')
      .update({ 
        system_prompt: systemPrompt,
        temperature: temperature
      })
      .eq('id', spaceId)

    if (error) {
      console.error('Error updating space settings:', error)
    } else {
      console.log('Space settings updated successfully')
    }
  }

  const handleMentionSelect = (username: string) => {
    const lastAtIndex = newMessage.lastIndexOf('@')
    const beforeMention = newMessage.slice(0, lastAtIndex)
    const afterMention = newMessage.slice(lastAtIndex + mentionSearch.length + 1)
    setNewMessage(`${beforeMention}@${username} ${afterMention}`)
    setShowMentions(false)
    setMentionSearch('')
    textareaRef.current?.focus()
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setNewMessage(value)

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@')
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true)
      setMentionSearch('')
    } else if (lastAtIndex !== -1 && showMentions) {
      const searchTerm = value.slice(lastAtIndex + 1)
      setMentionSearch(searchTerm)
    } else {
      setShowMentions(false)
    }
  }

  const renderMessage = (content: string) => {
    // Simple URL to image detection
    const urlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/gi
    const parts = content.split(urlRegex)
    
    return parts.map((part, index) => {
      if (part.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return null // Skip file extensions
      } else if (part.match(/^https?:\/\//)) {
        return (
          <Image
            key={index}
            src={part}
            alt="Shared image"
            className="max-w-full rounded-lg mt-2"
            style={{ maxHeight: '400px' }}
            width={400}
            height={400}
            unoptimized
          />
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{spaceName}</h1>
              <p className="text-sm text-muted-foreground">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Space Settings</SheetTitle>
                    <SheetDescription>
                      Configure your space settings and Nimbus behavior
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <Label htmlFor="system-prompt">Nimbus System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="mt-2 min-h-[150px]"
                        placeholder="Configure how Nimbus should behave..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="temperature">Temperature (Creativity): {temperature}</Label>
                      <div className="mt-2">
                        <input
                          id="temperature"
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Focused (0.0)</span>
                          <span>Balanced (1.0)</span>
                          <span>Creative (2.0)</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={updateSpaceSettings}
                      className="mt-4"
                      size="sm"
                    >
                      Save All Changes
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-destructive hover:text-destructive"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => {
            const isCurrentUser = message.user_id === session.user.id
            const username = message.is_ai ? 'Nimbus' : (message.profiles?.username || 'Anonymous')
            
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {message.is_ai ? 'N' : username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 ${isCurrentUser ? 'text-right' : ''}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium">{username}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <Card className={`inline-block p-3 ${isCurrentUser ? 'bg-primary text-primary-foreground' : ''}`}>
                    <div className="text-sm">
                      {renderMessage(message.content)}
                      {message.media_url && (
                        <Image
                          src={message.media_url}
                          alt="Uploaded image"
                          className="max-w-full rounded-lg mt-2"
                          style={{ maxHeight: '400px' }}
                          width={400}
                          height={400}
                          unoptimized
                        />
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )
          })}
          
          {/* Streaming message from Nimbus */}
          {(isStreaming || completedMessageId) && streamingMessage && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>N</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium">Nimbus</span>
                  <span className="text-xs text-muted-foreground">
                    {isStreaming ? 'streaming...' : 'saving...'}
                  </span>
                </div>
                <Card className="inline-block p-3">
                  <div className="text-sm">
                    {renderMessage(streamingMessage)}
                    <span className="animate-pulse">|</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
          
          {/* Typing indicator for Nimbus (when starting to stream) */}
          {nimbusTyping && !streamingMessage && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>N</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium">Nimbus</span>
                </div>
                <Card className="inline-block p-3">
                  <div className="flex items-center gap-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-sm text-muted-foreground ml-2">thinking...</span>
                  </div>
                </Card>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t">
        <div className="container mx-auto max-w-4xl p-4">
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <Image
                src={imagePreview}
                alt="Preview"
                className="h-20 rounded-lg"
                width={80}
                height={80}
                unoptimized
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                onClick={() => {
                  setImagePreview(null)
                  setImageFile(null)
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <form onSubmit={sendMessage} className="relative">
            <div
              className={`flex gap-2 ${isDragging ? 'ring-2 ring-primary rounded-lg' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Type a message... (mention @Nimbus for AI response)"
                  className="min-h-[60px] pr-10"
                  disabled={loading || uploadingImage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(e)
                    }
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageSelect(file)
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="submit"
                disabled={loading || uploadingImage || (!newMessage.trim() && !imageFile)}
              >
                {loading || uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Mention Popover */}
            {showMentions && (
              <div className="absolute bottom-full mb-2 left-0">
                <Card className="p-2">
                  <Command>
                    <CommandInput
                      placeholder="Search users..."
                      value={mentionSearch}
                      onValueChange={setMentionSearch}
                    />
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleMentionSelect('Nimbus')}>
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>N</AvatarFallback>
                        </Avatar>
                        Nimbus (AI Assistant)
                      </CommandItem>
                      {members
                        .filter(m => m.profiles?.username?.toLowerCase().includes(mentionSearch.toLowerCase()))
                        .map((member) => (
                          <CommandItem
                            key={member.id}
                            onSelect={() => handleMentionSelect(member.profiles?.username || 'Anonymous')}
                          >
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback>
                                {member.profiles?.username?.[0]?.toUpperCase() || 'A'}
                              </AvatarFallback>
                            </Avatar>
                            {member.profiles?.username || 'Anonymous'}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </Card>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}