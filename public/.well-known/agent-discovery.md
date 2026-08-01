# Agent discovery status for Wings

Honest inventory of discovery standards on `wings.nopejs.me`.

## Published

- Link headers on `/` (RFC 8288)
- Content Signals in `/robots.txt`
- `/.well-known/api-catalog` (RFC 9727) — documents that there is no public HTTP API
- `/openapi.json` — empty paths, same honesty
- `/auth.md` — human auth via Supabase; no agent registration
- `/.well-known/agent-skills/index.json` + product skills
- `/llms.txt`, `/llms-full.txt`, markdown mirrors + `Accept: text/markdown` negotiation (Vercel Edge middleware)
- WebMCP tools on the marketing homepage
- `/.well-known/security.txt`

## Deferred (do not fabricate)

These will ship only when real endpoints exist:

- DNS-AID (`_agents` SVCB/HTTPS + DNSSEC)
- `/.well-known/openid-configuration` / `oauth-authorization-server` on Wings (auth is Supabase)
- `/.well-known/oauth-protected-resource`
- MCP Server Card (SEP-1649)
- A2A Agent Card
- Commerce protocols (x402, UCP, ACP, AP2)

Missing deferred paths return **404**, not soft-404 HTML.
