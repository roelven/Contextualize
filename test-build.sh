#!/bin/bash

echo "🔄 Testing frontend build..."

cd frontend

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi