# SkillBridge AI

Working SIH26044 prototype for academia-industry skill mapping, internships, and placements.

## Deployment and data storage

The deployed frontend runs on Vercel. User accounts and application data are stored in Supabase, not in browser-only storage.

Before deploying a new Supabase project, run [`supabase-schema.sql`](supabase-schema.sql) once in that project's SQL Editor. The frontend project URL and publishable key live in `supabase-config.js`; this key is intended to be public. Never add a Supabase `service_role` key to this repository or to browser code.

## Run locally

1. Open a terminal in this folder.
2. Run `node server.js`.
3. Visit `http://localhost:3000`.

The included Node server is retained for local prototype work. The hosted application uses Supabase through `api-client.js`.

## Implemented foundation

- Password-hashed role-based accounts for students, institutes, and industry
- Persistent local database
- Authenticated profile API
- Industry opportunity creation API
- Student opportunity applications API
- Explainable skill-match scores based on profile skills, courses, and projects
