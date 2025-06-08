export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      spaces: {
        Row: {
          id: string
          name: string
          system_prompt: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          system_prompt?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          system_prompt?: string
          created_by?: string | null
          created_at?: string
        }
      }
      space_members: {
        Row: {
          id: string
          space_id: string
          user_id: string
          role: 'owner' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          space_id: string
          user_id: string
          role?: 'owner' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          space_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          space_id: string
          user_id: string | null
          content: string
          media_url: string | null
          is_ai: boolean
          created_at: string
        }
        Insert: {
          id?: string
          space_id: string
          user_id?: string | null
          content: string
          media_url?: string | null
          is_ai?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          space_id?: string
          user_id?: string | null
          content?: string
          media_url?: string | null
          is_ai?: boolean
          created_at?: string
        }
      }
    }
  }
}