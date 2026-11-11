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

## Social sign-in (Google, Apple, Facebook)

The auth page includes Google, Apple, and Facebook buttons using Supabase OAuth. To make each provider work, enable it in Supabase Dashboard → Authentication → Providers and enter that provider's OAuth Client ID and Client Secret. The website code alone cannot create those third-party credentials.

In Supabase Dashboard → Authentication → URL Configuration:
- Set the Site URL to the deployed Vercel website URL.
- Add the deployed website URL followed by `/auth/callback` to the Redirect URLs allow list.
- For local testing, also add `http://localhost:3000/auth/callback`.

For each provider's developer console, add the Supabase provider callback URL shown on that provider's Supabase settings page as its authorized redirect URI. Google, Apple, and Facebook each require their own developer-app setup and credentials. Never place provider client secrets in Vercel `NEXT_PUBLIC_*` variables or in source code.

## Cloudflare R2 connection (private bucket)

The project includes a **server-side R2 connectivity check** at `/api/storage/r2/status`.
It requires a signed-in Supabase user and checks the configured private bucket with an S3
`HeadBucket` request. It does not reveal credentials, object names, or signed URLs.

Add these variables in Vercel → Project → Settings → Environment Variables, for the
Production and Preview environments you actually use:

- `R2_ACCOUNT_ID`: your Cloudflare account ID.
- `R2_BUCKET_NAME`: `xvideo-mvp`.
- `R2_ACCESS_KEY_ID`: the R2 token's Access Key ID.
- `R2_SECRET_ACCESS_KEY`: the R2 token's Secret Access Key.

The S3 endpoint is constructed server-side as
`https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, with region `auto`.
Keep every R2 credential server-only. Never use a `NEXT_PUBLIC_` prefix, commit
credentials, or send them through chat. After adding or changing environment variables,
redeploy the Vercel project.

The R2 bucket should remain private. Public user uploads are not implemented or enabled.
The upload UI and upload API must remain disabled until the storage provider's content
policy is confirmed for this site's intended use and the platform has age/identity,
consent/rights, moderation, reporting, and takedown controls. The R2 status endpoint
only verifies configuration and bucket access; it does not enable uploads.
