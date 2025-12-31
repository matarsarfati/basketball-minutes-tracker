import React, { useRef, useEffect, useState } from 'react';

const VideoPlayerModal = ({ isOpen, onClose, videoUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    // Extract Video ID from various YouTube URL formats
    const getVideoId = (url) => {
        if (!url) return null;
        // שים לב לתוספת של "shorts\/" ברג'קס למטה:
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getVideoId(videoUrl);

    // Close when clicking outside content
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !videoId) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100]"
            onClick={handleBackdropClick}
        >
            <div className="bg-black rounded-lg overflow-hidden shadow-2xl relative w-[80vw] max-w-[800px] aspect-video">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-white bg-black bg-opacity-50 hover:bg-opacity-80 rounded-full w-8 h-8 flex items-center justify-center font-bold z-10"
                >
                    ×
                </button>
                <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    title="Exercise Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default VideoPlayerModal;
