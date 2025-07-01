// Centralized API exports
export { authApi } from "./auth";
export { profileApi } from "./profile";
export { usersApi } from "./users";
export { teamsApi } from "./teams";
export { default as apiClient } from "./client";

// Re-export types
export type { LoginRequest, LoginResponse, SetupProfileRequest, SetupProfileResponse } from "./auth";
export type { UpdateProfileRequest, ProfileResponse } from "./profile";
export type { CreateUserRequest, UpdateUserRequest, UsersListResponse, UserResponse } from "./users";
export type { CreateTeamRequest, UpdateTeamRequest, TeamsListResponse, TeamResponse, PaginationParams } from "./teams";
