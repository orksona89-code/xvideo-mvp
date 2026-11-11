# XVideo MVP

A video-sharing MVP starter built with Next.js, TypeScript, and Supabase. The current interface uses non-adult demo videos only.

## Requirements
- Node.js 20.9+
- npm

## Run locally
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable/anon key.
3. Start the app: `npm run dev`
4. Open http://localhost:3000

## Included
- Responsive video discovery homepage
- Search and category filtering
- Demo video playback modal
- Supabase environment template

## Not enabled yet
- User authentication
- Upload/storage pipeline
- Likes and comments
- Moderation and reporting UI
- Cloudflare R2 delivery

Uploads should remain disabled until storage policies, moderation review, and reporting are implemented. Never commit real secrets or service-role keys.
