"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileIcon, FileText, AlertTriangle, Info } from "lucide-react"
import Image from "next/image"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface BillUploaderProps {
  onUpload: (file: File) => void
  isProcessing: boolean
}

export function BillUploader({ onUpload, isProcessing }: BillUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setError(null)

        // Save file metadata
        setFileName(file.name)
        setFileSize(formatFileSize(file.size))

        // Determine file type
        if (file.type.startsWith("image/")) {
          const previewUrl = URL.createObjectURL(file)
          setPreview(previewUrl)
          setFileType("image")
        } else if (file.type === "application/pdf") {
          setPreview(null)
          setFileType("pdf")
        } else {
          setError("Unsupported file type. Please upload an image or PDF.")
          return
        }

        // Simulate progress for better UX
        setProgress(0)
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(interval)
              return prev
            }
            return prev + 10
          })
        }, 300)

        // Process the file
        onUpload(file)
      }
    },
    [onUpload],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  })

  // Format file size in KB or MB
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return bytes + " bytes"
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + " KB"
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {fileType === "pdf" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>PDF Support</AlertTitle>
          <AlertDescription>
            For demonstration purposes, PDF uploads will use sample data. In a production app, PDF processing would be
            handled by a server-side API.
          </AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/10" : "border-gray-300"
        } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium">{isDragActive ? "Drop the bill here" : "Drag & drop your bill here"}</p>
            <p className="text-sm text-gray-500">Supports images (JPG, PNG) and PDF files</p>
          </div>
          <Button type="button" disabled={isProcessing}>
            Select File
          </Button>
        </div>
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing file{fileType ? ` (${fileType})` : ""}...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {(preview || fileType === "pdf") && fileName && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-md flex items-center justify-center bg-gray-100">
                {fileType === "image" && preview ? (
                  <Image src={preview || "/placeholder.svg"} alt="Bill preview" fill className="object-cover" />
                ) : (
                  <FileIcon className="h-10 w-10 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium truncate">{fileName}</h3>
                  <Badge variant="outline">{fileType}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {fileSize} • {isProcessing ? "Processing..." : "Ready"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
        <div className="flex items-start space-x-3">
          <FileText className="h-5 w-5 mt-0.5" />
          <div>
            <h4 className="font-medium">Tips for best results</h4>
            <ul className="text-sm mt-1 list-disc list-inside space-y-1">
              <li>For images: Ensure the bill is well-lit and clearly visible</li>
              <li>For PDFs: Use high-quality scans or digital receipts</li>
              <li>Make sure all items and prices are in the frame</li>
              <li>If automatic processing fails, you can add items manually</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

