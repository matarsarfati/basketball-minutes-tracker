import React from "react";

export default function ExerciseCard({ exercise, onAdd }) {
  const handleImageError = event => {
    event.currentTarget.style.display = "none";
    event.currentTarget.parentElement?.insertAdjacentHTML(
      "beforeend",
      "<div class=\"w-full h-full flex items-center justify-center text-gray-400 text-xs\">No image</div>"
    );
  };

  const handleAddClick = () => {
    if (typeof onAdd === "function") {
      onAdd(exercise);
    }
  };

  return (
    <div className="w-[220px] rounded-2xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition flex flex-col">
      <div className="w-full h-40 rounded-lg border border-gray-200 bg-white p-1 mb-3 overflow-hidden">
        {exercise?.image ? (
          <img
            src={exercise.image}
            alt={exercise?.name || "Exercise"}
            className="w-full h-full object-contain object-center block"
            loading="lazy"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No image
          </div>
        )}
      </div>

      <h3 className="font-semibold leading-tight">{exercise?.name}</h3>
      <p className="text-xs text-gray-500 mb-3">{exercise?.muscleGroup}</p>

      <button
        type="button"
        onClick={handleAddClick}
        className="mt-auto inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 focus:ring focus:ring-offset-2"
      >
        Add to Plan
      </button>
    </div>
  );
}
