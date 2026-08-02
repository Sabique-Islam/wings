<div align="center">
    <img src="public/wings-logo.png" alt="Wings" width="100"/>
</div>

---

<div align="center">
    <h1>Wings</h1>
    <p>Block editor for notes with nested pages, LaTeX math, Excalidraw drawings, and a BYOK AI panel.</p>
    <p>
        <a href="https://wings.nopejs.me"><img src="https://img.shields.io/website?url=https%3A%2F%2Fwings.nopejs.me&logo=vercel&logoColor=white&label=vercel" alt="Vercel deploy"/></a>
        <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React"/></a>
        <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript"/></a>
        <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite"/></a>
        <a href="https://supabase.com"><img src="https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white" alt="Supabase"/></a>
        <a href="https://tiptap.dev"><img src="https://img.shields.io/badge/TipTap-Editor-000" alt="TipTap"/></a>
        <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white" alt="Bun"/></a>
        <a href="https://github.com/Sabique-Islam/wings/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg" alt="License: AGPL-3.0"/></a>
    </p>
    <p>
        <a href="https://wings.nopejs.me">Live</a>
        · <a href="https://discord.gg/mJsCnBHr">Discord</a>
    </p>
</div>

---

<div align="center">
    <img src="history/assets/wings-hero.png" alt="Wings Banner" width="100%"/>
</div>

---

## Features

- Nested pages and a TipTap block editor with slash commands
- LaTeX math and Excalidraw drawings in the same note
- BYOK AI panel (⌘J) with page context; keys stay in the browser
- Public share links and email invites
- Markdown / JSON export and local draft cache
- Guards against empty overwrites of substantial notes

## History

![Notion workspace limit](history/assets/notion-limit.png)

I hit my Notion workspace limit in February 2026 and spun this up on Lovable. Intended just for myself with no future plans.

It grew anyway. Friends liked it. I still work on it occasionally, fixing bugs or adding features as requested or if I feel the lack of something.

Migrated from Lovable to a personal stack in July 2026.

---

## Development

```sh
cp .env.example .env   # fill Supabase and related keys
npm install --legacy-peer-deps
npm run dev
```

CI and some scripts use [Bun](https://bun.sh) (`bun run test:ci`). Local day-to-day works with npm.

More setup: [.github/LOCAL_SETUP.md](.github/LOCAL_SETUP.md) · [CONTRIBUTING.md](.github/CONTRIBUTING.md)

---

## License

[GNU Affero General Public License v3.0 or later (AGPL-3.0)](https://github.com/Sabique-Islam/wings/blob/master/LICENSE). 

## Contributing

See [CONTRIBUTING.md](https://github.com/Sabique-Islam/wings/blob/master/.github/CONTRIBUTING.md).

---