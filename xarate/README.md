# Personal Expense Tracker

A Progressive Web App (PWA) for tracking personal expenses with offline-first capabilities and optional cloud sync.

## Features

- Offline-first expense tracking
- Cloud sync with Supabase (optional)
- Category management
- Budget tracking
- Recurring expenses
- Data export/import
- Multi-currency support

## Tech Stack

- React 18
- TypeScript (strict mode)
- Vite
- React Router
- Zustand (state management)
- Dexie.js (IndexedDB wrapper)
- Supabase (cloud sync)
- Tailwind CSS
- Workbox (PWA/Service Worker)

## Getting Started

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/     # React components
├── services/       # Business logic and API services
├── stores/         # Zustand state management
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```
