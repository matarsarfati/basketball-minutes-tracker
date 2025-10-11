import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

const UploadToStorage = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadURL, setDownloadURL] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setDownloadURL(null);

      // Create a reference to the file in Firebase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`);

      // Start upload with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Update progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          // Handle errors
          console.error('Upload error:', error);
          setError('Failed to upload file. Please try again.');
          setIsUploading(false);
        },
        async () => {
          // Upload completed successfully
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setDownloadURL(url);
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      );
    } catch (err) {
      console.error('Upload error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <div className="flex flex-col gap-4">
        <input
          type="file"
          onChange={handleUpload}
          disabled={isUploading}
          ref={fileInputRef}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-600 rounded transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}

        {downloadURL && (
          <div className="p-4 bg-green-50 rounded-md">
            <p className="text-green-700 font-medium mb-2">
              ✅ Upload complete!
            </p>
            <p className="text-sm text-gray-600 break-all">
              Download URL: {downloadURL}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadToStorage;
