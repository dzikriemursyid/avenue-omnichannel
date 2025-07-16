"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Download, File, Play, Pause, Volume2, VolumeX } from "lucide-react"

interface MediaPreviewProps {
  mediaUrl: string
  mediaContentType: string
  fileName?: string
  className?: string
  messageId?: string // For proxy endpoint
}

export function MediaPreview({ mediaUrl, mediaContentType, fileName, className = "", messageId }: MediaPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  // Use proxy endpoint for Twilio media URLs that require authentication
  const getProxiedUrl = (url: string) => {
    if (messageId && url.includes('api.twilio.com')) {
      return `/api/media/${messageId}`;
    }
    return url;
  };
  
  const proxiedUrl = getProxiedUrl(mediaUrl);

  const handleDownload = () => {
    window.open(proxiedUrl, '_blank')
  }

  const getFileExtension = (contentType: string) => {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    }
    return mimeToExt[contentType] || 'file'
  }

  const getFileName = () => {
    if (fileName) return fileName
    const ext = getFileExtension(mediaContentType)
    return `file.${ext}`
  }

  // Image Preview
  if (mediaContentType.startsWith('image/')) {
    return (
      <div className={`relative group ${className}`}>
        <Dialog>
          <DialogTrigger asChild>
            <div className="cursor-pointer relative">
              <img
                src={proxiedUrl}
                alt="Image message"
                className="max-w-xs max-h-48 rounded-lg object-cover hover:opacity-90 transition-opacity"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <VisuallyHidden>
              <DialogTitle>Image Preview</DialogTitle>
            </VisuallyHidden>
            <div className="relative">
              <img
                src={proxiedUrl}
                alt="Image message"
                className="w-full h-auto max-h-[90vh] object-contain"
              />
              <Button
                onClick={handleDownload}
                className="absolute top-4 right-4"
                size="sm"
                variant="secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Video Preview
  if (mediaContentType.startsWith('video/')) {
    return (
      <div className={`relative ${className}`}>
        <video
          controls
          className="max-w-xs max-h-48 rounded-lg"
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
        >
          <source src={proxiedUrl} type={mediaContentType} />
          Your browser does not support the video tag.
        </video>
        <Button
          onClick={handleDownload}
          className="absolute top-2 right-2 opacity-75 hover:opacity-100"
          size="sm"
          variant="secondary"
        >
          <Download className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  // Audio Preview
  if (mediaContentType.startsWith('audio/')) {
    return (
      <div className={`bg-muted rounded-lg p-3 max-w-xs ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Audio message</p>
            <p className="text-xs text-muted-foreground">{getFileName()}</p>
          </div>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="ghost"
            className="flex-shrink-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <audio
          controls
          className="w-full mt-2"
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          <source src={proxiedUrl} type={mediaContentType} />
          Your browser does not support the audio tag.
        </audio>
      </div>
    )
  }

  // Document/File Preview
  return (
    <div className={`bg-muted rounded-lg p-3 max-w-xs ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <File className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{getFileName()}</p>
          <p className="text-xs text-muted-foreground">
            {mediaContentType.split('/')[1]?.toUpperCase() || 'Document'}
          </p>
        </div>
        <Button
          onClick={handleDownload}
          size="sm"
          variant="ghost"
          className="flex-shrink-0"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}