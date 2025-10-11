import React, { useMemo } from "react";
import ExerciseCard from "./ExerciseCard";

export default function ExerciseGrid({ exercises = [], onAdd, selectedMuscle, search }) {
  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      if (!exercise?.name) return false;

      const matchesMuscle = selectedMuscle
        ? (exercise.muscleGroup || "").toLowerCase() === selectedMuscle.toLowerCase()
        : true;

      const matchesSearch = search
        ? exercise.name.toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesMuscle && matchesSearch;
    });
  }, [exercises, selectedMuscle, search]);

  if (!filteredExercises.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500">
        No exercises found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredExercises.map(exercise => (
        <ExerciseCard key={exercise.id} exercise={exercise} onAdd={onAdd} />
      ))}
    </div>
  );
}
