# Automate Live Cloudflare Workers Deployment via GitHub Actions on `main` While Preserving Primary `gh` Account

Status: accepted

We decided to automate testing, OpenNext Cloudflare builds, live deployment to `tollyanalysis.com`, and IndexNow search submission using a **GitHub Actions CI/CD workflow** (`.github/workflows/deploy.yml`) triggered on pushes to the canonical `main` branch (and `workflow_dispatch`), after merging upstream's 25 new commits from `origin/claude/exciting-ritchie-ydpvdr` with our Cloudflare/SEO branch. Multi-account GitHub CLI operations use `gh auth login` + `gh auth switch` so `vallabh2504` remains preserved as the active primary `gh` account on this machine after authenticating `Bharadhwajreddy` for repository push and secret configuration.

## Considered Options

- **GitHub Actions CI/CD (`.github/workflows/deploy.yml` with `cloudflare/wrangler-action@v4`) on `main` (Chosen)**: Runs deterministic quality gates (`npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` in `demo` mode), builds the Linux OpenNext Cloudflare bundle (`npx opennextjs-cloudflare build` with `NEXT_PUBLIC_DATA_MODE: "real"`), deploys via `cloudflare/wrangler-action@v4` with pinned `wranglerVersion: "4.164.0"` using least-privilege GitHub Secrets (`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`), and pings IndexNow automatically on deploy. Aligns directly with upstream's existing `.github/workflows/ci.yml` (`branches: [main]`).
- **Cloudflare Workers Builds (Native Git Integration)**: Connects Cloudflare's GitHub App directly inside the Cloudflare Dashboard without storing API tokens in GitHub Secrets, but gives less pre-deploy test/Playwright control and requires manual dashboard OAuth linking instead of version-controlled CI/CD workflow checks.
- **Watching `claude/exciting-ritchie-ydpvdr` directly vs Creating `main`**: Watching `claude/exciting-ritchie-ydpvdr` would deploy unreviewed work-in-progress data edits immediately and conflict with `.github/workflows/ci.yml` (`branches: [main]`). Using `main` enforces clean promotion and CI parity.

## Consequences

- Upstream's 25 new commits (`6182d38..86edd79`, including `/releases`, `/directors`, `/director/[slug]`, `/careers`, `/contact`, and 15+ added South Indian heroes) are merged into local `main` cleanly alongside our Cloudflare Workers (`wrangler.jsonc`, `open-next.config.ts`) and SEO (`lib/seo.ts`, `app/sitemap.ts`, `msvalidate.01`, `IndexNow`) setup before pushing `origin/main`.
- New dynamic routes (`/director/[slug]`) export `generateStaticParams()`, and `app/sitemap.ts` + `lib/seo.ts` cover `/directors`, `/director/[slug]`, `/releases`, `/careers`, and `/contact` under the 10 ms Cloudflare Workers Free-tier CPU cap.
- Deployment relies on a scoped Cloudflare API token (`Workers Scripts: Edit`, `Account Settings: Read`, `User Details: Read`, `Zone: Read`, `Workers Routes: Edit`, `DNS: Edit`) stored in `Bharadhwajreddy/TollyAnalysis` GitHub Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`), pins `wranglerVersion: "4.164.0"` in `cloudflare/wrangler-action@v4` to match `package.json`, and switches local CLI credentials immediately back to `vallabh2504` (`gh auth switch -u vallabh2504`) once setup completes.
