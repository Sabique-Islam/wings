# Security Policy

## Supported versions

Wings is under active development. Security fixes are applied to the default branch (`master`) and included in the next deployment to [wings.nopejs.me](https://wings.nopejs.me).

| Version | Supported |
|---------|-----------|
| `master` (latest) | Yes |
| Older commits / forks | Best effort |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you believe you have found a security issue in Wings:

1. **Email or DM the maintainer** via GitHub ([Sabique-Islam](https://github.com/Sabique-Islam)) with details, or use GitHub's [private vulnerability reporting](https://github.com/Sabique-Islam/wings/security/advisories/new) if enabled.
2. Include:
   - Description of the vulnerability and potential impact
   - Steps to reproduce (proof of concept if possible)
   - Affected URLs, components, or files if known
   - Your environment (browser, OS) if relevant
3. Allow reasonable time for investigation and remediation before public disclosure.

We aim to acknowledge reports within **72 hours** and provide a status update within **7 days**.

## What to report

Examples of in-scope issues:

- Authentication or session bypass
- Row Level Security (RLS) bypass exposing other users' entries
- Share token or collaboration permission escalation
- Server-side request forgery (SSRF) in edge functions
- Cross-site scripting (XSS) with realistic exploit path
- Injection in Supabase RPCs or edge functions
- Exposure of service-role keys or secrets in client bundles or public repos
- Data loss or corruption vulnerabilities in save/load paths

## Out of scope (generally)

- Missing security headers on third-party hosts outside project control
- Social engineering attacks
- Denial of service without demonstrated impact on user data
- Issues requiring physical access to a user's device
- Vulnerabilities in dependencies with no practical exploit in Wings (still welcome as low-severity reports)

## Safe harbor

We support good-faith security research. Do not:

- Access, modify, or delete data belonging to other users
- Disrupt production services (wings.nopejs.me, Supabase, collab hosts)
- Send spam or phishing through any Wings email or auth flows

Testing should use **your own** Supabase project and local/dev environments when possible.

## Secrets handling

- **Never** commit `.env`, API keys, service-role keys, or OAuth secrets.
- Client env vars must use the `VITE_` prefix only for **public** Supabase anon keys and URLs.
- Server secrets belong in Supabase edge function secrets or collab server env — see [LOCAL_SETUP.md](https://github.com/Sabique-Islam/wings/blob/master/.github/LOCAL_SETUP.md) and [.env.example](https://github.com/Sabique-Islam/wings/blob/master/.env.example).

If you accidentally commit a secret, rotate it immediately and notify the maintainer.

## Data incidents (user-visible)

If users report **missing or blank journal content** (not traditional CVE-style bugs), treat as urgent:

1. Do not ask users to retry saves that might overwrite content.
2. Follow the internal runbook: [wings-incident-response skill](https://github.com/Sabique-Islam/wings/blob/master/.cursor/skills/wings-incident-response/SKILL.md)
3. Use the [Data loss / missing content](https://github.com/Sabique-Islam/wings/issues/new?template=data_loss.yml) issue template for tracking.

These incidents may overlap with security but are handled with recovery-first procedures.

## Recognition

We appreciate responsible disclosure. With your permission, we will acknowledge researchers in release notes or security advisories.

## Related

- [CONTRIBUTING.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CODE_OF_CONDUCT.md)
- Supabase security: [https://supabase.com/docs/guides/platform/going-into-prod](https://supabase.com/docs/guides/platform/going-into-prod)
