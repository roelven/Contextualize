# Contextualize - Multiplayer LLM Chat Application

A real-time multiplayer chat application where users can converse and interact with AI assistants.

## 🚀 Quick Start with Docker

1. **Build and run with Docker:**
   ```bash
   chmod +x run-docker.sh
   ./run-docker.sh
   ```

2. **Or manually:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3010
   - Backend API: http://localhost:3011

## 🛠️ Development Setup

### Prerequisites
- Docker & Docker Compose
- Supabase project set up (see CLAUDE.md for setup instructions)

### Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual values:
   - Get Supabase URL and keys from your Supabase project settings
   - Add your OpenAI API key
   - Optionally add Gemini and Deepseek API keys

### Manual Development (without Docker)

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm start
```

## 📋 Features

- ✅ Real-time multiplayer chat
- ✅ Authentication (email/password)
- ✅ AI integration (mention @ai to trigger responses)
- ✅ Responsive UI with Tailwind CSS
- ✅ Supabase backend (database, auth, real-time)
- ✅ Docker deployment ready

## 🔧 Troubleshooting

### Docker Issues
```bash
# Clean rebuild
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up
```

### Database Setup
If you get database errors, ensure you've run the SQL setup from CLAUDE.md in your Supabase project.

## 📁 Project Structure
```
├── frontend/          # Next.js React app
├── backend/           # Express.js API server
├── docker-compose.yml # Docker configuration
└── CLAUDE.md          # Detailed project specification
```