# gbrain for Raycast

[한국어](README.ko.md)

A Raycast extension for [gbrain](https://github.com/garrytan/gbrain), the personal knowledge brain.
It drives your local `gbrain` CLI, so it works with both local brains and thin clients connected to a remote brain.
**No Raycast Pro required**: it uses neither Raycast AI nor MCP.

## Commands

| Command | What it does | gbrain call |
|---|---|---|
| **Query Brain** | Hybrid (semantic + keyword) search with snippet preview; ↵ opens the full page | `query --json`, `get --json` |
| **Search Brain** | Fast keyword search | `search --json` |
| **Think** | Multi-hop cited synthesis. ⌘S saves it as `synthesis/<date>-<slug>`; ⌘O opens a cited page | `think --json`, `put` |
| **Save URL to Brain** | Fetch a web page or PDF (or pick a local file), extract text, review title/slug/tags, save | `put --content-origin tool_output`, `tag` |
| **Capture Note** | Quick note into `inbox/` | `capture --stdin --json` |
| **Remember Fact** | Save a fact about an entity, with provenance | `remember --json` |
| **Recall Facts** | Find facts by question or entity | `recall --json` |
| **Recent Pages** | Recently updated pages, filterable by type | `list --json` |
| **Brain Status** | Which brain/client you're connected to; setup diagnostics | `whoami --json`, `engine status --json` |

## Save URL to Brain

- **HTML** → [Mozilla Readability](https://github.com/mozilla/readability) → Markdown ([Turndown](https://github.com/mixmark-io/turndown)); relative links become absolute.
- **PDF** → per-page text via [unpdf](https://github.com/unjs/unpdf) (pdf.js). Title comes from PDF metadata, or a heuristic on page 1 (editable before saving).
- **Local files**: PDF, HTML, Markdown, plain text.
- Saved pages get YAML frontmatter (`title`, `source_url`, `content_type`, `pages`, `fetched_at`, …) and are written with `content_origin: tool_output`, so gbrain treats them as untrusted external content.

**It fails loudly and saves nothing** when:

- the URL is invalid or not http(s)
- there's a network/DNS error or a 45s timeout
- the server returns non-2xx
- the body is empty or larger than 50MB
- the content type is binary/unsupported
- a "PDF" isn't actually a PDF (e.g. a login page)
- a PDF has no extractable text (scanned; needs OCR)
- the HTML yields fewer than 200 chars of article text (JS-rendered or login wall)

**It never overwrites.** If the slug already exists (including soft-deleted pages), the save is refused.

## Requirements

- macOS with [Raycast](https://raycast.com)
- [gbrain](https://github.com/garrytan/gbrain) installed and configured (`gbrain whoami` works in your terminal)
- [Bun](https://bun.sh) (gbrain runs on it), Node.js 22+ for development

## Install (from source)

```bash
git clone https://github.com/hmkim/gbrain-raycast.git && cd gbrain-raycast
npm install
npm run dev      # imports the extension into Raycast; stop with Ctrl+C when done
```

The extension stays in Raycast after you stop `npm run dev`.

## Configuration

Raycast does **not** load your shell profile. The extension therefore reads `PATH` and `GBRAIN_*` variables (e.g. `GBRAIN_HOME`)
from your login shell once and caches them. No other variables are forwarded. If you change `~/.zshrc`, run
**Brain Status → Reload Shell Environment**.

| Preference | Default | Notes |
|---|---|---|
| Language | English | English / 한국어 |
| GBRAIN_HOME | *(from login shell)* | Set explicitly to override |
| gbrain binary | `~/.bun/bin/gbrain` | |
| Extra PATH | `~/.bun/bin:/opt/homebrew/bin:/usr/local/bin` | Prepended to PATH; gbrain needs `bun` |
| Saved URL slug prefix | `web` | |
| Saved PDF slug prefix | `papers` | |

## Troubleshooting

- **"No brain configured. Run: gbrain init"**: the extension can't see your `GBRAIN_HOME`. Open **Brain Status**; if it shows unset, run *Reload Shell Environment* or set the preference. Don't run `gbrain init` unless you actually want a new brain.
- **`requires_local_engine`**: some gbrain commands (e.g. `brainstorm`, `call`) only run on the brain host, not on thin clients. This extension only uses commands that work on thin clients.
- **`insufficient_scope`**: your gbrain client lacks a scope (e.g. `write` for saving). Ask the brain operator to rescope it.

## Development

```bash
npm run dev        # live reload in Raycast
npm test           # offline tests for fetch/extract/fail paths (local HTTP server, generated PDFs)
npm run lint       # ESLint + Prettier (ray lint)
npm run typecheck
npm run build
```

Layout:

```
src/
  lib/gbrain.ts      CLI runner (env resolution, JSON parsing, structured errors) + typed wrappers
  lib/ingest.ts      URL/file fetch → HTML/PDF/text extraction → page markdown
  lib/i18n.ts        en/ko strings
  lib/slug.ts        slug + local-date helpers
  components/        PageDetail, SearchView
  *.tsx              one file per command
test/                node:test suites (bundled by scripts/test.mjs)
```

## License

MIT
