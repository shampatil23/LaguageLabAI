# Network Error Fix for Vercel Deployment

## Root Cause
The API endpoints are failing on Vercel due to:
1. The root `/api` folder has thin wrapper files that import from `/app/api`
2. Dependencies are in `/app/node_modules` but Vercel serverless functions in `/api` cannot access them
3. Missing proper module resolution configuration

## Solution
We need to ensure the API functions can properly resolve and run on Vercel.

### Option 1: Move API functions to root (Recommended)
Move all actual API logic from `/app/api` to `/api` so Vercel can bundle them properly.

### Option 2: Configure Vercel to build from app directory
Adjust the build configuration so API functions are built with access to dependencies.

### Option 3: Duplicate dependencies
Install required dependencies at the root level (not ideal but quick fix).

## Implementation Steps
1. Update vercel.json to properly configure API routes
2. Ensure environment variables are set in Vercel dashboard
3. Add proper error handling in frontend API calls
4. Test each endpoint individually

## Environment Variables Required in Vercel
- GROQ_API_KEY
- NVIDIA_API_KEY (optional, fallback)
- OPENROUTER_API_KEY (optional, fallback)
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_GROQ_API_KEY (for client-side calls)
