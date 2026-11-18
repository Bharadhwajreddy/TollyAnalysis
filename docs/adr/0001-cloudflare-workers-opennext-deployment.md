# Deploy Next.js 16 App Directly on Cloudflare Workers with OpenNext and Bundled Real-Data Snapshot

Status: accepted

We decided to host the Tollywood Analysis Next.js 16 (App Router) application directly on Cloudflare Workers using `@opennextjs/cloudflare` and Wrangler, bound directly to the `tollyanalysis.com` and `www.tollyanalysis.com` custom domains in the user's Cloudflare account, running in `NEXT_PUBLIC_DATA_MODE=real` (bundled Wikipedia + Wikidata snapshot) with search-engine indexing enabled.

## Considered Options

- **Cloudflare Workers via `@opennextjs/cloudflare` (Chosen)**: Compiles the Next.js 16 App Router application and API routes into a Cloudflare Worker bundle with Cloudflare Static Assets binding, allowing compute, static assets, SSL, and DNS for `tollyanalysis.com` to live under a single Cloudflare account without a second hosting vendor.
- **Vercel Compute + Cloudflare DNS**: Although the original repository README targeted Vercel and the local machine had an active Vercel CLI session, the operator explicitly selected unified Cloudflare hosting so both the domain and the runtime live on Cloudflare.
- **Live Postgres (`NEXT_PUBLIC_DATA_MODE=live`) vs Bundled Snapshot (`NEXT_PUBLIC_DATA_MODE=real`)**: We chose `NEXT_PUBLIC_DATA_MODE=real` so the production Worker serves the curated Wikipedia + Wikidata snapshot directly from the bundle without requiring external Postgres/Supabase credentials or incurring database latency at the edge.

## Consequences

- `db/client.ts` and any Node/Postgres modules must remain lazy or server-compatible under the Cloudflare Workers Node.js compatibility runtime (`nodejs_compat`), while `NEXT_PUBLIC_DATA_MODE=real` ensures public routes and APIs resolve from `lib/data/real/snapshot.json`.
- `next.config.ts` removes `X-Robots-Tag: noindex, nofollow` so `tollyanalysis.com` is indexable by search engines.
- The GitHub repository `Bharadhwajreddy/TollyAnalysis` promotes `claude/exciting-ritchie-ydpvdr` to a canonical `main` branch.
