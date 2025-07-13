import { ContactsGroupPage } from "@/components/dashboard/contacts/contacts-group-page"

interface GroupPageProps {
    params: {
        groupId: string
    }
}

export default async function GroupPage({ params }: GroupPageProps) {
    const { groupId } = await params

    return <ContactsGroupPage groupId={groupId} />
} 