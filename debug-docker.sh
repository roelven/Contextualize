#!/bin/bash

echo "🔍 Docker debugging information..."

echo "📋 Running containers:"
docker ps

echo ""
echo "📝 Frontend container logs:"
docker-compose logs frontend

echo ""
echo "📝 Backend container logs:"
docker-compose logs backend

echo ""
echo "🌐 Port bindings:"
docker port contextualize-frontend-1 2>/dev/null || echo "Frontend container not found"
docker port contextualize-backend-1 2>/dev/null || echo "Backend container not found"

echo ""
echo "🔗 Testing connectivity:"
echo "Frontend health check:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 || echo "Failed to connect to frontend"

echo ""
echo "Backend health check:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011/health || echo "Failed to connect to backend"