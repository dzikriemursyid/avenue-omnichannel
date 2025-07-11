// Twilio Template Service
import { twilioClient } from "./client";
import { createClient } from "@/lib/supabase/server";

export interface TwilioTemplate {
  sid: string;
  friendly_name: string;
  language: string;
  date_created: string;
  date_updated: string;
  variables: Record<string, string>;
  types: {
    [key: string]: {
      body?: string;
      title?: string;
      subtitle?: string;
      media?: string[];
      actions?: Array<{
        index: number;
        type: string;
        id: string;
        title: string;
      }>;
    };
  };
  links: {
    approval_fetch: string;
    approval_create: string;
  };
}

export interface LocalTemplate {
  id: string;
  name: string;
  template_id: string; // Twilio SID
  category: "marketing" | "utility" | "authentication";
  language_code: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  button_config?: any;
  variables: string[];
  status: "pending" | "approved" | "rejected";
  // Enhanced Twilio integration fields
  twilio_approval_status?: "pending" | "approved" | "rejected";
  twilio_approval_date?: string;
  template_type?: "text" | "card" | "media";
  media_urls?: string[];
  twilio_metadata?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  // From Twilio sync
  twilio_data?: TwilioTemplate;
}

export class TemplateService {
  private supabase: any;

  async init() {
    this.supabase = await createClient();
  }

  // Fetch all templates from Twilio
  async fetchTwilioTemplates(): Promise<TwilioTemplate[]> {
    try {
      const contentList = await twilioClient.content.v1.contents.list();
      return contentList.map((content) => ({
        sid: content.sid,
        friendly_name: content.friendlyName,
        language: content.language,
        date_created: content.dateCreated?.toISOString() || "",
        date_updated: content.dateUpdated?.toISOString() || "",
        variables: (content.variables as unknown as Record<string, string>) || {},
        types: (content.types as any) || {},
        links: {
          approval_fetch: "",
          approval_create: "",
        },
      }));
    } catch (error) {
      console.error("Error fetching Twilio templates:", error);
      throw error;
    }
  }

  // Sync templates from Twilio to local database
  async syncTemplatesFromTwilio(userId: string): Promise<{ synced: number; errors: string[] }> {
    if (!this.supabase) await this.init();

    try {
      const twilioTemplates = await this.fetchTwilioTemplates();
      let synced = 0;
      const errors: string[] = [];

      for (const template of twilioTemplates) {
        try {
          // Extract template content and type
          const templateType = Object.keys(template.types)[0];
          const templateContent = template.types[templateType];

          // Extract variables from the template content
          const variables = this.extractVariables(templateContent);

          // Extract template type and media URLs
          const extractedTemplateType = this.extractTemplateType(template.types);
          const mediaUrls = this.extractMediaUrls(template.types);

          // Check if template already exists
          const { data: existing } = await this.supabase.from("message_templates").select("id").eq("template_id", template.sid).single();

          const templateData = {
            name: template.friendly_name,
            template_id: template.sid,
            category: this.categorizeTemplate(template.friendly_name),
            language_code: template.language,
            body_text: templateContent.body || templateContent.title || "No content",
            header_text: templateContent.title || null,
            footer_text: templateContent.subtitle || null,
            button_config: templateContent.actions || null,
            variables,
            status: "approved", // Assume approved if it exists in Twilio
            twilio_approval_status: "approved",
            twilio_approval_date: template.date_updated,
            template_type: extractedTemplateType,
            media_urls: mediaUrls,
            twilio_metadata: {
              approval_links: template.links,
              date_created: template.date_created,
              date_updated: template.date_updated,
            },
            created_by: userId,
            updated_at: new Date().toISOString(),
          };

          if (existing) {
            // Update existing template
            await this.supabase.from("message_templates").update(templateData).eq("id", existing.id);
          } else {
            // Create new template
            await this.supabase.from("message_templates").insert({
              ...templateData,
              created_at: new Date().toISOString(),
            });
          }

          synced++;
        } catch (error) {
          errors.push(`Failed to sync template ${template.friendly_name}: ${error}`);
        }
      }

      return { synced, errors };
    } catch (error) {
      console.error("Error syncing templates:", error);
      throw error;
    }
  }

