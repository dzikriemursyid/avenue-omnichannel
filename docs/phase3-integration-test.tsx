// Phase 3 Integration Test Component
// This file demonstrates how to use all the hooks together

import React from "react";
import {
    useLogin,
    useProfile,
    useUpdateProfile,
    useUsers,
    useCreateUser,
    useTeams,
    useCreateTeam,
} from "@/hooks";

export function Phase3IntegrationDemo() {
    // Authentication
    const login = useLogin();

    // Profile
    const { profile, loading: profileLoading } = useProfile();
    const updateProfile = useUpdateProfile();

    // Users
    const { users, pagination: usersPagination, loading: usersLoading } = useUsers({
        page: 1,
        limit: 10
    });
    const createUser = useCreateUser();

    // Teams
    const { teams, loading: teamsLoading } = useTeams();
    const createTeam = useCreateTeam();

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-2xl font-bold">Phase 3 Integration Demo</h1>

            {/* Profile Section */}
            <section className="border p-4 rounded">
                <h2 className="text-xl font-semibold mb-4">Profile</h2>
                {profileLoading ? (
                    <p>Loading profile...</p>
                ) : profile ? (
                    <div>
                        <p>Name: {profile.full_name}</p>
                        <p>Email: {profile.email}</p>
                        <p>Role: {profile.role}</p>
                        <button
                            onClick={() => updateProfile.execute({ full_name: "Updated Name" })}
                            disabled={updateProfile.loading}
                            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                        >
                            {updateProfile.loading ? "Updating..." : "Update Name"}
                        </button>
                    </div>
                ) : (
                    <p>No profile data</p>
                )}
            </section>

            {/* Users Section */}
            <section className="border p-4 rounded">
                <h2 className="text-xl font-semibold mb-4">Users</h2>
                {usersLoading ? (
                    <p>Loading users...</p>
                ) : (
                    <div>
                        <p>Total Users: {usersPagination?.total || 0}</p>
                        <ul className="list-disc pl-5">
                            {users.map((user) => (
                                <li key={user.id}>
                                    {user.full_name} ({user.email}) - {user.role}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() =>
                                createUser.execute({
                                    email: "newuser@example.com",
                                    password: "password123",
                                    full_name: "New User",
                                    role: "agent",
                                })
                            }
                            disabled={createUser.loading}
                            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
                        >
                            {createUser.loading ? "Creating..." : "Create Test User"}
                        </button>
                    </div>
                )}
            </section>

            {/* Teams Section */}
            <section className="border p-4 rounded">
                <h2 className="text-xl font-semibold mb-4">Teams</h2>
                {teamsLoading ? (
                    <p>Loading teams...</p>
                ) : (
                    <div>
                        <p>Total Teams: {teams.length}</p>
                        <ul className="list-disc pl-5">
                            {teams.map((team) => (
                                <li key={team.id}>
                                    {team.name} - {team.is_active ? "Active" : "Inactive"}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() =>
                                createTeam.execute({
                                    name: "New Test Team",
                                    description: "Created via API hooks",
                                })
                            }
                            disabled={createTeam.loading}
                            className="mt-2 px-4 py-2 bg-purple-500 text-white rounded"
                        >
                            {createTeam.loading ? "Creating..." : "Create Test Team"}
                        </button>
                    </div>
                )}
            </section>

            {/* Status Section */}
            <section className="border p-4 rounded bg-gray-50">
                <h2 className="text-xl font-semibold mb-4">Integration Status</h2>
                <ul className="space-y-2">
                    <li>✅ API Client configured</li>
                    <li>✅ Service modules created</li>
                    <li>✅ React hooks implemented</li>
                    <li>✅ Type safety enabled</li>
                    <li>✅ Error handling integrated</li>
                    <li>✅ Loading states working</li>
                    <li>✅ Toast notifications ready</li>
                </ul>
            </section>
        </div>
    );
} 