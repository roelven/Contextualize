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

- **Nimbus AI Assistant with Streaming Responses:**
  - All references changed from "AI" to "Nimbus" 
  - Updated system prompts and UI references accordingly
  - Nimbus participates as a chat member when mentioned
  - **Real-time streaming responses** with character-by-character display
  - **Temperature control** (0.0-2.0) for response creativity in space settings
  - **Typing indicators** that show when Nimbus is generating responses
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

## 🔁 LLM Proxy Logic & Streaming Architecture

### **Standard Message Flow**
- **Frontend** posts user messages to Supabase as normal.
- Real-time subscriptions ensure all participants see messages instantly.

### **Nimbus Streaming Response Flow**
When Nimbus is mentioned (@Nimbus):
1. **Frontend** sends context and config to `/api/llm` endpoint via fetch request.
2. **Backend** chooses LLM provider based on config/env variables.
3. **Backend** applies per-space system prompt and temperature settings.
4. **Backend** initiates streaming response using **Server-Sent Events (SSE)**:
   - Sets appropriate SSE headers (`text/event-stream`, `Cache-Control: no-cache`)
   - Sends LLM prompt + chat history to provider with `stream: true`
   - Receives streaming chunks from LLM provider
5. **Backend** streams each chunk to frontend via SSE format.
6. **Frontend** processes SSE stream with EventSource:
   - Shows "Nimbus is typing..." indicator when stream starts
   - Builds message content character-by-character in real-time
   - Updates UI immediately for responsive user experience
7. **Backend** saves complete response to Supabase when streaming ends.
8. **Other users** see the final message via Supabase Realtime subscriptions.

### **Architecture Benefits**
- **True streaming UX**: Character-by-character display as LLM generates
- **Real-time for all users**: Other participants see typing indicators and final messages
- **Reliable delivery**: SSE provides automatic reconnection and proper error handling
- **Scalable**: No database polling or rapid updates required

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
- Space settings panel for owners with temperature control
- Comprehensive RLS policies and security
- Database schema with proper relationships
- Basic LLM proxy implementation (non-streaming)

### 🔄 In Progress
- **SSE Streaming Implementation** for real-time LLM responses
- Character-by-character response display
- Enhanced typing indicators for streaming

### 📋 Remaining MVP Features
- Complete SSE streaming architecture (see todo list below)
- Docker deployment configuration
- Production environment setup
- Additional LLM provider integrations (Gemini, Deepseek)

---

## 📋 SSE Streaming Implementation Todo List

### 🔄 Current Sprint: Server-Sent Events Architecture

**Priority: HIGH** - Size: M (Medium, ~1-2 hours)

- [ ] **Backend SSE Implementation** (`backend/index.js`)
  - [ ] Replace current streaming logic with proper SSE headers
  - [ ] Format streaming chunks as SSE events (`data: {chunk}\n\n`)
  - [ ] Handle connection cleanup and error states
  - [ ] Save complete message to database only when streaming ends

- [ ] **Frontend SSE Handler** (`frontend/src/components/Chat.tsx`)
  - [ ] Replace fetch with EventSource for `/api/llm` endpoint
  - [ ] Implement message building from streaming chunks
  - [ ] Add real-time character-by-character UI updates
  - [ ] Handle EventSource connection states and errors

- [ ] **Enhanced Typing Indicators**
  - [ ] Show typing indicator when SSE stream starts
  - [ ] Hide typing indicator when stream completes
  - [ ] Ensure other users see typing status via real-time

- [ ] **Testing & Validation**
  - [ ] Test streaming with different message lengths
  - [ ] Test multiple concurrent users seeing streams
  - [ ] Test error handling and connection recovery
  - [ ] Test temperature control integration

### 🎯 Success Criteria
- Nimbus responses appear character-by-character as they're generated
- All users in space see real-time streaming simultaneously
- Typing indicators work correctly for streaming state
- No focus/defocus required to see responses
- Graceful error handling and connection recovery

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