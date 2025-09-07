'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  onImagesChange: (files: File[]) => void;
  onUpload?: (files: File[]) => Promise<string[]>; // Returns URLs of uploaded images
  maxImages?: number;
  maxSizePerImage?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
  showUploadProgress?: boolean;
}

export default function ImageUpload({
  onImagesChange,
  onUpload,
  maxImages = 6,
  maxSizePerImage = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = '',
  showUploadProgress = false,
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual click handler for better reliability
  const handleClick = useCallback(() => {
    if (fileInputRef.current && selectedFiles.length < maxImages) {
      fileInputRef.current.click();
    }
  }, [selectedFiles.length, maxImages]);

  // Handle file selection
  const handleFiles = useCallback((files: File[]) => {
    const newErrors: string[] = [];
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    // Check if adding these files would exceed the limit
    if (selectedFiles.length + files.length > maxImages) {
      newErrors.push(`Maximum ${maxImages} images allowed`);
      return;
    }

    files.forEach((file) => {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        newErrors.push(`${file.name}: Invalid file type. Please use JPEG, PNG, or WebP.`);
        return;
      }

      // Check file size
      if (file.size > maxSizePerImage) {
        const maxSizeMB = Math.round(maxSizePerImage / (1024 * 1024));
        newErrors.push(`${file.name}: File too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      // Check for duplicates
      if (selectedFiles.some(existing => existing.name === file.name && existing.size === file.size)) {
        newErrors.push(`${file.name}: File already selected.`);
        return;
      }

      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          
          // Update previews when all files are processed
          if (newPreviews.length === validFiles.length) {
            setPreviews(prev => [...prev, ...newPreviews]);
          }
        }
      };
      reader.onerror = () => {
        newErrors.push(`${file.name}: Failed to read file.`);
        setErrors(prev => [...prev, ...newErrors]);
      };
      reader.readAsDataURL(file);
    });

    if (validFiles.length > 0) {
      const updatedFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(updatedFiles);
      onImagesChange(updatedFiles);
    }

    setErrors(newErrors);
  }, [selectedFiles, maxImages, maxSizePerImage, acceptedTypes, onImagesChange]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFiles,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxImages - selectedFiles.length,
    disabled: selectedFiles.length >= maxImages,
  });

  // Remove file
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onImagesChange(newFiles);
    setErrors([]);
  };

  // Upload files
  const uploadFiles = async () => {
    if (!onUpload || selectedFiles.length === 0) return;

    setIsUploading(true);
    setErrors([]);

    try {
      // Simulate upload progress for each file
      selectedFiles.forEach((file, index) => {
        const fileKey = `${file.name}-${index}`;
        setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));
        
        // Simulate progress
        const interval = setInterval(() => {
          setUploadProgress(prev => {
            const currentProgress = prev[fileKey] || 0;
            if (currentProgress >= 100) {
              clearInterval(interval);
              return prev;
            }
            return { ...prev, [fileKey]: Math.min(currentProgress + 10, 100) };
          });
        }, 100);
      });

      const uploadedUrls = await onUpload(selectedFiles);
      
      // Clear progress after successful upload
      setUploadProgress({});
      
      // Optionally clear files after upload
      // setSelectedFiles([]);
      // setPreviews([]);
      
    } catch (error) {
      setErrors(['Upload failed. Please try again.']);
    } finally {
      setIsUploading(false);
    }
  };

  // Clear all files
  const clearAll = () => {
    setSelectedFiles([]);
    setPreviews([]);
    onImagesChange([]);
    setErrors([]);
    setUploadProgress({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {selectedFiles.length < maxImages && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} ref={fileInputRef} />
          
          <div className="space-y-2">
            <div className="text-4xl">📷</div>
            
            {isDragActive ? (
              <p className="text-primary-600 font-medium">Drop images here...</p>
            ) : (
              <>
                <p className="text-gray-600">
                  <button
                    type="button"
                    onClick={handleClick}
                    className="font-medium text-primary-600 hover:text-primary-700 underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                  >
                    Click to upload
                  </button>{' '}
                  or drag and drop
                </p>
                <p className="text-sm text-gray-500">
                  JPEG, PNG, or WebP up to {Math.round(maxSizePerImage / (1024 * 1024))}MB each
                </p>
                <p className="text-xs text-gray-400">
                  {selectedFiles.length} of {maxImages} images selected
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">Upload Errors</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Selected Images Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Selected Images ({selectedFiles.length})
            </h4>
            <div className="flex items-center space-x-2">
              {showUploadProgress && onUpload && selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className={`px-3 py-1 text-sm rounded ${
                    isUploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-red-600 hover:text-red-700"
                disabled={isUploading}
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                {/* Image Preview */}
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {previews[index] ? (
                    <img
                      src={previews[index]}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
                    </div>
                  )}
                </div>
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove image"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Primary Badge */}
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-primary-500 text-white text-xs px-1 py-0.5 rounded">
                    Primary
                  </div>
                )}
                
                {/* Upload Progress */}
                {showUploadProgress && uploadProgress[`${file.name}-${index}`] !== undefined && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                      <div className="text-xs">{uploadProgress[`${file.name}-${index}`]}%</div>
                    </div>
                  </div>
                )}

                {/* File Info */}
                <div className="mt-1 text-xs text-gray-500 truncate">
                  <div className="truncate" title={file.name}>{file.name}</div>
                  <div>{formatFileSize(file.size)}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Upload Tips */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <p><strong>Tip:</strong> The first image will be used as the primary photo for your plant card.</p>
          </div>
        </div>
      )}
    </div>
  );
}