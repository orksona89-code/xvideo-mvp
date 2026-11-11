# XVideo MVP

A Next.js starter for a general-audience video-sharing prototype. The sample library uses non-explicit demo content. This is a front-end MVP, not a production-ready user-upload platform.

## Requirements
- Node.js 20.9+
- npm

## Configure Supabase
1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` to your Supabase project URL.
3. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to a publishable key from the Supabase dashboard. Never use a service-role or secret key in a `NEXT_PUBLIC_` variable.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev` and open http://localhost:3000.
6. For a hosted deployment, add both environment variables in the hosting provider's project settings, then redeploy. Configure the Supabase Auth Site URL and allowed redirect URLs to match your deployed website domain.

The Supabase client helpers use cookie-based sessions through `@supabase/ssr`. The root middleware refreshes sessions, and `lib/supabase/videos.ts` provides a server-side query that returns only rows with `status = 'approved'`. Existing database RLS policies remain the actual authorization boundary.

## Current features
- Dark responsive homepage and video grid
- Search by title, creator, or category
- Video detail/player modal
- Supabase browser and server client helpers
- Cookie-based Supabase Auth session refresh
- Server-side API endpoint for approved videos (`/api/videos`)
- Homepage loads approved videos from Supabase and shows a safe demo fallback when the feed is unavailable
- Account menu reflects the signed-in user and provides sign out
- Upload remains disabled

## Important limitations
- Supabase currently has no video rows, so the live feed will be empty until approved video records are added.
- Authentication and database features require the Supabase URL and publishable key to be configured locally or in the hosting provider's environment settings.
- A GitHub Actions workflow now regenerates the npm lockfile and runs a production build on pushes and pull requests. The build has not yet been confirmed successful.
- Video uploads are intentionally disabled. Do not enable uploads until secure storage, quarantine/review, moderation, and reporting/takedown flows are implemented.
- Cloudflare R2 is not configured.
- Demo media must be replaced only with media you own or are licensed to distribute.

## Recommended next implementation sequence
1. Verify the first hosted production build and configure deployment environment variables.
2. Add likes and comments with authenticated actions and RLS checks.
3. Build moderator review, reporting, takedown, appeal, and audit-log workflows.
4. Only then design a secure upload pipeline: signed upload URLs, file-size/type limits, malware scanning, transcoding, thumbnail generation, and private quarantine.
5. Choose storage and CDN providers only after verifying provider policies and operating-region requirements.
6. Add privacy, terms, copyright, consent, and age/access controls as required by qualified legal advice.

## Before production
Do not accept public uploads until moderation, rights/consent verification, abuse reporting, security, and provider approval are in place. Never allow illegal content or content involving minors.
