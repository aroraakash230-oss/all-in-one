# SkillBridge AI

Working SIH26044 prototype for academia-industry skill mapping, internships, and placements.

## Run locally

1. Open a terminal in this folder.
2. Run `node server.js`.
3. Visit `http://localhost:3000`.

The server uses only Node's built-in modules. It creates `data/skillbridge.json` on first run and persists accounts, opportunities, and applications there. Demo opportunity data is seeded automatically.

## Implemented foundation

- Password-hashed role-based accounts for students, institutes, and industry
- Persistent local database
- Authenticated profile API
- Industry opportunity creation API
- Student opportunity applications API
- Explainable skill-match scores based on profile skills, courses, and projects
