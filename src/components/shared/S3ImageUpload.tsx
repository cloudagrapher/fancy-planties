'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { S3ImageService } from '@/lib/services/s3-image-service';

interface S3ImageUploadProps {
  userId: string;
  entityType: 'plant_instance' | 'propagation' | 'care_history' | 'care_guide';
  entityId: string;
  onUploadComplete: (s3Keys: string[]) => void;
  maxImages?: number;
  maxSizePerImage?: number;
  acceptedTypes?: string[];
  className?: string;
}

/**
 * S3-backed image upload component
 * Handles file selection, validation, and upload to S3
 */
export default function S3ImageUpload({
  userId,
  entityType,
  entityId,
  onUploadComplete,
  maxImages = 6,
  maxSizePerImage = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = '',
}: S3ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());

  const handleFiles = useCallback(
    (files: File[]) => {
      const newErrors: string[] = [];
      const validFiles: File[] = [];

      if (selectedFiles.length + files.length > maxImages) {
        newErrors.push(`Maximum ${maxImages} images allowed`);
        setErrors(newErrors);
        return;
      }

      files.forEach(file => {
        if (!acceptedTypes.includes(file.type)) {
          newErrors.push(`${file.name}: Invalid file type`);
          return;
        }

        if (file.size > maxSizePerImage) {
          const maxSizeMB = Math.round(maxSizePerImage / (1024 * 1024));
          newErrors.push(`${file.name}: File too large (max ${maxSizeMB}MB)`);
          return;
        }

        validFiles.push(file);
      });

      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }

      setErrors(newErrors);
    },
    [selectedFiles, maxImages, maxSizePerImage, acceptedTypes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxImages - selectedFiles.length,
    disabled: selectedFiles.length >= maxImages || uploading,
  });

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setErrors([]);

    try {
      const uploadedKeys = await S3ImageService.uploadMultipleImages({
        userId,
        entityType,
        entityId,
        files: selectedFiles,
      });

      onUploadComplete(uploadedKeys);
      setSelectedFiles([]);
      setUploadProgress(new Map());
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors(['Upload failed. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setErrors([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {selectedFiles.length < maxImages && !uploading && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-4xl mb-2">📷</div>
          {isDragActive ? (
            <p className="text-primary-600">Drop images here...</p>
          ) : (
            <>
              <p className="text-gray-600">Click or drag images to upload</p>
              <p className="text-sm text-gray-500 mt-2">
                {selectedFiles.length} of {maxImages} selected
              </p>
            </>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          {errors.map((error, i) => (
            <p key={i} className="text-red-700 text-sm">
              • {error}
            </p>
          ))}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Selected ({selectedFiles.length})</h4>
            <button
              onClick={uploadFiles}
              disabled={uploading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:bg-gray-300"
            >
              {uploading ? 'Uploading...' : 'Upload to S3'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {selectedFiles.map((file, i) => (
              <div key={i} className="relative group">
                <div className="aspect-square bg-gray-100 rounded">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                {!uploading && (
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                )}
                <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
