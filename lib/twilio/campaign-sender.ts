// Campaign Sender Service
import { twilioClient, whatsappConfig, formatWhatsAppNumber } from "./client";
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
  created_at?: string;
  updated_at?: string;
  twilio_metadata?: {
    variables?: Record<string, string>; // Twilio sample variables
    original_body_text?: string;
    date_updated?: string;
    date_created?: string;
    approval_links?: any;
  };
}

interface Campaign {
  id: string;
  name: string;
  template_id: string;
  status: string;
  template_variables?: Record<string, string>; // Campaign-specific template variables
  variable_source?: "manual" | "contact"; // Source for contact-related variables
}

export class CampaignSender {
  private supabase: any;

  async init() {
    this.supabase = createAdminClient();
  }

  // Fixed function to handle template personalization with correct variable mapping
  private personalizeTemplateWithFallback(template: Template, campaign: Campaign, contact: Contact): Record<string, string> {
    const personalized: Record<string, string> = {};

    // Get Twilio sample variables as ultimate fallback
    const twilioSampleVariables = template.twilio_metadata?.variables || {};

    // Build template data with proper priority
    let templateData: Record<string, string> = {};

    if (campaign.variable_source === "contact") {
      // Use contact data as primary source, with campaign variables as fallback, and Twilio samples as ultimate fallback
      const contactVariables = {
        name: contact.name || "Customer", // Always use full name for name variable
        first_name: contact.name ? contact.name.split(" ")[0] : "Customer",
        last_name: contact.name ? contact.name.split(" ").slice(1).join(" ") : "",
        email: contact.email || "",
        phone: contact.phone_number,
        phone_number: contact.phone_number,
        company_name: contact.custom_fields?.company_name || contact.custom_fields?.company || "",
        company: contact.custom_fields?.company_name || contact.custom_fields?.company || "",
        ...contact.custom_fields, // Include all custom fields
      };

      // Merge with priority: Contact Data > Campaign Variables > Twilio Sample Variables
      templateData = {
        ...twilioSampleVariables, // Twilio sample variables as ultimate fallback
        ...campaign.template_variables, // Campaign variables as fallback
        ...contactVariables, // Contact data overrides everything
      };
      
    } else {
      // Manual mode: use campaign variables with Twilio samples as fallback
      templateData = {
        name: contact.name || "Customer", // Always include contact name for personalization
        ...twilioSampleVariables, // Twilio sample variables as fallback
        ...campaign.template_variables, // Campaign variables override Twilio samples
      };
    }

    // FIXED: Map variables based on original Twilio template order
    // Check if template has original variable order from Twilio metadata
    const originalBodyText = template.twilio_metadata?.original_body_text;
    if (originalBodyText) {
      // Extract variable order from original template
      const variableOrder = this.extractVariableOrderFromTemplate(originalBodyText, twilioSampleVariables);


      if (variableOrder.length > 0) {
        // Map using the correct order from original Twilio template
        variableOrder.forEach((originalVariable, index) => {
          const key = (index + 1).toString();

          // Find matching value from our template data
          let value = "";

          // CRITICAL FIX: Always prioritize our real data over Twilio sample
          // Check if we have real data for this variable
          if (templateData[originalVariable] && templateData[originalVariable] !== "") {
            // Use our data - regardless of whether it matches Twilio sample
            value = templateData[originalVariable];
            
          } else {
            // Fallback to Twilio sample only if we have no real data
            value = twilioSampleVariables[originalVariable] || "";
            
          }

          personalized[key] = value;
        });

        return personalized;
      }
    }

    // Fallback to original method if no original template data
    template.variables.forEach((variable, index) => {
      const key = (index + 1).toString();
      const value = templateData[variable] || "";
      
      personalized[key] = value;
    });

    return personalized;
  }

