---
description: Core project context — what this project is, tech stack, architecture rules, and what not to touch
---
```md
# Project Context

## Status & Living Document Notice

This document was drafted **before development began**, based on pre-development
research and design decisions. It represents the best thinking available at that
point in time — not a final specification.

During development, the AI agent is expected to:

- Critically evaluate whether the decisions in this document are still accurate,
  optimal, and current.
- Proactively flag any section that appears outdated, suboptimal, technically
  problematic, or in conflict with better available options as of the current date.
- Suggest concrete alternatives when a documented decision should be reconsidered.
- Never blindly follow this document if doing so would lead to a worse outcome.

When the agent identifies such a case, it should say so explicitly before
proceeding — e.g.: *"The document recommends X, but as of 2026 Y is a better
choice because… — do you want to proceed with Y instead?"*

The developer makes the final call. Once a decision is revised, update this file.

***

## What This Is

AI-assisted flashcard PWA for learning English vocabulary — functionally similar to
Mochi Cards. No multi-user accounts. Cards belong to one user on one instance.

On card creation the server automatically:
1. Calls an LLM → generates a dictionary entry (transcription + 2–4 popular meanings) and one AI example sentence.
2. Calls a TTS service → generates a British-English pronunciation audio file,
   stores it on the server, and attaches the URL to the card.

***

## Architecture Overview

    Browser (Vue 3 PWA)
      └─ fetch() API calls
            │
            ▼
      Server (Node.js / Hono)
      ├─ GET/POST/PUT/DELETE /api/cards   → CRUD on cards
      ├─ GET/POST            /api/decks   → CRUD on decks
      ├─ GET/POST            /api/tags    → CRUD on tags
      ├─ POST /api/generate-card-content      → calls LLM, returns { dictionary, aiExample }
      ├─ POST /api/generate-audio         → calls TTS, saves .mp3, returns { audioUrl }
      └─ static serving of saved audio files
            │
            ├─ SQLite (via better-sqlite3 + Drizzle ORM)
            │   cards / decks / tags tables
            │
            ▼
      External services (API keys live on server only, never in browser)
      ├─ LLM  : Gemini / Claude / OpenAI (configurable via env)
      └─ TTS  : Google Cloud TTS Neural2 en-GB  (primary, free tier)
                Azure Neural en-GB-RyanNeural    (fallback)

The frontend has NO TTS, AI, or storage modules — it only calls its own backend endpoints.
All card data lives in SQLite on the server; accessible from any device on the same instance.
Audio files are stored on the server filesystem (or object storage).

***

## Tech Stack

| Concern          | Choice                                             |
|------------------|----------------------------------------------------|
| Frontend         | Vue 3 (Composition API, SFCs)                      |
| Build / Dev      | Vite                                               |
| Tests            | Vitest (integrated with Vite config)               |
| Package manager  | pnpm — mandatory                                   |
| Server storage   | SQLite via better-sqlite3 + Drizzle ORM            |
| PWA              | Service Worker + Web App Manifest                  |
| Backend          | Node.js + Hono + @hono/node-server                 |
| LLM              | REST → Gemini / Claude / OpenAI (env-configurable) |
| TTS              | Google Cloud TTS Neural2 en-GB (primary)           |
| Language         | TypeScript                                         |

***

## Quality & Cost Constraints

All AI and TTS solutions MUST be:

- Free — free tiers are acceptable; paid plans are not required.
  - Google Cloud TTS: 1M Neural2 chars/month free.
  - Gemini Flash: generous free tier for text generation.
- High quality and current as of 2026.
- British English pronunciation — use en-GB voices only.
  Default voice: Google Cloud TTS Neural2 en-GB-Neural2-B.
  Output must sound natural, not robotic.

When the free quota is exhausted, the app must degrade gracefully:
show a clear message, do not crash, do not silently skip audio.

***

## Project Structure

    src/                          # Frontend (Vue 3)
      components/                 # Reusable UI: Button, Modal, Sidebar,
      │                           #   CardGrid, CardTable, DeckItem, TagItem…
      views/                      # Route-level: Inbox, Deck, Tag, Settings
      stores/                     # Pinia stores (cards, decks, tags, ui) — client cache
      api/                        # Thin fetch wrappers → backend endpoints
      styles/
      main.ts
      App.vue

    server/                       # Backend (Node.js)
      db/
        schema.ts                 # Drizzle table definitions (cards, decks, tags)
        index.ts                  # DB connection (better-sqlite3 + Drizzle)
        seed.ts                   # Dev fixtures inserted into SQLite
      routes/
        cards.ts                  # GET/POST/PUT/DELETE /api/cards
        decks.ts                  # GET/POST /api/decks
        tags.ts                   # GET /api/tags
        generate-card-content.ts
        generate-audio.ts
      services/
        llm.ts                    # LLM client (provider-agnostic)
        tts.ts                    # TTS client (Google Cloud TTS)
      storage/
        audioStore.ts             # Save/serve audio files
      index.ts

    public/
      manifest.webmanifest
      icons/

    vite.config.ts
    rules/
      project-context.md

***

## Application Structure & Features

### Left Navigation (Mochi-style)

Three top-level sections with nested items and collapsible tree:

    Inbox            ← review queue (due cards across all decks)
    Decks
      └─ My Deck
           └─ Sub-deck
    Tags
      └─ grammar
      └─ phrasal-verbs
           └─ motion

Tags are visible as a flat/tree list in the sidebar with card counts.

### Deck View

- Filter bar (by tag, due status, text search).
- Two display modes: Grid and Table. Switchable via toolbar toggle.
  Architecture must allow adding more view types later without major refactor.
- Sorting in table view (word, created date, due date, interval).

### Inbox (Review Session)

Mechanics identical to Mochi Cards:
- Shows all cards due today across all decks.
- One card at a time: front shown → user recalls → reveals back.
- Two response buttons: Remember / Forget.

### Scheduling Algorithm (Mochi default)

Implements the exact Mochi algorithm:

- newInterval = currentInterval × multiplier
  - Remember multiplier: 1.8 (default, user-configurable)
  - Forget multiplier:   0.5 (default, user-configurable)
- Max interval: 365 days (configurable)
- Fuzzing: enabled by default — adds a small random offset to due dates
  to prevent cards from clustering on the same day.

The scheduling config must be user-editable in a Settings screen.
Architecture must allow adding FSRS (DSR model) as a second algorithm option
in the future without rewriting the review session UI.

### Tagging

- Cards can have multiple tags.
- Tags support hierarchy with / separator (e.g. grammar/tense/past).
- Tag tree visible in left navigation; clicking a tag filters the card view
  to that tag and its children.

### Card Creation

The user fills in:
- **Word** (required)
- **Translation / Definition** (required — their own translation or meaning)
- **Examples** (optional — their own example sentences, one per line)
- **Tags** (optional — hierarchical, `/`-separated)

On submit the frontend:
1. Calls `POST /api/generate-card-content` and `POST /api/generate-audio` **in parallel**.
   - `generate-card-content` returns `{ dictionary: { transcription, meanings }, aiExample }`.
   - `generate-audio` returns `{ audioUrl }` or 503 (degraded gracefully).
2. Calls `POST /api/cards` with the full payload (user fields + AI fields merged) →
   server inserts the row into SQLite and returns the saved card.
3. Pinia store is updated with the returned card (client cache).
4. User-provided fields (`definition`, `examples`) are **never overwritten** by AI output.

### Card Data Model

| Field | Source | User-editable |
|-------|--------|---------------|
| `word` | User | Yes |
| `definition` | User (translation) | Yes |
| `examples` | User (own sentences) | Yes |
| `dictionary` | LLM (`{ transcription: string; meanings: string[] }`) | No |
| `aiExample` | LLM (one sentence) | No |
| `audioUrl` | TTS | No |
| `tags` | User | Yes |
| `interval`, `dueDate` | Scheduling algorithm | No |

### Tags (future)

Tags will use a combobox with autocomplete: typing filters existing tags, selecting
confirms, and entering a non-existing name creates it. Hierarchy via `/` is already
supported in the data model. Combobox UI is planned for a future release.

### Import / Export

Planned for a future release. Design the card data model with portability in mind
(clean JSON schema) from the start. Do not implement now.

***

## Mandatory Rules

### Package manager
- Always use pnpm. Never npm, yarn, or bun.
- Enforce with "packageManager": "pnpm@x.x.x" in package.json.

### Versions
- Use latest stable versions of all packages at the time of installation.

### Adding / updating dependencies
- Before adding or upgrading any dependency, check for peer-dependency conflicts.
- If a conflict exists — stop, report it explicitly (package, version ranges,
  proposed resolution) — do not silently accept warnings or proceed without
  reporting.

### Commands

    pnpm dev        # Vite dev server (frontend)
    pnpm build      # Vite production build
    pnpm preview    # Vite preview server
    pnpm test       # Vitest watch
    pnpm test:run   # Vitest single run (CI)

### Testing
- Run tests after every non-trivial change. No exceptions.
- Use Vitest with jsdom or happy-dom for component tests.
- Share Vite config with Vitest via the test block in vite.config.ts.
- On failure: report which tests failed, the error, and the fix before moving on.

### Vite is the only build tool
No parallel bundlers. Vite handles dev, build, and preview.

***

## context7 MCP

- Use context7 MCP to resolve library documentation and API references.
- Query context7 before guessing at library APIs or version-specific behavior.
- Keep rules/project-context.md in the active MCP context for every session.
```