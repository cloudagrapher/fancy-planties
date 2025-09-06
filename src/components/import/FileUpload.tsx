'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
  className?: string;
}

export function FileUpload({
  onFileSelect,
  acceptedTypes = ['.csv', 'text/csv', 'application/vnd.ms-excel'],
  maxSize = 5 * 1024 * 1024, // 5MB
  className = '',
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isValidType) {
      return 'Please select a CSV file';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {!selectedFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-200 hover:border-primary-300 hover:bg-primary-50
            ${isDragOver 
              ? 'border-primary-400 bg-primary-100' 
              : error 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 bg-gray-50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              p-3 rounded-full 
              ${error ? 'bg-red-100' : 'bg-primary-100'}
            `}>
              {error ? (
                <AlertCircle className="w-8 h-8 text-red-500" />
              ) : (
                <Upload className="w-8 h-8 text-primary-500" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                {isDragOver ? 'Drop your CSV file here' : 'Upload CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                Drag and drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Max size: {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <File className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}