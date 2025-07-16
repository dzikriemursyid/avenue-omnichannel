# Avenue Omnichannel WhatsApp CRM

🚀 **Enterprise-grade WhatsApp Business API omnichannel system** with real-time messaging, comprehensive campaign management, and intelligent conversation handling.

![Next.js](https://img.shields.io/badge/Next.js-15.0-black)
![React](https://img.shields.io/badge/React-19.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-2.0-green)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0-cyan)

## 🎯 Overview

Avenue Omnichannel is a sophisticated customer relationship management platform built specifically for WhatsApp Business messaging. It provides enterprise-level features including real-time chat management, automated conversation handling, comprehensive campaign tools, and team collaboration capabilities.

### 🌟 Key Highlights

- **🔄 Real-time Messaging**: Live WhatsApp conversations with instant updates
- **⏰ 24-Hour Window Management**: Automatic compliance with WhatsApp Business API policies
- **📊 Campaign Management**: Bulk messaging with template support and analytics
- **👥 Role-Based Access Control**: Hierarchical permissions (Admin → General Manager → Leader → Agent)
- **📱 Media Support**: Images, videos, audio, documents with secure handling
- **🔐 Enterprise Security**: Multi-layer security with row-level access control

## 🏗️ System Architecture

### Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 15 + React 19 | Modern web framework with App Router |
| **UI Framework** | Shadcn/ui + Tailwind CSS | Component library and styling |
| **Database** | Supabase (PostgreSQL) | Real-time database with auth |
| **Messaging** | Twilio Programmable Messages | WhatsApp Business API integration |
| **Authentication** | Supabase Auth | User management and RBAC |
| **State Management** | Custom React Hooks | Modern async state handling |
| **Validation** | Zod + React Hook Form | Type-safe form validation |
| **Package Manager** | pnpm | Fast, efficient dependency management |

### Architecture Patterns

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Next.js App   │    │   Supabase      │
│   Business API  │◄───┤   (Frontend)    │◄───┤   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Twilio Webhooks │    │ Custom Hooks    │    │ Real-time DB    │
│ Media Handling  │    │ API Routes      │    │ RLS Policies    │
│ Message Queue   │    │ Server Actions  │    │ Database Funcs  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Features

### 💬 WhatsApp Integration

- **✅ Two-way Messaging**: Seamless inbound and outbound communication
- **✅ Media Messages**: Support for images, videos, audio, documents (20MB limit)
- **✅ Message Templates**: WhatsApp-approved template management
- **✅ Conversation Windows**: Automatic 24-hour window tracking and enforcement
- **✅ Contact Management**: Auto-creation and profile management
- **✅ Webhook Processing**: Robust Twilio webhook handling

### 🎯 Campaign Management

- **✅ Bulk Messaging**: Send messages to multiple contacts efficiently
- **✅ Template Variables**: Dynamic personalization with contact data
- **✅ Scheduling**: Immediate, scheduled, and recurring campaigns
- **✅ Target Audiences**: Contact group-based segmentation
- **✅ Analytics**: Delivery rates, open rates, engagement tracking
- **✅ Campaign Templates**: Reusable campaign configurations

### 🔄 Real-time Features

- **✅ Live Chat**: Instant message updates without page refresh
- **✅ Typing Indicators**: Visual feedback for user interactions
- **✅ Connection Status**: Real-time connection monitoring
- **✅ Conversation Updates**: Live status and window changes
- **✅ Team Notifications**: Real-time alerts and updates

### 👥 Team Management

- **✅ Hierarchical Roles**: 4-tier permission system
- **✅ Team Organization**: Leaders and team member management
- **✅ Performance Analytics**: Individual and team metrics
- **✅ Conversation Assignment**: Manual and automatic distribution
- **✅ Activity Tracking**: User action auditing

### 📊 Analytics & Reporting

- **✅ Conversation Metrics**: Response times, resolution rates
- **✅ Campaign Performance**: Delivery and engagement analytics
- **✅ Team Performance**: Individual and team statistics
- **✅ Real-time Dashboards**: Live performance monitoring
- **✅ Export Capabilities**: Data export for external analysis

## 📁 Project Structure

```
avenue-omnichannel/
├── 📱 app/                          # Next.js App Router
│   ├── 🔌 api/                     # API routes
│   │   ├── webhooks/twilio/        # WhatsApp webhook handlers
│   │   ├── conversations/          # Chat management APIs
│   │   ├── campaigns/              # Campaign management APIs
│   │   └── upload/                 # Media upload handling
│   ├── 🔐 auth/                    # Authentication pages
│   └── 📊 dashboard/               # Protected dashboard pages
├── 🧩 components/                   # React components
│   ├── ui/                         # Shadcn/ui base components
│   ├── dashboard/                  # Dashboard-specific components
│   ├── auth/                       # Authentication components
│   ├── chat/                       # Chat interface components
│   └── shared/                     # Reusable components
├── 🪝 hooks/                       # Custom React hooks
│   ├── use-chat.ts                 # Chat state management
│   ├── use-conversations.ts        # Conversation listing
│   ├── use-campaigns.ts            # Campaign management
│   └── use-realtime-*.ts           # Real-time subscriptions
├── 📚 lib/                         # Core utilities
│   ├── actions/                    # Server Actions (deprecated)
│   ├── api/                        # Client API functions
│   ├── supabase/                   # Database clients & utilities
│   ├── middleware/                 # API middleware
│   └── utils/                      # Helper functions
├── 🗄️ supabase/                    # Database management
│   ├── migrations/                 # Database migrations
│   ├── schema.sql                  # Current database schema
│   └── config.toml                 # Supabase configuration
└── 📖 docs/                        # Documentation
    ├── whatsapp-chat-implementation.md
    ├── whatsapp-conversation-window.md
    ├── cron-job-setup.md
    └── database-migration-best-practices.md
```

## ⚡ Quick Start

### Prerequisites

- **Node.js 18+** and **pnpm**
- **Supabase account** with project
- **Twilio account** with WhatsApp Business API access
- **Git** for version control

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/avenue-omnichannel.git
cd avenue-omnichannel
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Environment Setup**
```bash
cp .env.example .env.local
```

4. **Configure Environment Variables**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890

# Optional: Cron Job Security
CRON_SECRET=your-secure-cron-secret
```

5. **Database Setup**
```bash
# Initialize Supabase CLI (if needed)
supabase login
supabase link --project-ref your-project-ref

# Apply database schema
supabase db push
```

6. **Start Development Server**
```bash
pnpm dev
```

🎉 **Application running at** http://localhost:3000

## 🔧 Development

### Available Commands

```bash
# Development
pnpm dev              # Start development server with Turbopack
pnpm build            # Create production build
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database Management
supabase db reset     # Reset local database
supabase db diff      # Show schema differences
supabase db push      # Apply migrations to remote
supabase migration new <name>  # Create new migration

# Testing & Analysis
node scripts/test-conversation-window.js  # Test 24-hour window logic
```

### Development Workflow

1. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
   - Add components in appropriate directories
   - Create migrations for database changes
   - Update hooks for state management

3. **Test Locally**
```bash
pnpm dev
# Test functionality thoroughly
```

4. **Database Changes**
```bash
supabase migration new your_change_description
# Edit the migration file
supabase db push
```

5. **Commit & Deploy**
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

## 🛡️ Security & Authentication

### Role-Based Access Control (RBAC)

| Role | Permissions | Scope |
|------|-------------|-------|
| **Agent** | View conversations, send messages, personal analytics | Own assignments |
| **Leader** | Team management, team analytics, campaign creation | Team scope |
| **General Manager** | Cross-team visibility, global analytics | Multi-team |
| **Admin** | Full system access, user management, settings | System-wide |

### Security Features

- **🔐 Row Level Security (RLS)**: Database-level access control
- **🛡️ API Authentication**: Middleware-based route protection
- **📱 Phone Validation**: International format enforcement
- **🔒 Media Security**: Authenticated Twilio media access
- **⚡ Rate Limiting**: API abuse prevention
- **🔍 Input Validation**: Comprehensive Zod schemas

## 🗄️ Database Schema

### Core Tables

- **`profiles`**: User management with hierarchical roles
- **`teams`**: Team organization and leadership
- **`contacts`**: Customer contact information
- **`conversations`**: WhatsApp conversation threads with window tracking
- **`messages`**: Message storage with media support
- **`campaigns`**: Bulk messaging campaigns
- **`message_templates`**: WhatsApp-approved templates

### Key Features

- **Real-time Subscriptions**: Live updates via Supabase Realtime
- **24-Hour Window Tracking**: Automatic conversation window management
- **Media Storage**: Secure file handling with Supabase Storage
- **Campaign Analytics**: Comprehensive delivery and engagement tracking

## 📲 WhatsApp Integration

### Message Flow

```
Customer Message → Twilio Webhook → Database → Real-time UI Update
                                      ↓
Agent Response ← Twilio API ← Database ← User Interface
```

### Features

- **✅ Inbound Processing**: Automatic webhook handling
- **✅ Media Support**: Images, videos, audio, documents
- **✅ Template Messages**: WhatsApp-approved templates
- **✅ Conversation Windows**: 24-hour policy compliance
- **✅ Error Handling**: Comprehensive retry logic

### Webhook Setup

Configure in Twilio Console:
```
Webhook URL: https://your-domain.com/api/webhooks/twilio/incoming
HTTP Method: POST
```

## 🔄 Real-time Features

### Implementation

- **Supabase Realtime**: PostgreSQL change subscriptions
- **Custom Hooks**: Stable connection management
- **Event-driven Updates**: Optimistic UI with fallback sync
- **Connection Monitoring**: Automatic reconnection handling

### Available Subscriptions

```typescript
// Message updates
useRealtimeMessagesStable({ conversationId, onNewMessage, onMessageUpdate })

// Conversation updates  
useRealtimeConversations({ onConversationUpdate, onNewConversation })

// Typing indicators
useTypingIndicator(conversationId)
```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Import in Vercel**
   - Connect GitHub repository
   - Configure environment variables
   - Deploy

3. **Environment Variables**
   - Copy all variables from `.env.local`
   - Ensure Twilio webhook points to production URL

### Custom Deployment

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Production Considerations

- **🔧 Cron Jobs**: Set up auto-close conversations
- **📊 Monitoring**: Configure error tracking
- **🔒 Security**: Update webhook URLs and secrets
- **📈 Scaling**: Configure Supabase connection limits

## 📖 Documentation

### Available Guides

- **[WhatsApp Implementation](docs/whatsapp-chat-implementation.md)**: Complete integration guide
- **[Conversation Window](docs/whatsapp-conversation-window.md)**: 24-hour policy implementation
- **[Cron Job Setup](docs/cron-job-setup.md)**: Automated task scheduling
- **[Migration Best Practices](docs/database-migration-best-practices.md)**: Database evolution guide

### API Documentation

- **REST Endpoints**: `/api/conversations`, `/api/campaigns`, `/api/contacts`
- **Webhook Handlers**: `/api/webhooks/twilio/incoming`
- **Upload Endpoints**: `/api/upload/media`

## 🛠️ Production Setup

### 1. Cron Job Configuration

Set up automatic conversation closing:

```bash
# Add to crontab (every 15 minutes)
*/15 * * * * curl -X POST https://your-domain.com/api/conversations/auto-close
```

### 2. Monitoring

- **Application Logs**: Monitor API response times
- **Database Performance**: Track query performance
- **Real-time Connections**: Monitor Supabase real-time usage
- **WhatsApp Delivery**: Track message delivery rates

### 3. Scaling Considerations

- **Database Connections**: Configure Supabase connection pooling
- **Media Storage**: Monitor Supabase Storage usage
- **API Rate Limits**: Implement request queuing for high volume
- **Real-time Subscriptions**: Optimize subscription management

## 🤝 Contributing

### Development Guidelines

1. **Follow TypeScript patterns**: Strict typing for all components
2. **Use custom hooks**: Prefer hooks over Server Actions
3. **Document database changes**: Include migration rollback plans
4. **Test real-time features**: Verify subscription stability
5. **Security first**: Always implement RLS for new tables

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request with detailed description

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **📧 Email**: [support@avenuedevelopments.com](mailto:support@avenuedevelopments.com)
- **🐛 Issues**: [GitHub Issues](https://github.com/yourusername/avenue-omnichannel/issues)
- **📖 Documentation**: Check the `/docs` folder for detailed guides

### Common Issues

- **Webhook not receiving**: Check Twilio configuration and firewall settings
- **Real-time not working**: Verify Supabase real-time is enabled for tables
- **Message sending fails**: Check Twilio credentials and WhatsApp number verification
- **Database migrations fail**: Follow [migration best practices](docs/database-migration-best-practices.md)

---

## 🎯 Roadmap

### Short Term
- [ ] Message status indicators (delivered, read)
- [ ] Enhanced search and filtering
- [ ] Conversation notes and internal comments
- [ ] Agent assignment automation

### Long Term
- [ ] Voice message support
- [ ] Multi-language template management
- [ ] Advanced analytics dashboard
- [ ] Integration with other messaging platforms

---

**Built with ❤️ by Avenue Developments**

*Ready for enterprise WhatsApp communication at scale!* 🚀