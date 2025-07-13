import { ContactGroupsManager } from "@/components/dashboard/contacts/contacts-groups-manager"

export default function ContactsPage() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Contacts</h1>
                    <p className="text-gray-600">Manage your contact groups and contacts</p>
                </div>
            </div>

            {/* Contact Groups Manager */}
            <ContactGroupsManager />
        </div>
    )
}