# MONETA

A personal finance workspace with transactions, budgets, goals, cards, regional currency formatting, and record recovery.

[Explore the public browser-local demo](https://moneta-public-demo.vercel.app).

## Local setup

Use Node.js 22.x (22.13 or newer) and npm 10.x.

```sh
npm ci
npm run team:seed
npm run team:dev
```

Open http://127.0.0.1:5187 and choose a fictional QA identity. Team mode uses synthetic records and in-memory database/file adapters. Restarting the server discards edits. The seed command preserves an existing seed file.

## Project structure

- `public/` contains the existing JavaScript workspace, styles and demo data.
- `app/` and `lib/vercel/` provide the native Next.js and Clerk/Neon/private Blob integration.
- `lib/`, `db/`, `drizzle/` and `worker/` contain shared services and the Sites/Cloudflare path.
- `drizzle-vercel/` contains the additive Postgres schema.
- `scripts/` contains build, local testing and explicit operator commands.
- `tests/` contains synthetic regression tests.

## Verification

```sh
npm test
npm run check
```

`npm run build` builds the separate Vinext/Sites target. `npm run build:vercel` builds native Next.js and requires your own isolated Clerk, Neon and private Blob configuration. Copy the placeholder-only `.env.example` to an ignored `.env.local` and configure your own services. `npm run dev:vercel` starts native Next.js at http://localhost:3000.

Production Clerk requires production keys and a domain you control. Production builds verify the database schema read-only. Review additive migrations before applying them. Provider verification and recovery scripts require explicit opt-in and dedicated synthetic fixtures.

## License status

An application-wide redistribution license has not been selected. Public source visibility does not grant an MIT or other open-source license. Third-party components retain their own licenses. See THIRD_PARTY_NOTICES.md, LICENSE_AUDIT.md and audit/license-evidence/ for the existing notices and unresolved review items.
