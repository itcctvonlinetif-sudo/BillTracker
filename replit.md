# Overview

This is a **Bill Management Dashboard** (Indonesian-language UI) — a full-stack web application for tracking, managing, and getting reminders about bills and recurring payments. Users can create bills with due dates, categories, and amounts, view them on a calendar, track payment status (paid/unpaid), and receive visual/audio alerts for overdue or upcoming bills. The UI text is primarily in Bahasa Indonesia (e.g., "Tagihan", "Lunas", "Segera Bayar").

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with CSS variables for theming, using shadcn/ui component library (new-york style)
- **UI Components**: Full shadcn/ui suite installed in `client/src/components/ui/`, built on Radix UI primitives
- **Forms**: React Hook Form with Zod resolver for validation
- **Calendar**: react-day-picker for calendar views
- **Charts**: Recharts (referenced in requirements)
- **Fonts**: Plus Jakarta Sans (body), Outfit (display headings)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend is a single-page app with a Dashboard as the main (and only) page. It features a calendar view showing bill due dates with color-coded status indicators (red = urgent/overdue, yellow = approaching, green = safe, gray = paid), summary statistics cards, bill creation/editing forms via dialogs, and search functionality.

## Backend

- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production)
- **Framework**: Express 5
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Route Definitions**: Shared route definitions in `shared/routes.ts` with Zod schemas for input validation and response types — used by both client and server
- **Build**: Custom build script (`script/build.ts`) that uses Vite for client and esbuild for server, outputting to `dist/`
- **Dev Server**: Vite dev server middleware integrated into Express for HMR during development
- **Production**: Static file serving from `dist/public` with SPA fallback

## Shared Code (`shared/`)

- **`schema.ts`**: Drizzle ORM table definitions and Zod schemas (using `drizzle-zod`). Single table: `bills`
- **`routes.ts`**: API route contract definitions with paths, methods, Zod input/output schemas. Acts as a type-safe API contract between frontend and backend.

## Database

- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (via `node-postgres` / `pg` Pool)
- **Schema Management**: `drizzle-kit push` for schema synchronization (no migration files committed)
- **Connection**: Via `DATABASE_URL` environment variable (required)
- **Storage Layer**: `server/storage.ts` implements `IStorage` interface with `DatabaseStorage` class, abstracting all DB operations

### Database Schema

Single table `bills`:
| Column | Type | Notes |
|---|---|---|
| id | serial | Primary key |
| title | text | Bill name |
| amount | numeric | Bill amount (stored as string) |
| dueDate | timestamp | When the bill is due |
| status | text (enum) | "paid" or "unpaid" |
| category | text | Category label |
| isRecurring | boolean | Default false |
| recurringInterval | text | "monthly", "yearly", or "custom" |
| invoiceUrl | text | Optional URL for uploaded invoice |
| reminderSoundInterval | integer | Minutes between reminders, default 120 |
| lastEmailRemindedAt | timestamp | Last email reminder sent |
| createdAt | timestamp | Auto-set on creation |
| lastRemindedAt | timestamp | Last reminder timestamp |

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/bills` | List bills (optional `month` and `year` query params) |
| GET | `/api/bills/:id` | Get single bill |
| POST | `/api/bills` | Create new bill |
| PUT | `/api/bills/:id` | Update bill |
| DELETE | `/api/bills/:id` | Delete bill |
| GET | `/api/bills/unpaid` | Get unpaid bills (for reminders) |

## Key Design Decisions

1. **Shared type-safe API contract**: Route definitions with Zod schemas in `shared/routes.ts` ensure frontend and backend stay in sync. The client hooks validate API responses against these schemas.

2. **Storage interface pattern**: The `IStorage` interface in `server/storage.ts` decouples business logic from the database implementation, making it possible to swap storage backends.

3. **Indonesian localization**: The UI is built for Indonesian users — currency formatting uses IDR, date locale uses `id` from date-fns, and all UI labels are in Bahasa Indonesia.

4. **Status color system**: Bills get color-coded status based on days until due date: red (≤2 days or overdue), yellow (3-7 days), green (>7 days), gray (paid). Audio alerts trigger for red-status bills.

# External Dependencies

- **PostgreSQL**: Required database, connected via `DATABASE_URL` environment variable
- **Google Fonts**: Plus Jakarta Sans, Outfit, DM Sans, Fira Code, Geist Mono, Architects Daughter (loaded via CDN in HTML and CSS)
- **Pixabay Audio CDN**: Sound alert for overdue bills (`cdn.pixabay.com`)
- **Replit Plugins**: Development-only Vite plugins for error overlay, cartographer, and dev banner (`@replit/vite-plugin-*`)