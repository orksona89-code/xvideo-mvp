# XVideo MVP

A Next.js starter for a general-audience video-sharing prototype. The sample library uses non-explicit demo content. This is a front-end MVP, not a production-ready user-upload platform.

## Requirements
- Node.js 20.9+
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Current features
- Dark responsive homepage and video grid
- Search by title, creator, or category
- Video detail/player page
- Upload form UI (not connected to a storage backend)
- Account placeholder (authentication not connected)
- Demo data in `lib/videos.ts`

## Important limitations
- Video cards and metadata are hard-coded demo data.
- The upload page does not send files to a server.
- Login, database, comments, likes, admin review, and ads are not implemented.
- Demo MP4 URL is a generic sample clip; replace it with media you own or are licensed to distribute.
- This project is intended for lawful, non-explicit test content until legal and provider-policy reviews are completed.

## Recommended next implementation sequence
1. Create a PostgreSQL database and schema for users, videos, categories, reports, and moderation decisions.
2. Add authentication and role-based access (user, moderator, admin).
3. Build a secure upload pipeline: signed upload URLs, file-size/type limits, malware scanning, transcoding, thumbnail generation, and private quarantine.
4. Keep uploads unpublished until human moderation and rights/consent checks are complete.
5. Add report, takedown, appeal, retention, and audit-log workflows.
6. Choose storage, CDN, payment, and advertising providers only after getting written confirmation that your content category and operating locations are allowed.
7. Add privacy, terms, copyright, consent, and age/access controls as required by qualified legal advice.

## Before production
Do not accept public uploads until moderation, rights/consent verification, abuse reporting, security, and provider approval are in place. Never allow illegal content or content involving minors.
