# Vercel Deployment Fix Guide

## Issues Fixed

### 1. API Endpoint Configuration
**Problem**: API wrapper files in `/api` were importing from `/app/api` but couldn't resolve dependencies on Vercel.

**Solution**: Replaced wrapper files with standalone implementations:
- `/api/chat.ts` - Direct implementation for chat endpoint
- `/api/translate.ts` - Direct implementation for translation
- `/api/create-user.ts` - Direct implementation for user creation
- `/api/ai.ts` - Consolidated AI engine with all dependencies bundled

### 2. Vercel Configuration
**Problem**: Invalid rewrites configuration pointing to themselves.

**Solution**: Updated `vercel.json`:
- Removed circular rewrites
- Added proper functions configuration
- Improved CORS headers
- Proper SPA routing to index.html

### 3. TypeScript Configuration
**Problem**: Missing root-level tsconfig for API functions.

**Solution**: Created `tsconfig.json` at root level for proper module resolution.

### 4. Frontend API Configuration
**Problem**: No error handling or configuration for API endpoints.

**Solution**: Created `src/lib/apiConfig.ts` with:
- Centralized API endpoint configuration
- Better error handling
- Health check functionality

## Deployment Steps

### 1. Set Environment Variables in Vercel Dashboard

Go to your Vercel project settings → Environment Variables and add:

**Required:**
- `GROQ_API_KEY` - Your Groq API key (server-side)
- `VITE_GROQ_API_KEY` - Your Groq API key (client-side for direct calls)
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID

**Optional (fallback providers):**
- `NVIDIA_API_KEY` - NVIDIA API key
- `OPENROUTER_API_KEY` - OpenRouter API key

### 2. Deploy to Vercel

```bash
# From the LaguageLabAI directory
vercel --prod
```

Or push to your connected GitHub repository for automatic deployment.

### 3. Verify Deployment

After deployment, test each endpoint:

**Test Chat Endpoint:**
```bash
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

**Test Translate Endpoint:**
```bash
curl -X POST https://your-domain.vercel.app/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","targetLanguage":"es"}'
```

**Test AI Endpoint:**
```bash
curl -X POST https://your-domain.vercel.app/api/ai \
  -H "Content-Type: application/json" \
  -d '{"agent":"diagnostic-generate","payload":{}}'
```

## Common Issues & Solutions

### Issue: "GROQ_API_KEY is not configured"
**Solution**: Ensure environment variables are set in Vercel dashboard for Production environment.

### Issue: API returns 404
**Solution**: 
- Check that all API files are in the `/api` folder
- Verify vercel.json is in the root directory
- Redeploy after making changes

### Issue: CORS errors
**Solution**: The CORS headers are now properly configured in vercel.json and each API endpoint.

### Issue: Build fails
**Solution**: 
- Check that all dependencies are in `app/package.json`
- Verify tsconfig.json exists at root
- Check build logs in Vercel dashboard

## File Changes Summary

**Modified:**
- `vercel.json` - Updated configuration
- `api/chat.ts` - Replaced with full implementation
- `api/translate.ts` - Replaced with full implementation
- `api/create-user.ts` - Replaced with full implementation
- `api/ai.ts` - Created consolidated standalone version

**Created:**
- `tsconfig.json` - Root TypeScript configuration
- `app/src/lib/apiConfig.ts` - API configuration helper
- `DEPLOYMENT_FIX.md` - This guide
- `VERCEL_DEPLOYMENT_GUIDE.md` - Detailed deployment instructions

## Testing Checklist

- [ ] Environment variables set in Vercel
- [ ] Project deployed successfully
- [ ] Chat endpoint working (ConversationPractice page)
- [ ] Translate endpoint working (Dictionary page)
- [ ] Create user endpoint working (Admin pages)
- [ ] AI Learning engine working (AI Learning section)
- [ ] No CORS errors in browser console
- [ ] All pages load correctly

## Next Steps

1. Deploy to Vercel
2. Set all required environment variables
3. Test each feature:
   - Conversation Practice
   - Dictionary/Translation
   - AI Learning sections
   - User creation (admin features)
4. Monitor Vercel logs for any errors
5. Check browser console for client-side errors

## Support

If issues persist:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure API keys are valid and have proper permissions
