# CLAUDE.md – Multiplayer LLM Chat Application

## 🧭 Overview

A full-stack, multiplayer chat application where users can converse in real time and interact with **Nimbus** (an LLM powered by OpenAI, Gemini, or Deepseek) as a participant. The system is built for fast, seamless UX with a modern shadcn/ui interface, supports media uploads with drag & drop, and keeps LLM API keys secure via a minimal backend proxy.

---

## 🛠️ Tech Stack

- **Frontend:** React (Next.js) with shadcn/ui components and Tailwind CSS
- **Backend:** Minimal Node.js/Express server for LLM proxying and instruction configuration
- **Real-time/Data/Auth/Storage:** Supabase (DB, Realtime, Auth, Storage)
- **LLM Providers:** OpenAI, Gemini, Deepseek (configurable per instance)
- **UI Library:** shadcn/ui with Radix UI primitives for modern, accessible components
- **Deployment:** Dockerized, frontend and backend deployable together or separately, works with custom domains and Cloudflare tunnels

---

## 🔑 Core Features

### ✅ Implemented Features

- **Private Spaces with Sharing:**
  - Spaces are private by default - only members can see them
  - When someone accesses a space via shared URL, they're automatically added as a member
  - Space owners have special privileges (can edit settings, manage system prompts)
  - Member count displayed in space header

- **Modern UI with shadcn/ui:**
  - Complete UI refactor using shadcn/ui components (Button, Input, Card, Dialog, etc.)
  - Consistent, modern design with proper TypeScript integration
  - Responsive layout with proper spacing and accessibility

- **Enhanced Chat Experience:**
  - Real-time messaging with proper username display (no more user IDs)
  - Messages show usernames instead of user IDs with improved data fetching
  - Optimistic UI updates for better perceived performance
  - Space name prominently displayed (space ID hidden from UI)

- **@Mention Functionality:**
  - Type "@" to get dropdown showing available participants
  - Users can select from other members or **Nimbus** (the AI assistant)
  - Proper autocomplete functionality with search
  - Mentioning @Nimbus triggers AI response

- **Image Upload & Display:**
  - Drag & drop functionality on message input area
  - Image preview before sending messages
  - Images uploaded to Supabase Storage only when message is submitted
  - Visual feedback during upload process
  - Automatic detection and inline rendering of image URLs in messages
  - Proper image sizing (max-width constrained)

- **Space Settings Panel:**
  - Settings panel accessible via Settings button (space owners only)
  - Owners can configure system prompt for Nimbus behavior
  - Settings saved to database with real-time updates

- **Nimbus AI Assistant:**
  - All references changed from "AI" to "Nimbus" 
  - Updated system prompts and UI references accordingly
  - Nimbus participates as a chat member when mentioned
  - Proxy backend ensures API keys for all providers stay secret

- **Authentication:**  
  - Supabase Auth (email/password) with session management
  - Automatic user profile creation and management

### 🔧 Technical Improvements

- **Better TypeScript Integration:**
  - Extended interfaces for joined data relationships
  - Proper type safety throughout the application
  - Database types generated from Supabase schema

- **Enhanced Data Fetching:**
  - Real-time subscriptions fetch complete message data including user profiles
  - Improved error handling and loading states
  - Proper cleanup of subscriptions to prevent memory leaks

- **Row Level Security (RLS):**
  - Comprehensive RLS policies for secure data access
  - Space membership controls message and space visibility
  - Automatic space ownership assignment via database triggers

---

## 🗂️ Project Structure

```plaintext
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── Auth.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── SpaceManager.tsx
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── space/[id]/page.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       ├── database.ts
│   │       └── supabase.ts
│   ├── components.json      # shadcn/ui config
│   └── package.json
├── backend/
│   ├── routes/
│   │   └── llm.js
│   ├── index.js
│   └── package.json
├── supabase/
│   ├── migrations/
│   │   └── 20250608143352_remote_schema.sql
│   └── config.toml
├── docker-compose.yml
├── README.md
└── CLAUDE.md
```

---

## ⚙️ Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LLM_OPENAI_API_KEY`
- `LLM_GEMINI_API_KEY`
- `LLM_DEEPSEEK_API_KEY`
- (others as needed for hosting/backend config)

---

## 🔁 LLM Proxy Logic

- **Frontend** posts user messages to Supabase as normal.
- When Nimbus is mentioned (@Nimbus):
    1. Frontend sends relevant context and config to `/api/llm` endpoint.
    2. Backend chooses the LLM provider based on config/env.
    3. Backend applies the per-space instructions/system prompt.
    4. Backend sends prompt + chat history to LLM provider.
    5. Backend receives response, posts as "Nimbus" in Supabase chat.
    6. Frontend gets update in real-time (Supabase Realtime).

---

## 🏗️ Configurable Instructions

- Each space stores a `system_prompt` (editable by owner via Settings panel).
- Prompt is injected before each LLM call, allowing for custom personality, behavior, or rules per chat.
- Default: "You are Nimbus, a helpful AI assistant participating in a multiplayer chat. Respond conversationally and helpfully when mentioned with @Nimbus."

---

## 🚀 Current Status

### ✅ Completed
- Private spaces with automatic member addition via shared links
- Modern shadcn/ui interface with full component refactor
- Real-time chat with proper username display
- @Mention functionality for users and Nimbus
- Image upload with drag & drop and preview
- Space settings panel for owners
- Comprehensive RLS policies and security
- Database schema with proper relationships

### 🔄 In Progress
- Backend LLM proxy implementation
- Enhanced error handling and edge cases

### 📋 Remaining MVP Features
- Docker deployment configuration
- Production environment setup
- Additional LLM provider integrations

---

## 🧩 Extensibility

- Add moderation/analytics easily via backend hooks.
- Add more LLMs by extending backend logic.
- Allow toggling passive/hybrid/active LLM behavior per space.
- Support other file types/media as needed.

---

## 📌 Notes

- LLM responses are *always* proxied through backend to keep API keys secure.
- Frontend and backend can be deployed together or separately.
- User privacy and chat security enforced via Supabase RLS and auth.
- All AI references have been rebranded to "Nimbus" for consistency.

---

## 🔗 References

- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [OpenAI API Docs](https://platform.openai.com/docs/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Deepseek API Docs](https://platform.deepseek.com/docs/)