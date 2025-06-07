'use client'

import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import Auth from '@/components/Auth'
import SpaceManager from '@/components/SpaceManager'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return <SpaceManager session={session} />
}
