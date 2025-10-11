import React, { useState } from 'react';

const DragDropZone = ({ onImageDrop }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) return;

    const reader = new FileReader();
    reader.onload = () => {
      onImageDrop(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`
        flex items-center justify-center p-4 border-2 border-dashed rounded-lg
        transition-colors duration-200 h-40
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
      `}
    >
      <div className="text-center text-gray-500">
        <span className="icon text-2xl">+</span>
        <p>Drop image here to add exercise</p>
      </div>
    </div>
  );
};

export default DragDropZone;