  // Get local templates from database
  async getLocalTemplates(): Promise<LocalTemplate[]> {
    if (!this.supabase) await this.init();

    const { data, error } = await this.supabase
      .from("message_templates")
      .select(
        `
        *,
        profiles!message_templates_created_by_fkey(full_name)
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching local templates:", error);
      throw error;
    }

    return data || [];
  }

  // Get single template
  async getTemplate(id: string): Promise<LocalTemplate | null> {
    if (!this.supabase) await this.init();

    const { data, error } = await this.supabase
      .from("message_templates")
      .select(
        `
        *,
        profiles!message_templates_created_by_fkey(full_name)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return data;
  }

  // Create new template locally (will need approval in Twilio)
  async createTemplate(template: Partial<LocalTemplate>, userId: string): Promise<LocalTemplate> {
    if (!this.supabase) await this.init();

    const { data, error } = await this.supabase
      .from("message_templates")
      .insert({
        ...template,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      throw error;
    }

    return data;
  }

  // Update template
  async updateTemplate(id: string, updates: Partial<LocalTemplate>): Promise<LocalTemplate> {
    if (!this.supabase) await this.init();

    const { data, error } = await this.supabase
      .from("message_templates")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      throw error;
    }

    return data;
  }

  // Delete template from local database and Twilio
  async deleteTemplate(id: string): Promise<void> {
    if (!this.supabase) await this.init();

    // First, get the template to check if it has a Twilio SID
    const { data: template, error: fetchError } = await this.supabase.from("message_templates").select("template_id").eq("id", id).single();

    if (fetchError) {
      console.error("Error fetching template for deletion:", fetchError);
      throw fetchError;
    }

    // If template has a Twilio SID, delete it from Twilio first
    if (template?.template_id && template.template_id.startsWith("HX")) {
      try {
        await this.deleteTwilioTemplate(template.template_id);
      } catch (twilioError) {
        console.error("Error deleting template from Twilio:", twilioError);
        // Continue with local deletion even if Twilio deletion fails
      }
    }

    // Delete from local database
    const { error } = await this.supabase.from("message_templates").delete().eq("id", id);

    if (error) {
      console.error("Error deleting template from database:", error);
      throw error;
    }
  }

  // Delete template from Twilio using Content API
  async deleteTwilioTemplate(templateSid: string): Promise<void> {
    try {
      await twilioClient.content.v1.contents(templateSid).remove();
      console.log(`Successfully deleted template ${templateSid} from Twilio`);
    } catch (error) {
      console.error(`Error deleting template ${templateSid} from Twilio:`, error);
      throw error;
    }
  }

  // Helper: Extract variables from template content
  private extractVariables(content: any): string[] {
    const variables: string[] = [];
    const text = JSON.stringify(content);
    const variableMatches = text.match(/\{\{(\d+)\}\}/g);

    if (variableMatches) {
      variableMatches.forEach((match) => {
        const variable = match.replace(/[{}]/g, "");
        if (!variables.includes(variable)) {
          variables.push(variable);
        }
      });
    }

    return variables.sort((a, b) => parseInt(a) - parseInt(b));
  }

  // Helper: Extract template type from Twilio types
  private extractTemplateType(types: any): "text" | "card" | "media" {
    if (types["twilio/card"]) return "card";
    if (types["twilio/media"]) return "media";
    return "text";
  }

  // Helper: Extract media URLs from Twilio types
  private extractMediaUrls(types: any): string[] {
    const mediaUrls: string[] = [];

    Object.values(types).forEach((type: any) => {
      if (type.media && Array.isArray(type.media)) {
        mediaUrls.push(...type.media);
      }
    });

    return mediaUrls;
  }

  // Helper: Categorize template based on name
  private categorizeTemplate(name: string): "marketing" | "utility" | "authentication" {
    const lowerName = name.toLowerCase();

    if (lowerName.includes("otp") || lowerName.includes("auth") || lowerName.includes("verify")) {
      return "authentication";
    } else if (lowerName.includes("promo") || lowerName.includes("sale") || lowerName.includes("offer")) {
      return "marketing";
    } else {
      return "utility";
    }
  }
}
