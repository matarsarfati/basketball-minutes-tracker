import React from 'react';
import { X, Combine } from 'lucide-react';
import courtImage from '../assets/court-survey.png';
import gymImage from '../assets/gym-survey.png';

export default function SurveySelectionModal({ isOpen, onClose, onSelect }) {
    if (!isOpen) return null;

    const choices = [
        {
            id: 'court',
            label: 'Court Survey',
            description: 'Log court RPE & volume',
            image: courtImage,
            color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
            textColor: 'text-orange-700',
            iconColor: 'text-orange-600'
        },
        {
            id: 'combined',
            label: 'Combined',
            description: 'Fill both surveys at once',
            icon: Combine,
            color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
            textColor: 'text-indigo-700',
            iconColor: 'text-indigo-600',
            isSpecial: true
        },
        {
            id: 'gym',
            label: 'Gym Survey',
            description: 'Log weights & intensity',
            image: gymImage,
            color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
            textColor: 'text-blue-700',
            iconColor: 'text-blue-600'
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 opacity-100">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8 text-center pb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Select Survey</h2>
                    <p className="text-gray-500 text-lg">Choose which data you want to log for this session</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 pt-2 bg-gray-50/50">
                    {choices.map((choice) => (
                        <button
                            key={choice.id}
                            onClick={() => onSelect(choice.id)}
                            className={`
                relative flex flex-col items-center group
                bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300
                border-2 ${choice.isSpecial ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-gray-100 hover:border-gray-200'}
                overflow-hidden h-full
              `}
                        >
                            <div className="w-full aspect-video relative overflow-hidden bg-gray-100">
                                {choice.icon ? (
                                    <div className={`w-full h-full flex items-center justify-center ${choice.color}`}>
                                        <choice.icon className={`w-20 h-20 ${choice.iconColor}`} opacity={0.8} />
                                    </div>
                                ) : (
                                    <img
                                        src={choice.image}
                                        alt={choice.label}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                )}

                                {/* Overlay gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            <div className="p-6 text-center w-full flex-1 flex flex-col justify-center">
                                <h3 className={`text-xl font-bold mb-2 ${choice.textColor}`}>
                                    {choice.label}
                                </h3>
                                <p className="text-gray-500 text-sm font-medium">
                                    {choice.description}
                                </p>
                            </div>

                            {choice.isSpecial && (
                                <div className="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                    Recommended
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
