"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip, X, Image, File, Video, Music } from "lucide-react"
import { toast } from "sonner"

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void
  onFileUploaded?: (uploadResult: UploadResult) => void
  disabled?: boolean
  className?: string
  conversationId?: string
  autoUpload?: boolean // If true, automatically upload file instead of just selecting
}

export interface UploadResult {
  url: string
  path: string
  name: string
  originalName: string
  type: string
  size: number
  messageType: string
}

export function FileUploadButton({ 
  onFileSelect, 
  onFileUploaded, 
  disabled, 
  className = "", 
  conversationId, 
  autoUpload = false 
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSelectFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validateAndSelectFile = async (file: File) => {
    const validation = validateFile(file)
    
    if (!validation.isValid) {
      toast.error(validation.error || "File validation failed")
      return
    }

    console.log(`✅ File validated: ${file.name} (${validation.category})`);
    
    if (autoUpload && conversationId && onFileUploaded) {
      await uploadFile(file);
    } else {
      onFileSelect(file);
    }
  }

  const uploadFile = async (file: File) => {
    if (!conversationId) {
      toast.error("Conversation ID required for upload");
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);

      const response = await fetch('/api/upload/media', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('✅ File uploaded successfully:', result.file);
      toast.success(`File uploaded: ${file.name}`);
      
      if (onFileUploaded) {
        onFileUploaded(result.file);
      }
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  // Enhanced file validation function
  const validateFile = (file: File): { isValid: boolean; error?: string; category?: string } => {
    // File type configurations with specific limits
    const fileTypeConfigs = {
      'image': {
        types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
        maxSize: 10 * 1024 * 1024, // 10MB for images
        description: 'Images (JPEG, PNG, GIF, WebP, BMP)'
      },
      'video': {
        types: ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime'],
        maxSize: 20 * 1024 * 1024, // 20MB for videos
        description: 'Videos (MP4, WebM, AVI, MOV)'
      },
      'audio': {
        types: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4'],
        maxSize: 10 * 1024 * 1024, // 10MB for audio
        description: 'Audio (MP3, WAV, OGG, M4A)'
      },
      'document': {
        types: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv'
        ],
        maxSize: 5 * 1024 * 1024, // 5MB for documents
        description: 'Documents (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)'
      }
    }

    // Find the category for this file type
    let category = ''
    let typeConfig = null
    
    for (const [cat, config] of Object.entries(fileTypeConfigs)) {
      if (config.types.includes(file.type)) {
        category = cat
        typeConfig = config
        break
      }
    }

    // Check if file type is supported
    if (!typeConfig) {
      const supportedTypes = Object.values(fileTypeConfigs)
        .map(config => config.description)
        .join(', ')
      return {
        isValid: false,
        error: `File type "${file.type}" is not supported.\n\nSupported types: ${supportedTypes}`
      }
    }

    // Check file size against category-specific limit
    if (file.size > typeConfig.maxSize) {
      return {
        isValid: false,
        error: `${category} files must be less than ${typeConfig.maxSize / (1024 * 1024)}MB (current: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`
      }
    }

    // Additional validation for empty files
    if (file.size === 0) {
      return {
        isValid: false,
        error: "Cannot upload empty files"
      }
    }

    return { isValid: true, category }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      validateAndSelectFile(files[0])
    }
  }

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className={className}>
      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        disabled={disabled}
      />
      
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={`p-2 h-8 w-8 flex-shrink-0 ${isDragging ? 'bg-primary/10' : ''} ${isUploading ? 'opacity-50' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={isUploading ? 'Uploading...' : 'Attach file'}
      >
        {isUploading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

interface SelectedFilePreviewProps {
  file: File
  onRemove: () => void
}

export function SelectedFilePreview({ file, onRemove }: SelectedFilePreviewProps) {
  const getFileTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />
    if (type.startsWith('audio/')) return <Music className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-muted rounded-md max-w-xs">
      <div className="flex-shrink-0">
        {getFileTypeIcon(file.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 flex-shrink-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}