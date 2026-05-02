<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: BenchMarks

Before writing any code, read these files in order:

1. `docs/agent-handoff.md` — architecture decisions, known gotchas, patterns, Phase 2 roadmap
2. `docs/feature-status.md` — what is done, what is next
3. `docs/architecture.md` — full tech stack, data flow, file structure
4. `docs/database-schema.md` — tables, RLS policies, trigger

Key rules derived from these docs:
- Middleware is `proxy.ts` (not `middleware.ts`) — Next.js 16 breaking change
- Always use `supabase.auth.getUser()`, never `getSession()` in server context
- Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`)
- Ask for options + recommendation before implementing non-trivial features
- Commit after every completed feature slice
