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

  const handleFiles = useCallback(
    async (files: File[]) => {
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

      if (newErrors.length > 0) {
        setErrors(newErrors);
      }

      // Auto-upload valid files immediately
      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        setUploading(true);
        setErrors([]);

        try {
          const uploadedKeys = await S3ImageService.uploadMultipleImages({
            userId,
            entityType,
            entityId,
            files: validFiles,
          });

          onUploadComplete(uploadedKeys);
          setSelectedFiles([]);
        } catch (error) {
          console.error('Upload failed:', error);
          setErrors(['Upload failed. Please try again.']);
          setSelectedFiles(validFiles); // Keep files so user can retry
        } finally {
          setUploading(false);
        }
      }
    },
    [selectedFiles, maxImages, maxSizePerImage, acceptedTypes, userId, entityType, entityId, onUploadComplete]
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
    } catch (error) {
      console.error('Upload failed:', error);
      setErrors(['Upload failed. Please try again.']);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {!uploading && (
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
            <p className="text-gray-600">Click or drag images to upload</p>
          )}
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="border-2 border-dashed border-primary-400 bg-primary-50 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">⬆️</div>
          <p className="text-primary-600 font-medium">Uploading to S3...</p>
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
          {selectedFiles.length > 0 && (
            <button
              onClick={uploadFiles}
              className="mt-2 text-sm text-red-700 underline hover:text-red-800"
            >
              Retry upload
            </button>
          )}
        </div>
      )}
    </div>
  );
}
