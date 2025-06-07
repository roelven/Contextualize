import { Session, User } from '@supabase/supabase-js'

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

export interface ChatMessage {
  id: string
  content: string
  user_id: string | null
  space_id: string
  is_ai: boolean
  created_at: string
  media_url?: string | null
}