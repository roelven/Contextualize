'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Session } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ArrowLeft, Send, Settings, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

interface LLMRequest {
  spaceId: string
  messages: Array<{ role: string; content: string }>
  systemPrompt: string
  provider: string
}

export default function Chat({ session, spaceId }: ChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [spaceName, setSpaceName] = useState('Loading...')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [members, setMembers] = useState<SpaceMember[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSpaceInfo = useCallback(async () => {
    const { data: space, error } = await supabase
      .from('spaces')
      .select('name, system_prompt')
      .eq('id', spaceId)
      .single()

    if (error) {
      console.error('Error fetching space info:', error)
      setSpaceName('Unknown Space')
    } else {
      setSpaceName(space.name)
      setSystemPrompt(space.system_prompt)
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
        profiles:user_id (
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
        profiles:user_id (
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
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:user_id (
                username
              )
            `)
            .eq('id', payload.new.id)
            .single()
          
          if (data) {
            setMessages(prev => [...prev, data])
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [spaceId, fetchMessages, fetchSpaceInfo, fetchMembers])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
    
    const { error } = await supabase
      .from('messages')
      .insert({
        space_id: spaceId,
        user_id: session.user.id,
        content: newMessage,
        media_url: mediaUrl,
        is_ai: false
      })

    if (error) {
      console.error('Error sending message:', error)
    } else {
      setNewMessage('')
      
      // Check if message mentions Nimbus
      if (newMessage.toLowerCase().includes('@nimbus')) {
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
          messages: messages.slice(-10).map(m => ({
            role: m.is_ai ? 'assistant' : 'user',
            content: m.content
          })),
          systemPrompt: systemPrompt || 'You are Nimbus, a helpful AI assistant participating in a multiplayer chat. Respond conversationally and helpfully.',
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

  const updateSystemPrompt = async () => {
    const { error } = await supabase
      .from('spaces')
      .update({ system_prompt: systemPrompt })
      .eq('id', spaceId)

    if (error) {
      console.error('Error updating system prompt:', error)
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
          <img
            key={index}
            src={part}
            alt="Shared image"
            className="max-w-full rounded-lg mt-2"
            style={{ maxHeight: '400px' }}
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
                      <Button
                        onClick={updateSystemPrompt}
                        className="mt-2"
                        size="sm"
                      >
                        Save Changes
                      </Button>
                    </div>
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
                        <img
                          src={message.media_url}
                          alt="Uploaded image"
                          className="max-w-full rounded-lg mt-2"
                          style={{ maxHeight: '400px' }}
                        />
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t">
        <div className="container mx-auto max-w-4xl p-4">
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-20 rounded-lg"
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