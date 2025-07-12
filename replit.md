# LN Markets Trading Dashboard

## Overview

This is a modern web application for Bitcoin derivatives trading through the LN Markets platform. The application provides a comprehensive trading dashboard with real-time market data, futures and options trading capabilities, portfolio management, and trade history tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

- **Demo Mode Removal**: Completely removed all demo mode functionality and sample data per user request with real LN Markets API credentials
- **User Registration System**: Added user registration system with dedicated registration page and backend user creation endpoint
- **Secure Authentication**: Implemented bcrypt password hashing with 12 salt rounds for secure user authentication
- **Login System**: Created comprehensive login/logout system with password verification and user session management
- **Dynamic User Management**: Updated all hooks and components to support dynamic user IDs instead of hard-coded demo user
- **Database Cleanup**: Removed demo user and sample market data from database initialization
- **Real API Integration**: Application now operates exclusively with authentic LN Markets API credentials
- **Navigation Structure**: Restructured application to maintain sidebar across all pages, making dashboard a layout wrapper that shows different content based on route
- **User Profile Integration**: Added comprehensive user profile page as subpage within dashboard layout, including API credentials management
- **Layout System**: All navigation items (Dashboard, User Profile, Futures, Options, History, Portfolio, Settings) now operate as subpages maintaining consistent sidebar navigation

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM (Database implementation active)
- **Database Provider**: PostgreSQL with connection pooling
- **API Pattern**: RESTful API with Express routes
- **LN Markets Integration**: Official @ln-markets/api package
- **Session Management**: In-memory sessions for development

### Key Components

#### Database Schema
The application uses three main database tables:
1. **Users**: Stores user credentials, API keys, and account balances
2. **Trades**: Records all trading activity with comprehensive trade details
3. **Market Data**: Caches real-time market information for BTC/USD

#### Trading System
- **LN Markets Integration**: Service layer for connecting to LN Markets API
- **Trade Types**: Supports both futures and options trading
- **Order Types**: Market and limit orders
- **Risk Management**: Built-in stop-loss and take-profit functionality

#### UI Components
- **Dashboard Layout**: Sidebar navigation with main content area
- **Trading Interface**: Real-time price charts, order forms, and position management
- **Market Overview**: Live market statistics and price information
- **Portfolio Management**: Balance tracking and P&L calculations

### Data Flow

1. **Market Data Updates**: Background processes fetch real-time data from LN Markets API
2. **User Authentication**: Session-based authentication with PostgreSQL storage
3. **Trade Execution**: Orders are validated client-side, sent to backend, then forwarded to LN Markets
4. **Real-time Updates**: Market data and positions are updated via periodic polling
5. **State Synchronization**: TanStack Query manages client-side caching and synchronization

### External Dependencies

#### Core Dependencies
- **LN Markets API**: External trading platform for Bitcoin derivatives
- **Neon Database**: Serverless PostgreSQL hosting
- **Radix UI**: Headless component library for accessibility
- **TanStack Query**: Server state management and caching

#### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Server-side bundling for production
- **Vite**: Frontend development server and build tool

### Deployment Strategy

#### Development Environment
- **Frontend**: Vite development server with HMR
- **Backend**: Express server with tsx for TypeScript execution
- **Database**: Local or cloud PostgreSQL instance

#### Production Build
- **Frontend**: Static assets built with Vite, served from `/dist/public`
- **Backend**: Bundled with ESBuild to single JavaScript file
- **Database**: Managed PostgreSQL instance with connection pooling

#### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- LN Markets API credentials via environment variables
- Session configuration for production security

The application follows a modern full-stack architecture with clear separation of concerns, type safety throughout, and production-ready deployment considerations. The integration with LN Markets allows for real Bitcoin derivatives trading while maintaining a clean, responsive user interface.