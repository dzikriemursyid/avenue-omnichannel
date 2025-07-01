# Phase 3: Frontend Integration Guide

## Overview

Phase 3 implements a modern frontend integration layer for the API routes created in Phase 1 and 2. This includes:

- Type-safe API client
- React hooks for API calls
- Error handling and loading states
- Toast notifications
- Optimistic updates support

## Architecture

### 1. API Client (`lib/api/client.ts`)

A singleton API client that handles:

- Request/response formatting
- Error handling
- Authentication headers
- Query parameter handling

```typescript
const apiClient = new ApiClient("/api");

// Usage
const response = await apiClient.get("/dashboard/profile");
const response = await apiClient.post("/auth/login", { email, password });
```

### 2. Service Modules (`lib/api/*.ts`)

Domain-specific API services:

- **`auth.ts`**: Authentication endpoints
- **`profile.ts`**: Profile management
- **`users.ts`**: User CRUD operations
- **`teams.ts`**: Team CRUD operations

Each service exports:

- Typed interfaces for requests/responses
- API methods using the base client

### 3. React Hooks (`hooks/*.ts`)

Custom hooks that provide:

- Loading states
- Error handling
- Automatic retries
- Toast notifications
- Data caching

## Usage Examples

### Authentication

```typescript
import { useLogin } from "@/hooks";

function LoginForm() {
  const { execute: login, loading, error } = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({ email, password });
  };
}
```

### Profile Management

```typescript
import { useProfile, useUpdateProfile } from "@/hooks";

function ProfilePage() {
  // Auto-fetch profile on mount
  const { profile, loading, error, refetch } = useProfile();

  // Update profile
  const updateProfile = useUpdateProfile();

  const handleUpdate = async (data) => {
    await updateProfile.execute(data);
    refetch(); // Refresh profile data
  };
}
```

### User Management

```typescript
import { useUsers, useCreateUser, useDeleteUser } from "@/hooks";

function UsersPage() {
  // List users with pagination
  const { users, pagination, loading } = useUsers({ page: 1, limit: 10 });

  // Create user
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  const handleCreate = async (userData) => {
    await createUser.execute(userData);
  };

  const handleDelete = async (userId) => {
    await deleteUser.execute(userId);
  };
}
```

### Team Management

```typescript
import { useTeams, useTeam, useUpdateTeam } from "@/hooks";

function TeamDetailsPage({ teamId }) {
  // Get single team
  const { team, loading, error } = useTeam(teamId);

  // Update team
  const updateTeam = useUpdateTeam();

  const handleUpdate = async (data) => {
    await updateTeam.execute(teamId, data);
  };
}
```

## Error Handling

All hooks include built-in error handling:

```typescript
const { execute, error, loading } = useApi(apiFunction, {
  showErrorToast: true, // Show error toast (default: true)
  showSuccessToast: true, // Show success toast (default: false)
  onError: (error) => {
    // Custom error handler
    console.error(error);
  },
});
```

## Loading States

All hooks provide loading states:

```typescript
function Component() {
  const { data, loading } = useUsers();

  if (loading) {
    return <Spinner />;
  }

  return <UserList users={data.users} />;
}
```

## Type Safety

All API calls are fully typed:

```typescript
// Request types
interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "general_manager" | "leader" | "agent";
  team_id?: string;
}

// Response types
interface UserResponse {
  user: Profile;
}

// Usage with full type inference
const createUser = useCreateUser();
await createUser.execute({
  email: "user@example.com",
  // TypeScript ensures all required fields
});
```

## Optimistic Updates

For better UX, implement optimistic updates:

```typescript
function TodoList() {
  const { todos, refetch } = useTodos();
  const updateTodo = useUpdateTodo();

  const handleToggle = async (todo) => {
    // Optimistically update UI
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)));

    try {
      await updateTodo.execute(todo.id, { completed: !todo.completed });
    } catch (error) {
      // Revert on error
      refetch();
    }
  };
}
```

## Migration Guide

### Step 1: Replace Server Actions

Replace direct server action calls:

```typescript
// Before
const result = await signInWithEmail(formData);

// After
const { execute: login } = useLogin();
await login({ email, password });
```

### Step 2: Update Error Handling

Replace manual error handling:

```typescript
// Before
try {
  const result = await action();
  if (!result.success) {
    toast.error(result.message);
  }
} catch (error) {
  toast.error("Error occurred");
}

// After
const { execute } = useApi(apiFunction); // Error handling built-in
await execute();
```

### Step 3: Use Loading States

Replace manual loading states:

```typescript
// Before
const [loading, setLoading] = useState(false);
setLoading(true);
try {
  await action();
} finally {
  setLoading(false);
}

// After
const { loading, execute } = useApi(apiFunction);
await execute();
```

## Testing

### Unit Tests

```typescript
import { renderHook, act } from "@testing-library/react-hooks";
import { useLogin } from "@/hooks";

test("login hook", async () => {
  const { result } = renderHook(() => useLogin());

  await act(async () => {
    await result.current.execute({
      email: "test@example.com",
      password: "password",
    });
  });

  expect(result.current.data).toBeDefined();
});
```

### Integration Tests

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import LoginForm from "@/components/auth/login-form-api";

test("login form submission", async () => {
  render(<LoginForm />);

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "test@example.com" },
  });

  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

  await screen.findByText(/signing in/i);
});
```

## Performance Considerations

1. **Debouncing**: For search/filter operations
2. **Caching**: Consider React Query or SWR for advanced caching
3. **Pagination**: Always use pagination for lists
4. **Lazy Loading**: Load data as needed

## Next Steps

1. Complete component migrations
2. Add data caching layer
3. Implement real-time updates
4. Add offline support
5. Performance optimization
