// Centralized API exports - Updated with Complete Team Management
// File: lib/api/index.ts (replace existing)
export { authApi } from "./auth";
export { profileApi } from "./profile";
export { usersApi } from "./users";
export { teamsApi } from "./teams";
export { contactsApi } from "./contacts";
export { contactGroupsApi } from "./contact-groups";
export { default as apiClient } from "./client";

// Re-export types
export type { LoginRequest, LoginResponse, SetupProfileRequest, SetupProfileResponse } from "./auth";
export type { UpdateProfileRequest, ProfileResponse } from "./profile";
export type { CreateUserRequest, UpdateUserRequest, UsersListResponse, UserResponse } from "./users";
export type { CreateTeamRequest, UpdateTeamRequest, TeamsListResponse, TeamResponse, TeamMembersResponse, AvailableUsersResponse, AddMemberRequest, UpdateLeaderRequest, PaginationParams } from "./teams";
export type { CreateContactData, UpdateContactData, ContactsListResponse, ContactResponse, ContactsFilters, Contact } from "./contacts";