  // Helper function to extract variable order from original Twilio template
  private extractVariableOrderFromTemplate(originalBodyText: string, twilioVariables: Record<string, string>): string[] {
    // Method 1: Extract numeric variables from original template ({{1}}, {{2}}, {{3}})
    // This should never happen with WhatsApp templates as they use named variables
    const numericMatches = originalBodyText.match(/\{\{(\d+)\}\}/g);
    if (numericMatches) {
      const numericVars = numericMatches.map((match) => match.replace(/[{}]/g, "")).sort((a, b) => parseInt(a) - parseInt(b));

      // Map numeric variables to named variables from Twilio metadata
      return numericVars.map((numVar) => {
        // Find the corresponding named variable from Twilio sample variables
        const sampleKeys = Object.keys(twilioVariables);
        return sampleKeys[parseInt(numVar) - 1] || numVar;
      });
    }

    // Method 2: Extract named variables from original template ({{first_name}}, {{percentage}})
    // This is the correct method for WhatsApp templates
    const namedMatches = originalBodyText.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
    if (namedMatches) {
      // Extract variable names in order of appearance in template
      const extractedVariables = namedMatches.map((match) => match.replace(/[{}]/g, ""));
      
      // Remove duplicates while preserving order
      const uniqueVariables = extractedVariables.filter((value, index, self) => self.indexOf(value) === index);
      
      return uniqueVariables;
    }

    // Method 3: Fallback - Use the order from Twilio variables object
    const twilioKeys = Object.keys(twilioVariables);
    if (twilioKeys.length > 0) {
      return twilioKeys.sort((a, b) => {
        // If numeric keys, sort numerically
        if (!isNaN(parseInt(a)) && !isNaN(parseInt(b))) {
          return parseInt(a) - parseInt(b);
        }
        return a.localeCompare(b);
      });
    }

    return [];
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
    const { data, error } = await this.supabase.from("campaigns").select("id, name, template_id, status, template_variables, variable_source").eq("id", campaignId).single();

    if (error) {
      console.error("Error fetching campaign:", error);
      return null;
    }

    return data;
  }

