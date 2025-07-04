# Avenue Omnichannel CRM

A modern, full-featured Customer Relationship Management system built with Next.js 14, Supabase, and TypeScript.

## Features

- 🔐 **Authentication & Authorization**: Secure login with role-based access control
- 👥 **User Management**: Complete user lifecycle management with roles and permissions
- 🏢 **Team Management**: Organize users into teams with leaders and metrics
- 💬 **Conversations**: Real-time messaging and customer communication
- 📊 **Analytics**: Performance metrics and insights at personal, team, and global levels
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔒 **Security**: Built-in security features including rate limiting and data validation

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Components**: Shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: Server Components + Server Actions
- **Forms**: React Hook Form, Zod validation
- **Deployment**: Vercel-ready

## Project Structure

```
avenue-omnichannel/
├── app/                    # Next.js app directory
│   ├── api/               # API routes (new)
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Dashboard pages
├── components/            # React components
│   ├── ui/               # UI components (Shadcn)
│   └── dashboard/        # Dashboard-specific components
├── lib/                   # Utilities and configurations
│   ├── actions/          # Server actions
│   ├── middleware/       # API middleware (new)
│   ├── supabase/         # Supabase clients and utilities
│   └── utils/            # Helper functions
├── docs/                  # Documentation
└── supabase/             # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Supabase account
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/avenue-omnichannel.git
cd avenue-omnichannel
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Update `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Run database migrations:

```bash
pnpm supabase db push
```

6. Start the development server:

```bash
pnpm dev
```

## User Roles

The system supports four user roles with different permissions:

1. **Admin**: Full system access, user management, settings
2. **General Manager**: Cross-team management, global analytics
3. **Team Leader**: Team management, team analytics, campaigns
4. **Agent**: Basic access, conversations, personal metrics

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint and Prettier configured
- Conventional commits recommended

### Testing

```bash
# Run tests (coming soon)
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm type-check
```

### Building

```bash
# Create production build
pnpm build

# Start production server
pnpm start
```

## Deployment

The application is optimized for deployment on Vercel:

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@avenuedevelopments.com or open an issue in the GitHub repository.
