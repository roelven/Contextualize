'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Chat from '@/components/Chat'
import Auth from '@/components/Auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function SpacePage() {
  const params = useParams()
  const router = useRouter()
  const spaceId = params.id as string
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkSpaceAccess = useCallback(async () => {
    if (!session || !spaceId) return
    
    setCheckingAccess(true)
    
    try {
      // Check if user is already a member
      const { data: memberData } = await supabase
        .from('space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('user_id', session.user.id)
        .single()

      if (memberData) {
        setHasAccess(true)
      } else {
        // If not a member, add them as a member (they accessed via shared link)
        const { error } = await supabase
          .from('space_members')
          .insert({
            space_id: spaceId,
            user_id: session.user.id,
            role: 'member'
          })

        if (!error) {
          setHasAccess(true)
        } else {
          console.error('Error adding user to space:', error)
          setHasAccess(false)
        }
      }
    } catch (error) {
      console.error('Error checking space access:', error)
      setHasAccess(false)
    } finally {
      setCheckingAccess(false)
    }
  }, [session, spaceId])

  useEffect(() => {
    if (session && spaceId) {
      checkSpaceAccess()
    } else if (!loading && !session) {
      setCheckingAccess(false)
    }
  }, [session, spaceId, loading, checkSpaceAccess])

  if (loading || checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have access to this space. Please check the link or contact the space owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => router.push('/')}
              className="text-primary hover:underline"
            >
              Go back to home
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <Chat session={session} spaceId={spaceId} />
}