# auth.md

Agent authentication discovery for [Wings](https://wings.nopejs.me).

## Audience

Wings is a first-party web journal for humans. There is **no** public agent registration API, OAuth Authorization Server, or OAuth Protected Resource on `wings.nopejs.me`.

## How humans sign in

1. Open [https://wings.nopejs.me/auth](https://wings.nopejs.me/auth).
2. Choose **Google OAuth** or **magic link** (email OTP).
3. Complete the PKCE callback at `/auth/callback`.

Authentication is provided by **Supabase Auth** on the project's `*.supabase.co` issuer — not by Wings-hosted `/.well-known/openid-configuration` or `/.well-known/oauth-authorization-server`.

## Agent registration

| Method | Supported |
|--------|-----------|
| Automated agent registration | No |
| Client credentials / machine tokens from Wings | No |
| Third-party OAuth resource server on this origin | No |

If you need programmatic access to user notes, that product API does not exist today. Use the web app as a signed-in human, or contact [mail@wings.nopejs.me](mailto:mail@wings.nopejs.me).

## Related discovery

- Product map for agents: [/llms.txt](https://wings.nopejs.me/llms.txt)
- API catalog (honest: no public API): [/.well-known/api-catalog](https://wings.nopejs.me/.well-known/api-catalog)
- Security contact: [/.well-known/security.txt](https://wings.nopejs.me/.well-known/security.txt)

## Deferred standards (intentionally not published)

Wings does **not** publish OAuth AS/PRM metadata, MCP Server Cards, A2A Agent Cards, or DNS-AID records on this domain. Fabricating those would mislead agents into broken auth flows. They will be added only when real endpoints ship.
