// Centralized Hook Exports - Updated with Complete Team Management
// File: hooks/index.ts (replace existing)

// Generic API hook
export { useApi } from "./use-api";

// Authentication hooks
export { useLogin, useSetupProfile, useLogout } from "./use-auth";

// Profile hooks
export { useProfile, useUpdateProfile } from "./use-profile";

// User management hooks
export { useUsers, useUser, useCreateUser, useUpdateUser, useDeleteUser } from "./use-users";

// Team management hooks - COMPLETE MIGRATION
export {
  // Basic team operations
  useTeams,
  useTeam,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,

  // Member management operations
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  useAvailableUsers,

  // Leader management operations
  useUpdateTeamLeader,
  useDemoteTeamLeader,
} from "./use-teams";

// Performance optimization hooks
export { useDebounce, useDebouncedCallback } from "./use-debounce";
export { useLazyLoad, useInfiniteScroll, useVirtualScroll } from "./use-lazy-load";
