# ZenBPM UI

Web interface for ZenBPM - a Business Process Management engine.

## Getting Started

### Prerequisites

- Node.js 22.12+
- pnpm

### Installation

```bash
# Set correct Node.js version (requires nvm)
nvm use

# Install dependencies
pnpm install
```

### Environment Configuration

Copy the example environment file to create your local configuration:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` to customize your settings. The file contains detailed documentation for all available options including:

- **API Base URL** - Backend server location
- **API Strategy** - Choose between mocks, live backend, or mixed mode
- **Mock Delay** - Control response timing for development
- **Endpoint Exceptions** - Fine-grained control over which endpoints use mocks vs live

> **Note:** `.env.local` is gitignored and won't be committed. Each developer maintains their own local configuration.

### Development

```bash
# Start with mocks (default, no backend required)
pnpm dev

# Start with live backend
pnpm dev --mode live
```

### Build metadata

The application footer displays the UI build version and 12-character commit alongside the metadata returned by `GET /system/status`. The System Status page shows version, commit, branch, and build time for both ZenBPM and the UI. Frontend metadata is embedded when Vite starts or builds; the browser never invokes Git.

The UI version comes from `info.version` in `openapi/api.yaml`. By default, Vite reads the commit and branch from Git, shortens the commit to 12 characters, and records the current UTC time. Builds outside a Git checkout can supply the metadata explicitly:

```bash
VITE_BUILD_COMMIT=7af392e12345 \
VITE_BUILD_BRANCH=main \
VITE_BUILD_TIME=2026-08-10T08:00:00Z \
pnpm build
```

Docker accepts the same values as build arguments. The release workflow resolves and supplies all three automatically:

```bash
docker build \
  --build-arg VITE_BUILD_COMMIT=7af392e12345 \
  --build-arg VITE_BUILD_BRANCH=main \
  --build-arg VITE_BUILD_TIME=2026-08-10T08:00:00Z \
  -t zenbpm-ui .
```

## Quality Checks

Before submitting a PR, ensure all quality checks pass:

```bash
pnpm check
```

This runs:
- **ESLint** - Code style and best practices (zero warnings allowed)
- **TypeScript** - Type checking

PRs must pass `pnpm check` without any errors or warnings to be merged.

You can also run checks individually:

```bash
pnpm lint        # ESLint only
pnpm typecheck   # TypeScript only
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Material UI (MUI)
- TanStack Query
- MSW (Mock Service Worker) for API mocking
- bpmn-js for BPMN diagrams

---
