import React, { useState, useEffect } from 'react';

const ExerciseEditModal = ({ exercise, muscleGroups, onSave, onClose }) => {
    const [name, setName] = useState(exercise.name);
    const [muscleGroup, setMuscleGroup] = useState(exercise.muscleGroup);
    const [videoUrl, setVideoUrl] = useState(exercise.videoUrl || '');

    useEffect(() => {
        setName(exercise.name);
        setMuscleGroup(exercise.muscleGroup);
        setVideoUrl(exercise.videoUrl || '');
    }, [exercise]);

    const handleSave = () => {
        onSave({
            ...exercise,
            name,
            muscleGroup,
            videoUrl
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">
                    Edit Exercise
                </h3>

                <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Exercise Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Muscle Group Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Muscle Group
                        </label>
                        <select
                            value={muscleGroup}
                            onChange={(e) => setMuscleGroup(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {muscleGroups.map(group => (
                                <option key={group.name} value={group.name}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Video URL Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            YouTube Video URL
                        </label>
                        <input
                            type="text"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/..."
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Paste a YouTube link to show a video for this exercise.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExerciseEditModal;
