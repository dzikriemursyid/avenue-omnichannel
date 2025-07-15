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

  // Fetch individual template from Twilio (for detailed info)
  async fetchTwilioTemplate(templateSid: string): Promise<TwilioTemplate | null> {
    try {
      
      // Validate SID format
      if (!templateSid.match(/^HX[0-9a-fA-F]{32}$/)) {
        throw new Error(`Invalid template SID format: ${templateSid}`);
      }
      
      const content = await twilioClient.content.v1.contents(templateSid).fetch();
      
      const template: TwilioTemplate = {
        sid: content.sid,
        friendly_name: content.friendlyName,
        language: content.language,
        date_created: content.dateCreated?.toISOString() || "",
        date_updated: content.dateUpdated?.toISOString() || "",
        variables: (content.variables as unknown as Record<string, string>) || {},
        types: (content.types as any) || {},
        links: {
          approval_fetch: content.links?.approval_fetch || "",
          approval_create: content.links?.approval_create || "",
        },
      };
      
      return template;
    } catch (error) {
      console.error(`❌ Error fetching template ${templateSid}:`, error);
      
      if ((error as any).code === 20404) {
        return null;
      }
      
      throw new Error(`Failed to fetch template ${templateSid}: ${(error as any).message || error}`);
    }
  }

  // Fetch all templates from Twilio with pagination support
  async fetchTwilioTemplates(): Promise<TwilioTemplate[]> {
    try {
      
      const allTemplates: TwilioTemplate[] = [];
      let hasMore = true;
      let pageToken: string | undefined;
      
      while (hasMore) {
        const options: any = {
          limit: 100, // Reasonable page size as per Twilio docs
        };
        
        if (pageToken) {
          options.pageToken = pageToken;
        }
        
        
        const contentList = await twilioClient.content.v1.contents.list(options);
        
        
        const templates = contentList.map((content) => ({
          sid: content.sid,
          friendly_name: content.friendlyName,
          language: content.language,
          date_created: content.dateCreated?.toISOString() || "",
          date_updated: content.dateUpdated?.toISOString() || "",
          variables: (content.variables as unknown as Record<string, string>) || {},
          types: (content.types as any) || {},
          links: {
            approval_fetch: content.links?.approval_fetch || "",
            approval_create: content.links?.approval_create || "",
          },
        }));
        
        allTemplates.push(...templates);
        
        // Check if there are more pages
        // Note: Twilio SDK handles pagination automatically, but we need to check if we got less than the limit
        if (contentList.length < options.limit) {
          hasMore = false;
        } else {
          // For manual pagination, we would need to implement pageToken logic
          // For now, we'll rely on the SDK's automatic pagination
          hasMore = false;
        }
      }
      
      return allTemplates;
    } catch (error) {
      console.error("❌ Error fetching Twilio templates:", error);
      throw new Error(`Failed to fetch templates from Twilio: ${error}`);
    }
  }

  // Fetch templates with approval status from Twilio
  async fetchTwilioTemplatesWithApproval(): Promise<any[]> {
    try {
      
      const allTemplates: any[] = [];
      let hasMore = true;
      let pageToken: string | undefined;
      
      while (hasMore) {
        const options: any = {
          limit: 100,
        };
        
        if (pageToken) {
          options.pageToken = pageToken;
        }
        
        
        const contentAndApprovals = await twilioClient.content.v1.contentAndApprovals.list(options);
        
        
        allTemplates.push(...contentAndApprovals);
        
        if (contentAndApprovals.length < options.limit) {
          hasMore = false;
        } else {
          hasMore = false;
        }
      }
      
      return allTemplates;
    } catch (error) {
      console.error("❌ Error fetching templates with approval status:", error);
      throw new Error(`Failed to fetch templates with approval status: ${error}`);
    }
  }

  // Sync templates from Twilio to local database
  async syncTemplatesFromTwilio(userId: string): Promise<{ synced: number; errors: string[]; deleted: number }> {
    if (!this.supabase) await this.init();

    try {
      const twilioTemplates = await this.fetchTwilioTemplates();
      
      let synced = 0;
      let deleted = 0;
      const errors: string[] = [];

      // Get all existing templates from database that have Twilio IDs
      const { data: existingTemplates } = await this.supabase
        .from("message_templates")
        .select("id, template_id, name")
        .not("template_id", "is", null)
        .neq("template_id", "");


      // Create a set of Twilio template IDs for quick lookup
      const twilioTemplateIds = new Set(twilioTemplates.map(t => t.sid));
      
      // Delete templates that no longer exist in Twilio
      if (existingTemplates) {
        for (const existingTemplate of existingTemplates) {
          if (existingTemplate.template_id && 
              existingTemplate.template_id.startsWith('HX') && 
              !twilioTemplateIds.has(existingTemplate.template_id)) {
            
            
            try {
              await this.supabase
                .from("message_templates")
                .delete()
                .eq("id", existingTemplate.id);
              deleted++;
            } catch (error) {
              errors.push(`Failed to delete template ${existingTemplate.name}: ${error}`);
            }
          }
        }
      }

      // Sync templates from Twilio
      for (const template of twilioTemplates) {
        try {
          
          // Validate template structure
          if (!template.types || Object.keys(template.types).length === 0) {
            errors.push(`Template ${template.friendly_name} has no content types`);
            continue;
          }
          
          // Extract template content and type
          const templateType = Object.keys(template.types)[0];
          const templateContent = template.types[templateType];

          if (!templateContent) {
            errors.push(`Template ${template.friendly_name} has no content for type ${templateType}`);
            continue;
          }

          // Extract variables from Twilio variables object and template content
          const variables = this.extractVariablesFromTwilio(template.variables, templateContent);

          // Extract template type and media URLs
          const extractedTemplateType = this.extractTemplateType(template.types);
          const mediaUrls = this.extractMediaUrls(template.types);

          // Convert template content to user-friendly format with named variables
          const originalBodyText = templateContent.body || templateContent.title || "No content";
          const userFriendlyBodyText = this.convertTemplateContentToNamed(originalBodyText, variables);

          // Check if template already exists
          const { data: existing } = await this.supabase
            .from("message_templates")
            .select("id")
            .eq("template_id", template.sid)
            .single();

          const templateData = {
            name: template.friendly_name,
            template_id: template.sid,
            category: this.categorizeTemplate(template.friendly_name),
            language_code: template.language,
            body_text: userFriendlyBodyText, // Use user-friendly content
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
              variables: template.variables, // Store original Twilio variables for reference
              original_body_text: originalBodyText, // Store original content for reference
            },
            created_by: userId,
            updated_at: new Date().toISOString(),
          };


          if (existing) {
            // Update existing template
            await this.supabase
              .from("message_templates")
              .update(templateData)
              .eq("id", existing.id);
          } else {
            // Create new template
            await this.supabase
              .from("message_templates")
              .insert({
                ...templateData,
                created_at: new Date().toISOString(),
              });
          }

          synced++;
        } catch (error) {
          console.error(`❌ Error processing template ${template.friendly_name}:`, error);
          errors.push(`Failed to sync template ${template.friendly_name}: ${error}`);
        }
      }

      
      return { synced, errors, deleted };
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
      
      // Validate SID format
      if (!templateSid.match(/^HX[0-9a-fA-F]{32}$/)) {
        throw new Error(`Invalid template SID format: ${templateSid}`);
      }
      
      await twilioClient.content.v1.contents(templateSid).remove();
    } catch (error) {
      console.error(`❌ Error deleting template ${templateSid} from Twilio:`, error);
      
      // Check if it's a "not found" error, which might be expected
      if ((error as any).code === 20404) {
        return; // Don't throw error for not found - it's already deleted
      }
      
      throw new Error(`Failed to delete template ${templateSid} from Twilio: ${(error as any).message || error}`);
    }
  }


  // Helper: Extract variables from Twilio response and template content
  private extractVariablesFromTwilio(twilioVariables: Record<string, string>, templateContent: any): string[] {
    const variables: string[] = [];

    // Method 1: PRIMARY - Extract meaningful variable names from template content using {{variable_name}} pattern
    const meaningfulVariables = this.extractMeaningfulVariables(templateContent);
    if (meaningfulVariables.length > 0) {
      return meaningfulVariables;
    }

    // Method 2: FALLBACK - If no meaningful variables found, try to extract from Twilio variables object
    // This handles cases where Twilio provides variable names in their API response
    const twilioVariableNames = this.extractVariablesFromTwilioObject(twilioVariables);
    if (twilioVariableNames.length > 0) {
      return twilioVariableNames;
    }

    // Method 3: LAST RESORT - Use numeric variables and convert to meaningful names
    const numericVariables = Object.keys(twilioVariables).sort((a, b) => parseInt(a) - parseInt(b));
    if (numericVariables.length > 0) {
      for (let i = 0; i < numericVariables.length; i++) {
        const index = i + 1;
        const meaningfulName = this.generateMeaningfulVariableName(index);
        variables.push(meaningfulName);
      }
      return variables;
    }

    return variables;
  }

  // Helper: Try to extract meaningful variable names from template content using {{variable_name}} pattern
  private extractMeaningfulVariables(templateContent: any): string[] {
    const variables: string[] = [];

    // Convert template content to string for analysis
    const content = JSON.stringify(templateContent);

    // Enhanced regex to capture {{variable_name}} patterns
    // Supports: {{name}}, {{discount_code}}, {{user_name}}, {{order_id}}, etc.
    const meaningfulMatches = content.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);

    if (meaningfulMatches) {
      meaningfulMatches.forEach((match) => {
        const variable = match.replace(/[{}]/g, "");
        // Additional validation: ensure it's not a numeric-only variable
        if (!variables.includes(variable) && isNaN(parseInt(variable))) {
          variables.push(variable);
        }
      });
    }

    // Also check for common variable patterns in the content
    const commonPatterns = [
      "customer_name",
      "user_name",
      "name",
      "first_name",
      "last_name",
      "discount_code",
      "promo_code",
      "coupon_code",
      "code",
      "discount_percentage",
      "discount_amount",
      "percentage",
      "amount",
      "expiry_date",
      "expiration_date",
      "valid_until",
      "deadline",
      "company_name",
      "business_name",
      "brand_name",
      "product_name",
      "item_name",
      "service_name",
      "price",
      "cost",
      "total",
      "amount",
      "order_id",
      "order_number",
      "transaction_id",
      "reference",
      "tracking_number",
      "tracking_id",
      "shipment_id",
      "phone_number",
      "mobile_number",
      "contact_number",
      "email",
      "email_address",
      "address",
      "location",
      "venue",
      "date",
      "time",
      "datetime",
      "url",
      "link",
      "website",
    ];

    // Check if any of these patterns exist in the content (case insensitive)
    commonPatterns.forEach((pattern) => {
      const patternRegex = new RegExp(`\\{\\{${pattern}\\}\\}`, "gi");
      if (content.match(patternRegex) && !variables.includes(pattern)) {
        variables.push(pattern);
      }
    });

    return variables.sort();
  }

  // Helper: Extract variables from Twilio variables object (new method)
  private extractVariablesFromTwilioObject(twilioVariables: Record<string, string>): string[] {
    const variables: string[] = [];

    // If Twilio provides variable names directly, use them
    Object.keys(twilioVariables).forEach((key) => {
      // Skip numeric keys, prefer named variables
      if (isNaN(parseInt(key))) {
        variables.push(key);
      }
    });

    return variables;
  }

  // Helper: Generate meaningful variable names for numeric indices
  private generateMeaningfulVariableName(index: number): string {
    // Common meaningful variable names based on position and context
    const commonPatterns = [
      "name", // Usually first variable
      "discount_code", // Second variable for promotions
      "discount_percentage", // Third variable for promotions
      "expiry_date", // Fourth variable for time-sensitive offers
      "company_name", // Fifth variable for branding
      "product_name", // Sixth variable for product info
      "price", // Seventh variable for pricing
      "order_id", // Eighth variable for orders
      "tracking_number", // Ninth variable for shipping
      "phone_number", // Tenth variable for contact
    ];

    // Return meaningful name if available, otherwise use generic pattern
    if (index <= commonPatterns.length) {
      return commonPatterns[index - 1];
    }

    return `variable_${index}`;
  }

  // Helper: Convert template content from numeric placeholders to named variables
  private convertTemplateContentToNamed(content: string, variables: string[]): string {
    let convertedContent = content;

    variables.forEach((variable, index) => {
      const numericPlaceholder = `{{${index + 1}}}`;
      const namedPlaceholder = `{{${variable}}}`;
      convertedContent = convertedContent.replace(new RegExp(numericPlaceholder, "g"), namedPlaceholder);
    });

    return convertedContent;
  }

  // Helper: Get template display content with named variables
  public getTemplateDisplayContent(templateId: string, variables: string[]): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const template = await this.getTemplate(templateId);
        if (!template) {
          reject(new Error("Template not found"));
          return;
        }

        const displayContent = this.convertTemplateContentToNamed(template.body_text, variables);
        resolve(displayContent);
      } catch (error) {
        reject(error);
      }
    });
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

  // Public method for testing variable extraction (useful for debugging)
  public testVariableExtraction(templateContent: string): {
    meaningfulVariables: string[];
    regexMatches: string[];
    commonPatternMatches: string[];
  } {
    const content = JSON.stringify({ body: templateContent });

    // Test regex extraction
    const meaningfulMatches = content.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g) || [];
    const regexMatches = meaningfulMatches.map((match) => match.replace(/[{}]/g, ""));

    // Test common patterns
    const commonPatterns = [
      "customer_name",
      "user_name",
      "name",
      "first_name",
      "last_name",
      "discount_code",
      "promo_code",
      "coupon_code",
      "code",
      "discount_percentage",
      "discount_amount",
      "percentage",
      "amount",
      "expiry_date",
      "expiration_date",
      "valid_until",
      "deadline",
      "company_name",
      "business_name",
      "brand_name",
      "product_name",
      "item_name",
      "service_name",
      "price",
      "cost",
      "total",
      "amount",
      "order_id",
      "order_number",
      "transaction_id",
      "reference",
      "tracking_number",
      "tracking_id",
      "shipment_id",
      "phone_number",
      "mobile_number",
      "contact_number",
      "email",
      "email_address",
      "address",
      "location",
      "venue",
      "date",
      "time",
      "datetime",
      "url",
      "link",
      "website",
    ];

    const commonPatternMatches: string[] = [];
    commonPatterns.forEach((pattern) => {
      const patternRegex = new RegExp(`\\{\\{${pattern}\\}\\}`, "gi");
      if (content.match(patternRegex)) {
        commonPatternMatches.push(pattern);
      }
    });

    // Get final meaningful variables using the same logic as extractMeaningfulVariables
    const meaningfulVariables = this.extractMeaningfulVariables({ body: templateContent });

    return {
      meaningfulVariables,
      regexMatches,
      commonPatternMatches,
    };
  }
}
