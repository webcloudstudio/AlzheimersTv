# Senior.Tv

Streaming TV guide for seniors — curates top shows with direct watch links across 16 streaming services.

## Project Overview
Two-component project: `downloader/` is a Node/TypeScript data pipeline that maintains a SQLite database of curated shows (TMDB metadata + Watchmode/MOTN stream URLs), then generates `index.html`. `webserver/` is an Express 4 + TypeScript SPA that serves the guide on port 3000. The webserver reads the DB produced by the downloader read-only.

## Architecture
- `downloader/` — data pipeline; SQLite (better-sqlite3), TMDB/Watchmode/MOTN enrichment, HTML generator. See `downloader/CLAUDE.md`.
- `webserver/` — Express 4, serves `/api/shows`, `/api/services`, SPA shell. Vanilla JS ES Modules client. See `webserver/CLAUDE.md`.
- Shared DB: `downloader/alzheimerstv.db` (created by downloader, read-only from webserver)

## Dev Commands
```bash
# Start web server (development)
cd webserver && npm run dev

# Run daily data pipeline
cd downloader && npm run pipeline

# First-time setup
cd downloader && npm run init && npm run bulk && npm run seed && npm run pipeline
```

## Service Endpoints
- Local: http://localhost:3000

## Bookmarks
### APIs
- [TMDB API](https://www.themoviedb.org/settings/api)
- [Watchmode API](https://api.watchmode.com/)
- [Movie of the Night API](https://rapidapi.com/movie-of-the-night-movie-of-the-night-default/api/streaming-availability)
# CLAUDE_RULES_START

# DEFAULT DEVELOPMENT RULES

**Version:** 2026-03-16.1

Full specification: `Specifications/CLAUDE_RULES.md`. This condensed version covers agent behavior only.

---

## Git Workflow

1. Commit immediately after completing a task with no errors.
2. Commit messages: descriptive text, no "Claude"/"Anthropic"/"AI" mentions.
3. DO NOT push — local commits only.
4. NO co-authored-by lines.

Web server changes: print "No restart needed — browser refresh is enough." (templates/CSS/static only) or "Restart required — `./bin/start.sh`." (Python/JS server files).

---

## Project Layout

```
ProjectName/
  METADATA.md       Identity (name, port, status, stack, etc.)
  AGENTS.md         AI context: dev commands, endpoints, architecture
  CLAUDE.md         Contains only: @AGENTS.md
  .env.sample       Required env vars (committed)
  .env              Actual env vars (never committed)
  bin/              All executable scripts
    common.sh       Shared functions — sourced by all bash scripts
    common.py       Shared OperationContext — imported by Python scripts
  doc/              Generated documentation
  logs/             Log files (gitignored)
  data/             Persistent data
  tests/            Test suite
```

---

## Scripts (`bin/`)

All scripts live in `bin/` — bash (`.sh`) or Python (`.py`). The `# CommandCenter Operation` marker in the first 20 lines registers a script with the platform.

**Standard script names** (only create what the project needs):

| Script | Purpose |
|--------|---------|
| `bin/start.sh` | Start service — service projects only |
| `bin/stop.sh` | Stop service — service projects only |
| `bin/build.sh` | Build / compile / package |
| `bin/daily.sh` | Daily maintenance |
| `bin/weekly.sh` | Weekly maintenance |
| `bin/build_documentation.sh` | Generate doc/ output |
| `bin/deploy.sh` | Deploy to environment |

**Bash** — source `common.sh` then add functionality:

```bash
#!/bin/bash
# CommandCenter Operation
# Category: service
source "$(cd "$(dirname "$0")" && pwd)/common.sh"

# your start command — use $PORT for the service port
# e.g. Flask: export FLASK_DEBUG=1 && flask run --port "$PORT"
```

`common.sh` handles everything: `SCRIPT_NAME`, `PROJECT_DIR`, `cd`, `PROJECT_NAME`, `PORT`, venv activation, `.secrets`/`.env` loading, timestamped log file, SIGTERM trap, and the `[$PROJECT_NAME] Starting:` message. Use `$PORT` as the service port — never hardcode a port number. Override the trap after sourcing if the script needs custom cleanup.

**Python** — import `common.py` then add functionality:

```python
#!/usr/bin/env python3
# CommandCenter Operation
# Category: maintenance
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import op

def main(ctx):
    # ctx.project_name, ctx.port, ctx.logger available — use ctx.port as the service port
    pass

if __name__ == '__main__':
    op(__file__).run(main)
```

`op(__file__).run(main)` handles the same concerns as `common.sh`: path setup, METADATA.md parsing, env loading, logging, SIGTERM, and status messages.

Use Linux line endings (no `\r`). Run `chmod +x bin/*.sh`.

---

## METADATA.md

**Authoritative source for project identity.** Always read `name`, `display_name`, `short_description`, and `git_repo` from this file — never infer them from directory names. Present in every set-up project.

Key-value format (not YAML):

```
# AUTHORITATIVE PROJECT METADATA - THE FIELDS IN THIS FILE SHOULD BE CURRENT

name: MyProject                              # machine slug, matches directory name
display_name: My Project                     # human-readable name for UI/display
git_repo: https://github.com/org/MyProject   # full HTTPS URL, for links only
port: 8000                                   # omit if not a service
short_description: One sentence.             # shown in dashboards and indexes
health: /health                              # omit if not a service
status: PROTOTYPE                            # IDEA|PROTOTYPE|ACTIVE|PRODUCTION|ARCHIVED
stack: Python/Flask/SQLite                   # slash-separated, used by generate_prompt.sh
version: 2026-03-16.1                        # YYYY-MM-DD.N, increment on releases
updated: 20260316_120000                     # set automatically by platform scripts
```

`port`, `health`, `stack`, and `status` are platform fields — managed by GAME and platform scripts, not needed for day-to-day agent work. `git_repo` SSH remotes are normalised to HTTPS automatically.

---

## AGENTS.md Required Sections

```markdown
## Dev Commands
- Start: `./bin/start.sh`   # service projects only
- Stop: `./bin/stop.sh`     # service projects only
- Test: `./bin/test.sh`     # if tests exist

## Service Endpoints        # omit if not a service
- Local: http://localhost:PORT

## Bookmarks
- [Documentation](doc/index.html)
```

Only include commands and endpoints that actually exist for the project.

# CLAUDE_RULES_END
