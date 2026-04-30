# SportControl SPA

React + Vite client for the SportControl API.

## Features
- CRUD for sports, teams, tournaments, players, and matches
- Match filtering via /matches/search
- Relationship views: sports to tournaments, teams to players, tournaments and teams (derived from matches)

## Configure API
The frontend reads the API base URL from .env:

VITE_API_BASE_URL=http://localhost:8080

Update it if your backend is running elsewhere.

## Run locally
npm install
npm run dev

## Build
npm run build

## Notes
- The backend should be running on http://localhost:8080.
- If the browser blocks requests, enable CORS on the backend or add a Vite proxy.
