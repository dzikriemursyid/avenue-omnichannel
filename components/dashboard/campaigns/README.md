# Campaign Components

This directory contains reusable components for the campaign management system.

## Components

### CampaignOverview

Displays a list of campaigns with statistics and management options.

**Props:**

- `profile`: User profile object with role information
- `campaigns`: Array of campaign objects

**Usage:**

```tsx
import { CampaignOverview } from "@/components/dashboard/campaigns";

<CampaignOverview profile={profile} campaigns={campaigns} />;
```

### CampaignCreate

Form component for creating new campaigns.

**Props:**

- `templates`: Array of available message templates
- `audiences`: Array of target audiences

**Usage:**

```tsx
import { CampaignCreate } from "@/components/dashboard/campaigns";

<CampaignCreate templates={templates} audiences={audiences} />;
```

### CampaignSend

Component for managing and sending campaigns.

**Props:**

- `campaigns`: Array of campaigns to display

**Usage:**

```tsx
import { CampaignSend } from "@/components/dashboard/campaigns";

<CampaignSend campaigns={campaigns} />;
```

### CampaignHeader

Dynamic header component that changes based on the current route.

**Props:**

- `profile`: User profile object with role information

**Usage:**

```tsx
import { CampaignHeader } from "@/components/dashboard/campaigns";

<CampaignHeader profile={profile} />;
```

### CampaignDetails

Detailed view component for individual campaigns with tabs for different sections.

**Props:**

- `campaign`: Campaign object with all details
- `deliveryStats`: Array of delivery statistics

**Usage:**

```tsx
import { CampaignDetails } from "@/components/dashboard/campaigns";

<CampaignDetails campaign={campaign} deliveryStats={deliveryStats} />;
```

## Data Interfaces

### Campaign

```typescript
interface Campaign {
  id: string;
  name: string;
  description: string;
  status: "draft" | "scheduled" | "running" | "completed" | "paused" | "failed";
  template_name: string;
  target_count: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  scheduled_at: Date;
  created_by: string;
  created_at: Date;
  audience: string;
  batch_size: number;
  send_schedule: string;
  message_content: string;
}
```

### Template

```typescript
interface Template {
  id: string;
  name: string;
  description: string;
}
```

### Audience

```typescript
interface Audience {
  id: string;
  name: string;
  count: number;
}
```

### DeliveryStat

```typescript
interface DeliveryStat {
  date: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}
```

## Features

- **Role-based access control**: Components respect user permissions
- **Responsive design**: Works on mobile and desktop
- **Real-time updates**: Components can be easily connected to real data
- **Consistent styling**: Uses shared UI components
- **Type safety**: Full TypeScript support with proper interfaces
