# CLAUDE.md – Multiplayer LLM Chat Application

## 🧭 Overview

A full-stack, multiplayer chat application where users can converse in real time and interact with an LLM (OpenAI, Gemini, Deepseek) as a participant. The system is built for fast, seamless UX, supports media uploads, and keeps LLM API keys secure via a minimal backend proxy.

---

## 🛠️ Tech Stack

- **Frontend:** React (Next.js), Supabase UI Library
- **Backend:** Minimal Node.js/Express or FastAPI (Python) server for LLM proxying and instruction configuration
- **Real-time/Data/Auth/Storage:** Supabase (DB, Realtime, Auth, Storage)
- **LLM Providers:** OpenAI, Gemini, Deepseek (configurable per instance)
- **Deployment:** Dockerized, frontend and backend deployable together or separately, works with custom domains and Cloudflare tunnels

---

## 🔑 Core Features

- **Multiplayer Chat:**  
  - Unique “spaces” accessible via URL, showing real-time conversation history.
  - Multiple users per space, all messages tagged by sender.
  - Users can be addressed when tagged, like "Hey @Barry!".
- **Authentication:**  
  - Off-the-shelf Supabase Auth (email/password, optional social login).
- **LLM Integration:**  
  - Proxy backend ensures API keys for all providers stay secret.
  - LLM can be addressed by @mention, or (configurable) chime in when relevant.
  - System prompt/instructions are configurable per space for refined behavior.
- **Media Support:**  
  - Users can upload images (client-side resizing), stored via Supabase Storage, referenced in messages.
- **Performance:**  
  - Instant chat updates via Supabase Realtime, and LLM replies streamed when possible for “instant” feel.

---

## 🗂️ Project Structure

```plaintext
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   ├── styles/
│   └── ...
├── backend/
│   ├── routes/
│   │   └── llm.js
│   ├── config/
│   └── ...
├── docker-compose.yml
├── supabase/
│   ├── migrations/
│   └── ...
├── README.md
└── .env
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
- When LLM is addressed or needs to chime in (per prompt/config):
    1. Frontend sends relevant context and config to `/api/llm` endpoint.
    2. Backend chooses the LLM provider based on config/env.
    3. Backend applies the per-space instructions/system prompt.
    4. Backend sends prompt + chat history to LLM provider.
    5. Backend receives response, posts as “AI user” in Supabase chat.
    6. Frontend gets update in real-time (Supabase Realtime).

---

## 🏗️ Configurable Instructions

- Each space stores a `system_prompt` (editable by owner/admin).
- Prompt is injected before each LLM call, allowing for custom personality, behavior, or rules per chat.
- Example: “You are a helpful assistant participating in a chat between several users. Respond conversationally, only when addressed by name.”

---

## 🚀 MVP Checklist

1. **Supabase setup** (DB: users, spaces, messages; Auth; Storage)
2. **Frontend**  
   - Auth  
   - Space creation/join by URL  
   - Real-time chat UI  
   - Image upload (resize & upload to Supabase Storage)  
3. **Backend**  
   - `/api/llm` endpoint for proxying to OpenAI, Gemini, Deepseek  
   - Configurable per-space instructions/system prompt
   - Posts AI responses to Supabase as system user  
4. **Deployment**  
   - Docker Compose for FE/BE
   - Custom domain, Cloudflare tunnel ready

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

---

## 🔗 References

- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Deepseek API Docs](https://platform.deepseek.com/docs/)

