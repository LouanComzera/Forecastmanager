#!/bin/bash

# Kill background processes on exit
trap "kill 0" EXIT

echo "🚀 Starting Comzera Strategy Suite..."

# Start Backend
echo "📡 Starting .NET API..."
cd Comzera.StrategySuite.Api
dotnet run --urls "http://localhost:5000" &

# Start Frontend
echo "💻 Starting Next.js Web App..."
cd ../comzera-strategy-suite-web
export PATH="/opt/homebrew/bin:$PATH"
npm run dev &

# Keep script running
wait
