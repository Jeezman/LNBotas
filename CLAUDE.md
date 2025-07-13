# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LN Markets Trading Dashboard is a full-stack Bitcoin derivatives trading application that integrates with the LN Markets platform. It provides real-time trading, portfolio management, and authentic Lightning Network deposit functionality.

## Architecture

### Frontend (React + TypeScript)
- **Location**: `client/src/`
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (client-side routing)
- **UI**: Radix UI + shadcn/ui components with Tailwind CSS
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Context-based auth with session storage

### Backend (Node.js + Express)
- **Location**: `server/`
- **Runtime**: Node.js with Express.js (TypeScript + ES modules)
- **Database**: PostgreSQL with Drizzle ORM
- **External API**: LN Markets integration via `@ln-markets/api`
- **Authentication**: bcrypt password hashing with 12 salt rounds

### Database Schema (`shared/schema.ts`)
- **users**: User credentials, API keys, account balances
- **trades**: Trading activity with comprehensive details
- **marketData**: Cached real-time market information
- **deposits**: Lightning Network deposit tracking

## Essential Commands

### Development
```bash
npm run dev          # Start development server (frontend + backend)
npm run build        # Build for production
npm start           # Start production server
npm run check       # TypeScript type checking
npm run db:push     # Push database schema changes
```

### Database Operations
The application uses Drizzle ORM with PostgreSQL. Database credentials are managed via `DATABASE_URL` environment variable.

## Key Integration Points

### LN Markets API Integration
- Service layer in `server/services/lnmarkets.ts`
- Supports futures and options trading
- Real Lightning Network deposit generation
- User credentials stored securely in database

### Authentication Flow
- Registration/login endpoints in `server/routes.ts`
- Protected routes using `ProtectedRoute` component
- Session-based authentication with automatic redirects
- User context available throughout the application

### Data Synchronization
- `/api/trades/sync` - Sync trades from LN Markets API
- `/api/deposits/sync` - Sync deposit history
- `/api/market/update` - Update market data
- All sync operations require valid user API credentials

## Development Notes

### Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - Environment mode (development/production)

### Port Configuration
- Application runs on port 5000 (not configurable)
- Serves both API and client in production

### Trading Operations
- All trading operations require user API credentials from LN Markets
- Trades are created locally first, then synchronized with LN Markets
- Support for futures (margin, leverage, stop-loss, take-profit) and options
- Real-time position management and P&L tracking

### Deposit System
- Authentic Lightning Network invoice generation via LN Markets
- Real-time deposit address generation using `{"amount": satoshis}` payload
- Status tracking: pending → confirmed/failed/expired
- Automatic synchronization with LN Markets deposit history

## Common Development Patterns

### API Error Handling
All API endpoints include comprehensive logging with `logRequest`, `logSuccess`, and `logError` functions for debugging.

### Database Queries
Use the storage layer (`server/storage.ts`) for all database operations. Direct database queries through Drizzle ORM are abstracted.

### Component Structure
UI components follow shadcn/ui patterns with Radix primitives. Custom components are in `client/src/components/` organized by feature.

### Type Safety
Shared types in `shared/schema.ts` with Zod validation schemas. TypeScript configuration includes strict mode and proper path resolution.