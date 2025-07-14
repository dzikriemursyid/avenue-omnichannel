// Campaign Sender Service
import { twilioClient, whatsappConfig, formatWhatsAppNumber, personalizeTemplate } from "./client";
import { createAdminClient } from "@/lib/supabase/admin.server";

interface SendCampaignOptions {
  campaignId: string;
  batchSize?: number;
  delayBetweenBatches?: number; // in milliseconds
}

interface Contact {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  custom_fields?: Record<string, any>;
}

interface Template {
  id: string;
  name: string;
  template_id: string; // Twilio Content SID
  variables: string[];
}

interface Campaign {
  id: string;
  name: string;
  template_id: string;
  status: string;
}

export class CampaignSender {
  private supabase: any;

  async init() {
    this.supabase = createAdminClient();
  }

  async sendCampaign({ campaignId, batchSize = 50, delayBetweenBatches = 1000 }: SendCampaignOptions) {
    try {
      // Initialize if not already done
      if (!this.supabase) {
        await this.init();
      }
      // 1. Get campaign details
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // 2. Validate campaign status
      if (campaign.status !== "draft" && campaign.status !== "scheduled") {
        throw new Error(`Campaign cannot be sent. Current status: ${campaign.status}`);
      }

      // 3. Update campaign status to running
      await this.updateCampaignStatus(campaignId, "running");

      // 4. Get template
      const template = await this.getTemplate(campaign.template_id);
      if (!template) {
        throw new Error("Template not found");
      }

      // 5. Get contacts for the campaign
      const contacts = await this.getCampaignContacts(campaignId);
      if (contacts.length === 0) {
        throw new Error("No contacts found for this campaign");
      }

      // 6. Send messages in batches
      const results = await this.sendInBatches(campaignId, template, contacts, batchSize, delayBetweenBatches);

      // 7. Update campaign analytics
      await this.updateCampaignAnalytics(campaignId, results);

      return {
        success: true,
        totalSent: results.sent,
        totalFailed: results.failed,
        message: `Campaign sent successfully. ${results.sent} messages sent, ${results.failed} failed.`,
      };
    } catch (error) {
      console.error("Campaign send error:", error);
      await this.updateCampaignStatus(campaignId, "failed");
      throw error;
    }
  }

  private async getCampaign(campaignId: string): Promise<Campaign | null> {
    const { data, error } = await this.supabase.from("campaigns").select("*").eq("id", campaignId).single();

    if (error) {
      console.error("Error fetching campaign:", error);
      return null;
    }

    return data;
  }

  private async getTemplate(templateId: string): Promise<Template | null> {
    const { data, error } = await this.supabase.from("message_templates").select("*").eq("id", templateId).single();

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return data;
  }

  private async getCampaignContacts(campaignId: string): Promise<Contact[]> {
    // Get campaign target segments (contact groups)
    const { data: campaign } = await this.supabase.from("campaigns").select("target_segments").eq("id", campaignId).single();

    if (!campaign || !campaign.target_segments || campaign.target_segments.length === 0) {
      return [];
    }

    // Get contacts from contact groups
    const { data: contacts, error } = await this.supabase
      .from("contacts")
      .select(
        `
        id,
        phone_number,
        name,
        email,
        custom_fields
      `
      )
      .in("group_id", campaign.target_segments);

    if (error) {
      console.error("Error fetching contacts:", error);
      return [];
    }

    return contacts || [];
  }

  private async sendInBatches(campaignId: string, template: Template, contacts: Contact[], batchSize: number, delayBetweenBatches: number) {
    let sent = 0;
    let failed = 0;

    // Process contacts in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      // Send messages in parallel within the batch
      const promises = batch.map((contact) => this.sendMessage(campaignId, template, contact));

      const results = await Promise.allSettled(promises);

      // Count successes and failures
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          sent++;
        } else {
          failed++;
          console.error(`Failed to send to ${batch[index].phone_number}:`, result.reason);
        }
      });

      // Delay between batches to avoid rate limiting
      if (i + batchSize < contacts.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return { sent, failed };
  }

  private async sendMessage(campaignId: string, template: Template, contact: Contact) {
    try {
      // Personalize template variables
      const templateData = {
        name: contact.name || "Customer",
        email: contact.email || "",
        ...contact.custom_fields,
      };

      const contentVariables = personalizeTemplate(template.variables, templateData);

      // Send via Twilio
      console.log("🔗 Sending message with webhook URL:", whatsappConfig.statusCallback);
      const messageParams = {
        contentSid: template.template_id,
        contentVariables: JSON.stringify(contentVariables),
        from: whatsappConfig.from,
        to: formatWhatsAppNumber(contact.phone_number),
        statusCallback: whatsappConfig.statusCallback,
        // Force status callbacks for WhatsApp
        statusCallbackMethod: 'POST',
      };
      
      console.log("📤 Sending WhatsApp message with params:", messageParams);
      const message = await twilioClient.messages.create(messageParams);
      
      console.log("📤 Message sent successfully:", {
        sid: message.sid,
        status: message.status,
        to: message.to,
        statusCallback: whatsappConfig.statusCallback
      });

      // Record in campaign_messages
      await this.recordMessage(campaignId, contact.id, message.sid, contentVariables);

      return message;
    } catch (error) {
      // Record failed message
      await this.recordFailedMessage(campaignId, contact.id, error);
      throw error;
    }
  }

  private async recordMessage(campaignId: string, contactId: string, messageSid: string, templateData: Record<string, string>) {
    const phoneNumberData = await this.supabase.from("contacts").select("phone_number").eq("id", contactId).single();
    
    const messageData = {
      campaign_id: campaignId,
      contact_id: contactId,
      message_sid: messageSid,
      phone_number: phoneNumberData.data?.phone_number,
      template_data: templateData,
      status: "sent",
      sent_at: new Date().toISOString(),
    };

    const { data: insertedMessage, error } = await this.supabase.from("campaign_messages").insert(messageData).select();
    
    if (error) {
      console.error("❌ Error recording message:", error);
    }
  }

  private async recordFailedMessage(campaignId: string, contactId: string, error: any) {
    await this.supabase.from("campaign_messages").insert({
      campaign_id: campaignId,
      contact_id: contactId,
      phone_number: (await this.supabase.from("contacts").select("phone_number").eq("id", contactId).single()).data?.phone_number,
      status: "failed",
      error_message: error.message || "Unknown error",
      sent_at: new Date().toISOString(),
    });
  }

  private async updateCampaignStatus(campaignId: string, status: string) {
    await this.supabase.from("campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", campaignId);
  }

  private async updateCampaignAnalytics(campaignId: string, results: { sent: number; failed: number }) {
    await this.supabase.from("campaign_analytics").upsert({
      campaign_id: campaignId,
      total_sent: results.sent,
      total_failed: results.failed,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'campaign_id'
    });
  }
}
