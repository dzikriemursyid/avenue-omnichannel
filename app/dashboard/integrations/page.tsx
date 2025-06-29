import { createClient } from "@/lib/supabase/server"
import { getUserProfile } from "@/lib/supabase/profiles"
import { hasPermission } from "@/lib/supabase/rbac"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Zap,
  MessageSquare,
  Mail,
  Database,
  BarChart3,
  Webhook,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getUserProfile(user.id)
  if (!profile || !hasPermission(profile.role, "manage_integrations")) {
    redirect("/dashboard")
  }

  // Mock integrations data
  const integrations = [
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      description: "Send and receive WhatsApp messages",
      icon: MessageSquare,
      status: "connected" as const,
      category: "messaging",
      config: {
        phone_number: "+1234567890",
        last_sync: "2 minutes ago",
      },
    },
    {
      id: "twilio",
      name: "Twilio",
      description: "SMS and voice communication platform",
      icon: Zap,
      status: "connected" as const,
      category: "messaging",
      config: {
        account_sid: "AC***************",
        last_sync: "5 minutes ago",
      },
    },
    {
      id: "sendgrid",
      name: "SendGrid",
      description: "Email delivery and marketing platform",
      icon: Mail,
      status: "disconnected" as const,
      category: "email",
      config: null,
    },
    {
      id: "analytics",
      name: "Google Analytics",
      description: "Web analytics and reporting",
      icon: BarChart3,
      status: "error" as const,
      category: "analytics",
      config: {
        property_id: "GA4-***********",
        error: "Authentication expired",
      },
    },
    {
      id: "webhook",
      name: "Custom Webhooks",
      description: "Send events to external systems",
      icon: Webhook,
      status: "connected" as const,
      category: "automation",
      config: {
        endpoints: 3,
        last_event: "1 hour ago",
      },
    },
    {
      id: "crm",
      name: "Salesforce CRM",
      description: "Customer relationship management",
      icon: Database,
      status: "disconnected" as const,
      category: "crm",
      config: null,
    },
  ]

  const statusIcons = {
    connected: CheckCircle,
    disconnected: XCircle,
    error: AlertCircle,
  }

  const statusColors = {
    connected: "text-green-500",
    disconnected: "text-gray-500",
    error: "text-red-500",
  }

  const categoryColors = {
    messaging: "bg-blue-100 text-blue-800",
    email: "bg-purple-100 text-purple-800",
    analytics: "bg-green-100 text-green-800",
    automation: "bg-yellow-100 text-yellow-800",
    crm: "bg-pink-100 text-pink-800",
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Connect external services and manage system integrations.
        </p>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">Available services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.filter((i) => i.status === "connected").length}</div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.filter((i) => i.status === "error").length}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500 flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.filter((i) => i.status === "disconnected").length}</div>
            <p className="text-xs text-muted-foreground">Ready to connect</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => {
          const StatusIcon = statusIcons[integration.status]
          return (
            <Card key={integration.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                      <integration.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{integration.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${categoryColors[integration.category]} text-xs`}>
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${statusColors[integration.status]} flex-shrink-0`} />
                </div>
                <CardDescription className="text-sm">{integration.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {integration.config && (
                  <div className="space-y-2">
                    {integration.id === "whatsapp" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phone Number:</span>
                          <span className="font-mono text-xs truncate max-w-[120px]">
                            {integration.config.phone_number}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Sync:</span>
                          <span className="text-xs">{integration.config.last_sync}</span>
                        </div>
                      </>
                    )}
                    {integration.id === "twilio" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Account SID:</span>
                          <span className="font-mono text-xs truncate max-w-[120px]">
                            {integration.config.account_sid}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Sync:</span>
                          <span className="text-xs">{integration.config.last_sync}</span>
                        </div>
                      </>
                    )}
                    {integration.id === "analytics" && integration.config.error && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Property ID:</span>
                          <span className="font-mono text-xs truncate max-w-[120px]">
                            {integration.config.property_id}
                          </span>
                        </div>
                        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                          {integration.config.error}
                        </div>
                      </>
                    )}
                    {integration.id === "webhook" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Endpoints:</span>
                          <span>{integration.config.endpoints}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Event:</span>
                          <span className="text-xs">{integration.config.last_event}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={integration.status === "connected"} disabled={integration.status === "error"} />
                    <span className="text-sm">{integration.status === "connected" ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                      <Settings className="h-3 w-3 mr-1" />
                      Configure
                    </Button>
                    {integration.status === "connected" && (
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
          <CardDescription>Common integration management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start bg-transparent">
              <Webhook className="h-4 w-4 mr-2" />
              Add Custom Webhook
            </Button>
            <Button variant="outline" className="justify-start bg-transparent">
              <Settings className="h-4 w-4 mr-2" />
              Integration Settings
            </Button>
            <Button variant="outline" className="justify-start bg-transparent">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Integration Logs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
