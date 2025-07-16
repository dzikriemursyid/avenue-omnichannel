// File upload endpoint untuk outbound media messages
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Max file size: 20MB (Twilio limit)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  // Videos
  'video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime',
  // Audio
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Verify user has access to conversation
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, status")
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.status === "closed") {
      return NextResponse.json({ error: "Cannot upload to closed conversation" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = getFileExtension(file.name);
    const fileName = `${timestamp}_${randomSuffix}${extension}`;
    const filePath = `conversations/${conversationId}/media/${fileName}`;

    console.log(`📤 Uploading file: ${file.name} (${file.size} bytes) to ${filePath}`);

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceSupabase.storage
      .from('media-uploads')
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '86400', // Cache for 1 day
        upsert: false
      });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file", details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = serviceSupabase.storage
      .from('media-uploads')
      .getPublicUrl(filePath);

    if (!urlData.publicUrl) {
      console.error("❌ Failed to get public URL");
      return NextResponse.json({ error: "Failed to get file URL" }, { status: 500 });
    }

    console.log(`✅ File uploaded successfully: ${urlData.publicUrl}`);

    // Return upload data
    return NextResponse.json({
      success: true,
      file: {
        url: urlData.publicUrl,
        path: filePath,
        name: fileName,
        originalName: file.name,
        type: file.type,
        size: file.size,
        messageType: validation.messageType
      }
    });

  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// File validation function
function validateFile(file: File): { isValid: boolean; error?: string; messageType?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: "Cannot upload empty files"
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not supported. Supported types: Images, Videos, Audio, Documents.`
    };
  }

  // Determine message type
  let messageType = "document"; // default
  if (file.type.startsWith('image/')) messageType = "image";
  else if (file.type.startsWith('video/')) messageType = "video";
  else if (file.type.startsWith('audio/')) messageType = "audio";

  return { isValid: true, messageType };
}

// Get file extension
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex);
}