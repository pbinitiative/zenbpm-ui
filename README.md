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
