# ⚠️ DEPRECATION NOTICE

## Server Actions are Deprecated

As of Phase 4 of the API migration, all server actions in this directory are **deprecated** and should not be used in new code.

### Migration Status

- ✅ **Authentication** actions are wrapped by API routes
- ✅ **Profile** actions are wrapped by API routes
- ✅ **User Management** actions are wrapped by API routes
- ✅ **Team Management** actions are wrapped by API routes

### For Frontend Components

**DO NOT USE** server actions directly. Instead, use the new API hooks:

```typescript
// ❌ OLD - Don't use this
import { signInWithEmail } from "@/lib/actions/auth";
await signInWithEmail(formData);

// ✅ NEW - Use this instead
import { useLogin } from "@/hooks";
const { execute: login } = useLogin();
await login({ email, password });
```

### For API Routes

API routes can continue to use server actions internally as they serve as the backend implementation. However, consider refactoring to direct database calls in the future for better performance.

### Removal Timeline

These server actions will be removed in the next major version after all components have been migrated.

### See Also

- [API Migration Guide](/docs/API_MIGRATION_GUIDE.md)
- [Component Migration Guide](/docs/COMPONENT_MIGRATION_GUIDE.md)
- [Frontend Integration Guide](/docs/PHASE3_FRONTEND_INTEGRATION.md)
