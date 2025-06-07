'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

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

  useEffect(() => {
    fetchSpaces()
  }, [])

  const fetchSpaces = async () => {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching spaces:', error)
    } else {
      setSpaces(data || [])
    }
    setLoading(false)
  }

  const createSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return

    setCreatingSpace(true)
    
    const { data, error } = await supabase
      .from('spaces')
      .insert({
        name: newSpaceName.trim(),
        system_prompt: 'You are a helpful assistant participating in a multiplayer chat. Respond conversationally and helpfully when mentioned with @ai.',
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
    alert('Space link copied to clipboard!')
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contextualize Spaces</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Create New Space */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Space</h2>
          <form onSubmit={createSpace} className="flex gap-3">
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="Enter space name..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={creatingSpace}
            />
            <button
              type="submit"
              disabled={creatingSpace || !newSpaceName.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {creatingSpace ? 'Creating...' : 'Create Space'}
            </button>
          </form>
        </div>

        {/* Spaces List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Available Spaces</h2>
          </div>
          
          {spaces.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No spaces available. Create your first space above!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {spaces.map((space) => (
                <div key={space.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {space.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Created {new Date(space.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => copySpaceLink(space.id)}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => router.push(`/space/${space.id}`)}
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Enter Space
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}