  private async getTemplate(templateId: string): Promise<Template | null> {
    const { data, error } = await this.supabase.from("message_templates").select("*, twilio_metadata").eq("id", templateId).single();

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
      // Get campaign data including template variables
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Use the new personalization function with Twilio sample variables as fallback
      const contentVariables = this.personalizeTemplateWithFallback(template, campaign, contact);
      // CRITICAL FIX: For WhatsApp templates, Twilio requires content variables to be sent as named variables, not numeric
      // Map back from numeric keys to named variables for Twilio API
      const namedContentVariables: Record<string, string> = {};
      
      // Extract variable order from template
      const originalBodyText = template.twilio_metadata?.original_body_text || "";
      const variableOrder = this.extractVariableOrderFromTemplate(originalBodyText, template.twilio_metadata?.variables || {});
      
      // Map numeric keys back to named variables
      Object.keys(contentVariables).forEach(numericKey => {
        const index = parseInt(numericKey) - 1;
        const namedVariable = variableOrder[index];
        if (namedVariable) {
          namedContentVariables[namedVariable] = contentVariables[numericKey];
        }
      });
      
      // Use the primary format for now (numeric keys)
      const messageParams = {
        contentSid: template.template_id,
        contentVariables: JSON.stringify(namedContentVariables), // Use named variables instead of numeric
        from: whatsappConfig.from,
        to: formatWhatsAppNumber(contact.phone_number),
        statusCallback: whatsappConfig.statusCallback,
        // Force status callbacks for WhatsApp
        statusCallbackMethod: "POST",
      };

      const message = await twilioClient.messages.create(messageParams);
      // Record in campaign_messages
      await this.recordMessage(campaignId, contact.id, message.sid, namedContentVariables);

      return message;
    } catch (error) {
      // Record failed message
      await this.recordFailedMessage(campaignId, contact.id, error);
      throw error;
    }
  }

  private async recordMessage(campaignId: string, contactId: string, messageSid: string, templateData: Record<string, string>) {
    console.log(`📝 Recording campaign message for contact ${contactId} and creating conversation...`);
    
    // Get contact and campaign data
    const [contactData, campaignData] = await Promise.all([
      this.supabase.from("contacts").select("phone_number, name").eq("id", contactId).single(),
      this.supabase.from("campaigns").select("name, created_by, template_id").eq("id", campaignId).single()
    ]);

    const contact = contactData.data;
    const campaign = campaignData.data;
    
    if (!contact?.phone_number) {
      console.error(`❌ Contact ${contactId} has no phone number`);
      return;
    }

    // Step 1: Record in campaign_messages table (existing functionality)
    const campaignMessageData = {
      campaign_id: campaignId,
      contact_id: contactId,
      message_sid: messageSid,
      phone_number: contact.phone_number,
      template_data: templateData,
      status: "sent",
      sent_at: new Date().toISOString(),
    };

    const { error: campaignError } = await this.supabase.from("campaign_messages").insert(campaignMessageData).select();

    if (campaignError) {
      console.error("❌ Error recording campaign message:", campaignError);
      return;
    }

    // Step 2: Find or create conversation for this contact
    let conversationId: string;
    
    try {
      // Try to find existing conversation by contact_id
      const existingConversation = await this.supabase
        .from("conversations")
        .select("id")
        .eq("contact_id", contactId)
        .single();

      if (existingConversation.data) {
        conversationId = existingConversation.data.id;
        console.log(`✅ Found existing conversation: ${conversationId}`);
        
        // Update existing conversation to track campaign involvement if not already set
        const { error: updateError } = await this.supabase
          .from("conversations")
          .update({
            created_by_campaign: campaignId, // Track campaign involvement
            updated_at: new Date().toISOString()
          })
          .eq("id", conversationId)
          .is("created_by_campaign", null); // Only update if not already set
          
        if (updateError) {
          console.error("❌ Error updating existing conversation:", updateError);
        } else {
          console.log(`✅ Updated existing conversation ${conversationId} with campaign tracking`);
        }
      } else {
        // Create new conversation with dormant visibility (campaign conversation)
        const newConversation = await this.supabase
          .from("conversations")
          .insert({
            contact_id: contactId,
            status: "open", // Use valid status from schema
            priority: "normal", // Default priority
            last_message_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_within_window: true,
            visibility_status: "dormant", // Hidden from main UI until customer replies
            created_by_campaign: campaignId // Track which campaign created this conversation
          })
          .select("id")
          .single();

        if (newConversation.error) {
          console.error("❌ Error creating conversation:", newConversation.error);
          return;
        }

        conversationId = newConversation.data.id;
        console.log(`✅ Created new conversation: ${conversationId}`);
      }
    } catch (error) {
      console.error("❌ Error handling conversation:", error);
      return;
    }

    // Step 3: Get template content for the message
    const templateResult = await this.supabase
      .from("message_templates")
      .select("body_text, name")
      .eq("id", campaign?.template_id)
      .single();

    let messageContent = "Campaign message";
    if (templateResult.data?.body_text) {
      // Replace template variables with actual values
      messageContent = templateResult.data.body_text;
      Object.entries(templateData).forEach(([key, value]) => {
        messageContent = messageContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });
      
      // Add campaign context to message content as metadata
      messageContent += `\n\n---\nCampaign: ${campaign?.name || 'Unknown'}\nTemplate: ${templateResult.data.name || 'Unknown'}`;
    }

    // Step 4: Record in messages table for conversation tracking
    const messageData = {
      conversation_id: conversationId,
      message_sid: messageSid,
      direction: "outbound",
      message_type: "text", // Use valid message_type from schema
      content: messageContent,
      sent_by: campaign?.created_by || null,
      timestamp: new Date().toISOString(), // Use timestamp field from schema
      from_number: null, // Will be populated by Twilio webhook
      to_number: contact.phone_number,
      created_at: new Date().toISOString()
    };

    const { error: messageError } = await this.supabase.from("messages").insert(messageData).select();

    if (messageError) {
      console.error("❌ Error recording message in conversations:", messageError);
      return;
    }
    
    console.log(`✅ Successfully recorded message in conversations table for campaign ${campaignId}`);

    // Step 5: Update conversation's last_message_at
    const { error: updateError } = await this.supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("❌ Error updating conversation timestamp:", updateError);
    } else {
      console.log(`✅ Campaign message fully integrated: Campaign ${campaignId} -> Conversation ${conversationId}`);
    }
    
    // Note: Campaign tracking remains in campaign_messages table
    // Conversation context now available for customer replies
  }

  private async recordFailedMessage(campaignId: string, contactId: string, error: any) {
    console.log(`❌ Recording failed campaign message for contact ${contactId}`);
    
    const contactData = await this.supabase.from("contacts").select("phone_number, name").eq("id", contactId).single();
    const contact = contactData.data;
    
    if (!contact?.phone_number) {
      console.error(`❌ Contact ${contactId} has no phone number`);
      return;
    }

    // Record failed message in campaign_messages table
    const { error: campaignError } = await this.supabase.from("campaign_messages").insert({
      campaign_id: campaignId,
      contact_id: contactId,
      phone_number: contact.phone_number,
      status: "failed",
      error_message: error.message || "Unknown error",
      sent_at: new Date().toISOString(),
    });

    if (campaignError) {
      console.error("❌ Error recording failed campaign message:", campaignError);
    }

    // Note: We don't create conversations for failed messages
    // They will be created when the customer responds or when we successfully send them a message
    console.log(`✅ Recorded failed campaign message for contact ${contactId}`);
  }

  private async updateCampaignStatus(campaignId: string, status: string) {
    await this.supabase.from("campaigns").update({ status, updated_at: new Date().toISOString() }).eq("id", campaignId);
  }

  private async updateCampaignAnalytics(campaignId: string, results: { sent: number; failed: number }) {
    await this.supabase.from("campaign_analytics").upsert(
      {
        campaign_id: campaignId,
        total_sent: results.sent,
        total_failed: results.failed,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "campaign_id",
      }
    );
  }
}
