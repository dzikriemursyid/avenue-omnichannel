# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start development server with Turbopack (fastest)
npm run dev

# Build production version
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Database Operations
```bash
# Apply database migrations
pnpm supabase db push

# Generate TypeScript types from database
pnpm supabase gen types typescript --local
```

Note: The project uses pnpm for package management but npm scripts are configured in package.json.

## Project Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router and React 19
- **UI**: Shadcn/ui components with Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with role-based access control
- **State Management**: Server Components + Server Actions + Custom Hooks
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with CSS custom properties for theming

### Role-Based Access Control
The application implements a hierarchical permission system:
- **Agent**: Basic dashboard access, conversations, personal analytics
- **Leader**: Team management, team analytics, campaign management
- **General Manager**: Cross-team management, global analytics
- **Admin**: Full system access, user management, settings

Permissions are managed in `lib/supabase/rbac.ts` with route-level access control.

### Directory Structure
```
app/                    # Next.js App Router
├── api/               # API routes (both REST and internal)
├── auth/              # Authentication pages
└── dashboard/         # Protected dashboard pages

lib/                   # Core utilities and configurations
├── actions/           # Server Actions (being migrated to hooks)
├── api/               # Client-side API functions
├── supabase/          # Supabase clients and utilities
├── middleware/        # API middleware (auth, rate limiting)
└── utils/             # Helper functions and validation

components/            # React components
├── ui/                # Shadcn/ui base components
├── dashboard/         # Dashboard-specific components
├── auth/              # Authentication components
└── shared/            # Reusable components

hooks/                 # Custom React hooks (modern approach)
```

### State Management Pattern
The codebase is actively migrating from Server Actions to custom hooks for better client-side state management:

- **Current**: Server Actions in `lib/actions/`
- **Target**: Custom hooks in `hooks/` directory
- **API Layer**: Standardized API functions in `lib/api/`

Always prefer using hooks over direct Server Actions for new features.

### Database Schema
Key tables:
- `profiles`: User profiles with role-based permissions
- `teams`: Team organization with leaders
- Database types are auto-generated in `lib/database.types.ts`

### Component Architecture
- **UI Components**: Located in `components/ui/` (Shadcn/ui)
- **Feature Components**: Located in `components/dashboard/`
- **Layouts**: App Router layouts with nested routing
- **Modals**: Centralized in `components/shared/modals/`

### API Structure
The application uses multiple API patterns:
- **App Router API**: Routes in `app/api/` for external integrations
- **Server Actions**: Legacy pattern in `lib/actions/`
- **Client API**: Modern pattern in `lib/api/` with hooks

### Development Notes
- TypeScript strict mode enabled
- ESLint configured but errors ignored during builds
- Build errors ignored for faster development (configured in next.config.mjs)
- Images are unoptimized for faster builds
- Path aliases: `@/*` maps to root directory

### Authentication Flow
1. Login via Supabase Auth
2. Profile setup for new users
3. Role-based dashboard access
4. Session management with middleware

### Performance Optimizations
- Turbopack for faster development builds
- Lazy loading hooks in `hooks/use-lazy-load.ts`
- Debounced callbacks in `hooks/use-debounce.ts`
- Optimized components with `-optimized` suffix

### Database Management
- Usually use remote Supabase for databases, simple back-end, and auth
- To add tables, policies, or columns, write SQL code in supabase/migrations folder for execution

## Project Guidelines

### Package Management
- Always use pnpm instead of npm