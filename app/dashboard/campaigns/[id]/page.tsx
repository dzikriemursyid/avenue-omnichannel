import { CampaignDetailsOptimized } from "@/components/dashboard/campaigns/campaign-details-optimized"

interface CampaignDetailsPageProps {
    params: {
        id: string
    }
}

export default function CampaignDetailsPage({ params }: CampaignDetailsPageProps) {
    return <CampaignDetailsOptimized campaignId={params.id} />
} 