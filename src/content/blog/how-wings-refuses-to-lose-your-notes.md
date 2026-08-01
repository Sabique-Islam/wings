---
slug: how-wings-refuses-to-lose-your-notes
title: How Wings refuses to lose your notes
description: Empty saves, empty drafts, and empty collab replays are blocked when they would wipe real content. Here is how Wings protects notes in plain language.
date: 2026-08-01
updated: 2026-08-01
tags:
  - data-safety
  - reliability
  - drafts
---

# How Wings refuses to lose your notes

Wings treats accidental empty overwrites as a product bug, not an edge case. Load, save, draft, and pending-write paths refuse to replace substantial notes with blank content. That policy is enforced in code and covered by regression tests.

## What goes wrong in typical editors?

A slow network, a half-mounted editor, or a race between local draft and server fetch can serialize an empty document. If that empty payload wins, a long note disappears. Users experience it as "my page went blank overnight."

Wings assumes that failure mode is always possible and designs guards against it.

## How does save protection work?

When the editor tries to persist content, Wings checks whether the outgoing payload is empty (or near-empty) while the server already holds a substantial note. In that case the empty save is blocked. The threshold is intentionally conservative: if the server copy is roughly 20 or more characters of real content, blank writes do not replace it.

Autosave and explicit save share that gate. The goal is simple: never let a glitch erase work that already survived a previous sync.

## What about drafts and reloads?

Offline draft cache keeps recent edits in the browser when sync is unavailable. On reload, an empty draft is not allowed to overwrite non-empty server content. After a fetch, pending writes are replayed only when they still make sense against the loaded document.

Collaboration follows the same spirit. Empty remote state should not silently win over a note that already has substance.

## How can I verify my own copy?

Export markdown or JSON from the app whenever a note matters. Keep that file offline. Wings also aims to make in-app restore safe: empty snapshots are rejected when restoring would clear the page.

If you ever suspect loss, email [mail@wings.nopejs.me](mailto:mail@wings.nopejs.me). Prefer exports first. Recovery is easier when you hold a local copy.

## FAQ

### Does this mean Wings never loses data?

No tool can promise that. Disk failure, account deletion, and provider outages still exist. The claim is narrower: Wings will not willingly persist empty content over a substantial saved note.

### Are share links indexed by search engines?

No. `/s/` share URLs are disallowed in robots.txt and marked noindex. They are for people you invite, not for SEO.

### Where is the policy described for engineers?

See the data-safety notes in the repo and the editor regression suite (`test:editor`). Guards live in load, save, draft, and pending-write helpers.
