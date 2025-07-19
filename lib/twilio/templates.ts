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

  // Fetch templates with approval status using Template Search v2
  async fetchTwilioTemplatesWithApproval(): Promise<any[]> {
    try {
      console.log(`🆕 Using Template Search v2 API for efficient template fetching`);
      
      const allTemplates: any[] = [];
      let nextPageUrl: string | null = null;
      let currentPage = 0;
      
      do {
        currentPage++;
        
        // Use Template Search v2 ContentAndApprovals endpoint
        const baseUrl = 'https://content.twilio.com/v2/ContentAndApprovals';
        const params = new URLSearchParams({
          PageSize: '100' // Maximum page size
          // Note: Removed ChannelEligibility filter to get all templates
          // This will return all templates, then we filter WhatsApp ones in code
        });
        
        const requestUrl = nextPageUrl || `${baseUrl}?${params.toString()}`;
        
        console.log(`🔄 Fetching templates (Page ${currentPage}) from Template Search v2:`);
        console.log(`   Request URL: ${requestUrl}`);
        console.log(`   Request Headers: Authorization: Basic [REDACTED], Content-Type: application/json`);
        
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        
        if (!accountSid || !authToken) {
          throw new Error('Twilio credentials not found');
        }
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
        console.log(`📥 Response Headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Error Response Body:`, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log(`✅ Template Search v2 Response:`, JSON.stringify(responseData, null, 2));
        
        const allResponseTemplates = responseData.contents || [];
        console.log(`✅ Received ${allResponseTemplates.length} total templates from Template Search v2 (Page ${currentPage})`);
        
        // Filter only WhatsApp templates based on v2 response structure
        const whatsappTemplates = allResponseTemplates.filter((template: any) => {
          // In v2, WhatsApp approval data is in approval_requests field
          const hasApprovalRequests = template.approval_requests !== undefined;
          const isWhatsAppType = template.types && Object.keys(template.types).some(type => 
            type.includes('twilio/') || type.includes('whatsapp/')
          );
          
          console.log(`   Template ${template.sid}: approval_requests=${!!hasApprovalRequests}, types=${Object.keys(template.types || {}).join(', ')}, isWhatsApp=${hasApprovalRequests && isWhatsAppType}`);
          
          return hasApprovalRequests && isWhatsAppType;
        });
        
        console.log(`📝 Filtered to ${whatsappTemplates.length} WhatsApp templates:`);
        
        whatsappTemplates.forEach((template: any, index: number) => {
          // In v2, WhatsApp approval data is in approval_requests field
          const whatsappApproval = template.approval_requests || null;
          const templateName = template.friendly_name || whatsappApproval?.name || 'Unknown';
          const approvalStatus = whatsappApproval?.status || 'unknown';
          const category = whatsappApproval?.category || 'unknown';
          
          console.log(`  ${index + 1}. Template SID: ${template.sid}`);
          console.log(`     Name: ${templateName}`);
          console.log(`     Language: ${template.language}`);
          console.log(`     WhatsApp Status: ${approvalStatus}`);
          console.log(`     WhatsApp Category: ${category}`);
          console.log(`     Content Type: ${whatsappApproval?.content_type || 'unknown'}`);
          
          // Transform v2 response to match our expected format
          const transformedTemplate = {
            ...template,
            whatsapp: whatsappApproval // Extract WhatsApp approval data from approval_requests
          };
          
          allTemplates.push(transformedTemplate);
        });
        
        // Handle pagination
        const meta = responseData.meta || {};
        nextPageUrl = meta.next_page_url || null;
        
        console.log(`📊 Page ${currentPage} Summary:`);
        console.log(`   - Total templates fetched: ${allResponseTemplates.length}`);
        console.log(`   - WhatsApp templates filtered: ${whatsappTemplates.length}`);
        console.log(`   - Has next page: ${nextPageUrl ? 'Yes' : 'No'}`);
        
        // Safety check to prevent infinite loops
        if (currentPage >= 10) {
          console.warn(`⚠️ Reached maximum page limit (10), stopping pagination`);
          break;
        }
        
      } while (nextPageUrl);
      
      console.log(`🎉 TEMPLATE SEARCH v2 FINAL SUMMARY:`);
      console.log(`   - Total pages fetched: ${currentPage}`);
      console.log(`   - Total templates fetched: ${allTemplates.length}`);
      console.log(`   - Templates with WhatsApp approval data: ${allTemplates.filter(t => t.whatsapp).length}`);
      console.log(`   - Templates without WhatsApp approval data: ${allTemplates.filter(t => !t.whatsapp).length}`);
      
      // Log each template's details
      allTemplates.forEach((template, index) => {
        const whatsappStatus = template.whatsapp?.status || 'NO_DATA';
        const whatsappCategory = template.whatsapp?.category || 'NO_CATEGORY';
        const templateName = template.friendly_name || template.whatsapp?.name || 'Unknown';
        console.log(`   ${index + 1}. ${templateName} (${template.sid}) - Status: ${whatsappStatus}, Category: ${whatsappCategory}`);
      });
      
      return allTemplates;
      
    } catch (error) {
      console.error("❌ CRITICAL ERROR in fetchTwilioTemplatesWithApproval (v2):");
      console.error(`   Error Type: ${error.constructor.name}`);
      console.error(`   Error Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack Trace: ${error.stack}`);
      }
      throw new Error(`Failed to fetch templates with Template Search v2: ${error}`);
    }
  }

  // Sync templates from Twilio to local database using Template Search v2
  async syncTemplatesFromTwilio(userId: string): Promise<{ synced: number; errors: string[]; deleted: number }> {
    console.log(`🚀 Starting template sync with Template Search v2 for user: ${userId}`);
    if (!this.supabase) await this.init();

    try {
      console.log(`🔄 Step 1: Fetching templates using Template Search v2...`);
      const twilioTemplates = await this.fetchTwilioTemplatesWithApproval();
      console.log(`✅ Step 1 Complete: Retrieved ${twilioTemplates.length} templates from Template Search v2`);
      
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

          // Extract WhatsApp approval data
          const whatsappApproval = template.whatsapp || {};
          const approvalStatus = this.mapWhatsAppStatus(whatsappApproval.status);
          const whatsappCategory = whatsappApproval.category || null;
          
          // Use WhatsApp approval name as fallback if friendly_name is undefined
          const templateName = template.friendly_name || whatsappApproval.name || template.name || `Template_${template.sid.slice(-8)}`;
          
          console.log(`📝 Processing template: ${templateName} (${template.sid})`);
          console.log(`   - Template friendly_name: ${template.friendly_name || 'UNDEFINED'}`);
          console.log(`   - WhatsApp approval name: ${whatsappApproval.name || 'UNDEFINED'}`);
          console.log(`   - Final template name: ${templateName}`);
          console.log(`   - WhatsApp Status: ${whatsappApproval.status || 'NOT_AVAILABLE'} -> Mapped: ${approvalStatus}`);
          console.log(`   - WhatsApp Category: ${whatsappCategory || 'NOT_AVAILABLE'}`);
          console.log(`   - Extracted Category: ${this.extractCategoryFromWhatsApp(whatsappCategory, templateName)}`);
          
          const templateData = {
            name: templateName,
            template_id: template.sid,
            category: this.extractCategoryFromWhatsApp(whatsappCategory, templateName),
            language_code: template.language,
            body_text: userFriendlyBodyText, // Use user-friendly content
            header_text: templateContent.title || null,
            footer_text: templateContent.subtitle || null,
            button_config: templateContent.actions || null,
            variables,
            status: approvalStatus,
            twilio_approval_status: approvalStatus,
            twilio_approval_date: whatsappApproval.date_approved || template.date_updated,
            template_type: extractedTemplateType,
            media_urls: mediaUrls,
            twilio_metadata: {
              approval_links: template.links,
              date_created: template.date_created,
              date_updated: template.date_updated,
              variables: template.variables, // Store original Twilio variables for reference
              original_body_text: originalBodyText, // Store original content for reference
              whatsapp_approval: whatsappApproval, // Store full WhatsApp approval data
            },
            created_by: userId,
            updated_at: new Date().toISOString(),
          };


          console.log(`💾 Database Operation: ${existing ? 'UPDATE' : 'INSERT'} template ${templateName}`);
          console.log(`💾 Template Data:`, JSON.stringify({
            name: templateData.name,
            template_id: templateData.template_id,
            category: templateData.category,
            status: templateData.status,
            language_code: templateData.language_code
          }, null, 2));
          
          if (existing) {
            // Update existing template
            console.log(`🔄 Updating existing template with ID: ${existing.id}`);
            const { error: updateError } = await this.supabase
              .from("message_templates")
              .update(templateData)
              .eq("id", existing.id);
            
            if (updateError) {
              console.error(`❌ Database UPDATE error for template ${templateName}:`, updateError);
              throw new Error(`Failed to update template ${templateName}: ${updateError.message}`);
            }
            console.log(`✅ Successfully UPDATED template: ${templateName}`);
          } else {
            // Create new template
            console.log(`🆕 Creating new template: ${templateName}`);
            const { error: insertError, data: insertData } = await this.supabase
              .from("message_templates")
              .insert({
                ...templateData,
                created_at: new Date().toISOString(),
              })
              .select('id');
            
            if (insertError) {
              console.error(`❌ Database INSERT error for template ${templateName}:`, insertError);
              console.error(`❌ Insert Error Details:`, {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
              });
              throw new Error(`Failed to insert template ${templateName}: ${insertError.message}`);
            }
            console.log(`✅ Successfully INSERTED template: ${templateName} with ID: ${insertData?.[0]?.id}`);
          }

          synced++;
          console.log(`✅ Template sync completed: ${templateName} (${templateData.status});`)
        } catch (error) {
          const templateName = template.friendly_name || template.whatsapp?.name || template.name || `Template_${template.sid.slice(-8)}`;
          console.error(`❌ Error processing template ${templateName} (${template.sid}):`);
          console.error(`   Error Type: ${error.constructor.name}`);
          console.error(`   Error Message: ${error.message}`);
          if (error.stack) {
            console.error(`   Stack Trace: ${error.stack}`);
          }
          errors.push(`Failed to sync template ${templateName}: ${error.message}`);
        }
      }

      
      console.log(`🎉 TEMPLATE SEARCH v2 SYNC COMPLETED:`);
      console.log(`   - Templates synced: ${synced}`);
      console.log(`   - Templates deleted: ${deleted}`);
      console.log(`   - Errors encountered: ${errors.length}`);
      console.log(`   - API Efficiency: Used Template Search v2 (single API call vs multiple calls)`);
      if (errors.length > 0) {
        console.log(`   - Error details:`);
        errors.forEach((error, index) => {
          console.log(`     ${index + 1}. ${error}`);
        });
      }
      
      return { synced, errors, deleted };
    } catch (error) {
      console.error("❌ CRITICAL ERROR in syncTemplatesFromTwilio:");
      console.error(`   Error Type: ${error.constructor.name}`);
      console.error(`   Error Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack Trace: ${error.stack}`);
      }
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

  // Helper: Map WhatsApp approval status to our local status
  private mapWhatsAppStatus(whatsappStatus: string | null | undefined): "approved" | "pending" | "rejected" {
    if (!whatsappStatus || typeof whatsappStatus !== 'string') {
      return 'pending';
    }
    
    const status = whatsappStatus.toLowerCase();
    
    // Map WhatsApp statuses to our simplified statuses
    switch (status) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'paused':
      case 'disabled':
        return 'rejected';
      case 'unsubmitted':
      case 'received':
      case 'pending':
      default:
        return 'pending';
    }
  }

  // Helper: Extract category from WhatsApp approval data, fallback to name-based categorization
  private extractCategoryFromWhatsApp(whatsappCategory: string | null, templateName: string | null | undefined): "marketing" | "utility" | "authentication" {
    // First try to map WhatsApp categories to our categories
    if (whatsappCategory) {
      const category = whatsappCategory.toUpperCase();
      
      // Real WhatsApp category mapping based on official categories
      // Authentication categories
      if (category.includes('AUTHENTICATION') || 
          category.includes('OTP') || 
          category.includes('VERIFICATION')) {
        return 'authentication';
      }
      
      // Marketing categories
      if (category.includes('MARKETING') || 
          category.includes('PROMOTION') || 
          category.includes('PROMOTIONAL')) {
        return 'marketing';
      }
      
      // Utility categories (most WhatsApp categories are utility-based)
      if (category.includes('UTILITY') || 
          category.includes('ACCOUNT_UPDATE') || 
          category.includes('PAYMENT_UPDATE') || 
          category.includes('PERSONAL_FINANCE_UPDATE') || 
          category.includes('SHIPPING_UPDATE') || 
          category.includes('RESERVATION_UPDATE') || 
          category.includes('ISSUE_RESOLUTION') || 
          category.includes('APPOINTMENT_UPDATE') || 
          category.includes('TRANSPORTATION_UPDATE') || 
          category.includes('TICKET_UPDATE') || 
          category.includes('ALERT_UPDATE') || 
          category.includes('AUTO_REPLY')) {
        return 'utility';
      }
    }
    
    // Fallback to name-based categorization
    return this.categorizeTemplate(templateName || 'unknown');
  }

  // Helper: Categorize template based on name (fallback method)
  private categorizeTemplate(name: string | null | undefined): "marketing" | "utility" | "authentication" {
    if (!name || typeof name !== 'string') {
      return "utility"; // Default fallback
    }
    
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
