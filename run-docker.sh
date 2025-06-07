#!/bin/bash

echo "🐳 Building and running Contextualize with Docker..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📋 Please copy .env.example to .env and fill in your values:"
    echo "   cp .env.example .env"
    echo "   # Then edit .env with your Supabase and API keys"
    exit 1
fi

# Stop any existing containers
docker-compose down

# Build containers
echo "📦 Building containers..."
docker-compose build --no-cache

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d

echo "✅ Application started!"
echo "📱 Frontend: http://localhost:3010" 
echo "🔧 Backend API: http://localhost:3011"
echo ""

# Show logs
echo "📝 Container logs:"
docker-compose logs -f