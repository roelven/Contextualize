'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Copy, LogOut, Plus } from 'lucide-react'

type Space = Database['public']['Tables']['spaces']['Row']

interface SpaceManagerProps {
  session: Session
}

export default function SpaceManager({ session }: SpaceManagerProps) {
  const router = useRouter()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [creatingSpace, setCreatingSpace] = useState(false)

  const fetchSpaces = useCallback(async () => {
    // First, get all space IDs where the user is a member
    const { data: membershipData, error: membershipError } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', session.user.id)

    if (membershipError) {
      console.error('Error fetching user memberships:', membershipError)
      setLoading(false)
      return
    }

    if (!membershipData || membershipData.length === 0) {
      setSpaces([])
      setLoading(false)
      return
    }

    // Get space details for all spaces where user is a member
    const spaceIds = membershipData.map(m => m.space_id)
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .in('id', spaceIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching spaces:', error)
    } else {
      setSpaces(data || [])
    }
    setLoading(false)
  }, [session.user.id])

  useEffect(() => {
    fetchSpaces()
  }, [fetchSpaces])

  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return

    setCreatingSpace(true)
    
    const { data, error } = await supabase
      .from('spaces')
      .insert({
        name: newSpaceName.trim(),
        system_prompt: 'You are Nimbus, a helpful AI assistant participating in a multiplayer chat. Respond conversationally and helpfully when mentioned with @Nimbus.',
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating space:', error)
    } else {
      setNewSpaceName('')
      router.push(`/space/${data.id}`)
    }
    
    setCreatingSpace(false)
  }

  const copySpaceLink = (spaceId: string) => {
    const link = `${window.location.origin}/space/${spaceId}`
    navigator.clipboard.writeText(link)
    // You could add a toast notification here
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading spaces...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Contextualize</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl p-6">
        {/* Create New Space */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Space</CardTitle>
            <CardDescription>Start a new private conversation space</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSpace} className="flex gap-3">
              <Input
                type="text"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                placeholder="Enter space name..."
                disabled={creatingSpace}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={creatingSpace || !newSpaceName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                {creatingSpace ? 'Creating...' : 'Create Space'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Spaces List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Spaces</CardTitle>
            <CardDescription>Private spaces you have access to</CardDescription>
          </CardHeader>
          <CardContent>
            {spaces.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No spaces available. Create your first space above!
              </div>
            ) : (
              <div className="space-y-4">
                {spaces.map((space, index) => (
                  <div key={space.id}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">
                          {space.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Created {new Date(space.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copySpaceLink(space.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => router.push(`/space/${space.id}`)}
                        >
                          Enter Space
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}