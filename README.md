# AI Engineer Intern - Technical Assessment (Weather App)

Built by Rohan.

**Product Manager Accelerator:** Helping professionals transition into Product Management and land their dream jobs at top tech companies through a community-driven, mentorship-based program.

## Overview
This full-stack Weather Application provides users with real-time weather conditions, 5-day forecasts, history tracking, location saving, and AI-powered insights.

## Tech Stack
- **Frontend**: Next.js (App Router), Tailwind CSS, Lucide React, TypeScript
- **Backend**: FastAPI, Python 3.13, PostgreSQL, SQLAlchemy, Alembic
- **Integrations**: 
  - OpenWeather API (One Call 3.0, Geocoding)
  - Google Maps Places API (Nearby Search)
  - Mapillary API (Street imagery)
  - DeepSeek API (Weather Q&A)
  - Gemini/Nanobanana (AI generated Clipart)

## Features
- **Search Weather**: By city, ZIP code, coordinates, or browser geolocation.
- **5-Day Forecast**: View highs, lows, conditions, and precipitation chances.
- **Weather History**: Save weather reports for date ranges. Ask AI questions about historical weather. Export records to CSV or PDF.
- **Saved Locations**: Build a library of locations with custom editable tags. Explore nearby restaurants and hotels.
- **Responsive UI**: Built for desktop, tablet, and mobile with glassmorphic styling and dynamic backgrounds based on the time and weather.
- **Error Handling**: Graceful handling of location not found, API failures, geolocation denials, and invalid dates.

## Setup Instructions

### Backend Setup
1. `cd backend`
2. Install dependencies: `pip install -r requirements.txt` (or via `uv`)
3. Create `.env` based on `.env.example` and add your API keys (OpenWeather, Google Maps, DeepSeek, Gemini) and `DATABASE_URL`.
4. Run migrations: `alembic upgrade head`
5. Start server: `fastapi dev app/main.py` (Runs on `http://localhost:8000`)

### Frontend Setup
1. `cd frontend`
2. Install dependencies: `npm install`
3. Create `.env.local` and add `NEXT_PUBLIC_API_URL=http://localhost:8000`
4. Start server: `npm run dev` (Runs on `http://localhost:3000`)

## Demo Video
*(Please record a 1-2 minute demo video showing CRUD, exports, AI features, and an error case, then paste the URL here)*
