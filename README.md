# XVideo MVP

A Next.js starter for a general-audience video-sharing prototype. The sample library uses non-explicit demo content. This is a front-end MVP, not a production-ready user-upload platform.

## Requirements
- Node.js 20.9+
- npm

## Configure Supabase
1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` to your Supabase project URL.
3. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to a publishable key from the Supabase dashboard. Never use a service-role or secret key in a `NEXT_PUBLIC_` variable.
4. Install the pinned dependencies with `npm install`. This also refreshes `package-lock.json` after the Supabase SDK packages were added.
5. Start the app with `npm run dev` and open http://localhost:3000.

The Supabase client helpers use cookie-based sessions through `@supabase/ssr`. The root middleware refreshes sessions, and `lib/supabase/videos.ts` provides a server-side query that returns only rows with `status = 'approved'`. Existing database RLS policies remain the actual authorization boundary.

## Current features
- Dark responsive homepage and video grid
- Search by title, creator, or category
- Video detail/player modal
- Supabase browser and server client helpers
- Cookie-based Supabase Auth session refresh
- Server-side approved-video query
- Upload remains disabled

## Important limitations
- The homepage still displays hard-coded non-adult demo videos; it has not yet been switched to database results.
- Authentication screens and signup/sign-in flows are not implemented yet.
- The Supabase URL and publishable key must be configured locally before using the Supabase helpers.
- The database schema exists, but this app's integration has not yet been run against a local build.
- Video uploads are intentionally disabled. Do not enable uploads until secure storage, quarantine/review, moderation, and reporting/takedown flows are implemented.
- Cloudflare R2 is not configured.
- Demo media must be replaced only with media you own or are licensed to distribute.

## Recommended next implementation sequence
1. Add sign-up, sign-in, sign-out, and an account UI using Supabase Auth.
2. Replace homepage demo data with the approved-video query and handle empty/loading/error states.
3. Add likes and comments with authenticated actions and RLS checks.
4. Build moderator review, reporting, takedown, appeal, and audit-log workflows.
5. Only then design a secure upload pipeline: signed upload URLs, file-size/type limits, malware scanning, transcoding, thumbnail generation, and private quarantine.
6. Choose storage and CDN providers only after verifying provider policies and operating-region requirements.
7. Add privacy, terms, copyright, consent, and age/access controls as required by qualified legal advice.

## Before production
Do not accept public uploads until moderation, rights/consent verification, abuse reporting, security, and provider approval are in place. Never allow illegal content or content involving minors.
