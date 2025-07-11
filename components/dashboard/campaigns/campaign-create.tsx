import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Save, Send } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Template {
    id: string
    name: string
    description: string
}

interface Audience {
    id: string
    name: string
    count: number
}

interface CampaignCreateProps {
    templates: Template[]
    audiences: Audience[]
}

export default function CampaignCreate({ templates, audiences }: CampaignCreateProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Details</CardTitle>
                            <CardDescription>
                                Define the basic information for your campaign.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Campaign Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Enter campaign name"
                                    defaultValue=""
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe your campaign purpose and goals"
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="template">Message Template</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {templates.map((template) => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{template.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {template.description}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="audience">Target Audience</Label>
                                    <Select>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select audience" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {audiences.map((audience) => (
                                                <SelectItem key={audience.id} value={audience.id}>
                                                    <div className="flex justify-between items-center w-full">
                                                        <span>{audience.name}</span>
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            ({audience.count.toLocaleString()})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Settings</CardTitle>
                            <CardDescription>
                                Configure when and how your campaign will be sent.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Send Schedule</Label>
                                    <Select defaultValue="immediate">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="immediate">Send immediately</SelectItem>
                                            <SelectItem value="scheduled">Schedule for later</SelectItem>
                                            <SelectItem value="draft">Save as draft</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Send Date & Time</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !Date.now() && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {Date.now() ? format(Date.now(), "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={new Date()}
                                                onSelect={() => { }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="batch-size">Batch Size</Label>
                                <Input
                                    id="batch-size"
                                    type="number"
                                    placeholder="1000"
                                    defaultValue="1000"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Number of messages to send per batch (recommended: 1000)
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Preview & Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign Preview</CardTitle>
                            <CardDescription>
                                Preview how your campaign will appear.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border rounded-lg bg-muted/50">
                                <div className="text-sm font-medium mb-2">Message Preview</div>
                                <div className="text-sm text-muted-foreground">
                                    Hello {"{{1}}"}! Welcome to our service. We&apos;re excited to have you on board.
                                    <br /><br />
                                    Best regards,<br />
                                    The Team
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Target Audience:</span>
                                    <span className="font-medium">All Customers (12,500)</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Estimated Cost:</span>
                                    <span className="font-medium">$125.00</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full" size="lg">
                                <Send className="mr-2 h-4 w-4" />
                                Send Campaign
                            </Button>
                            <Button variant="outline" className="w-full">
                                <Save className="mr-2 h-4 w-4" />
                                Save as Draft
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
} 