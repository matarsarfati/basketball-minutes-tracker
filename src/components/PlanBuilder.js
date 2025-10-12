import { useState, forwardRef, useImperativeHandle } from 'react';
// ...existing code...

const PlanBuilder = forwardRef(({ onAddExercise }, ref) => {
  const [exercises, setExercises] = useState([]);

  const handleAddExercise = (exercise) => {
    console.log('Adding exercise to plan:', exercise); // Debug log
    setExercises((prev) => {
      console.log('Previous exercises:', prev); // Debug log
      return [...prev, exercise];
    });

    if (onAddExercise) {
      onAddExercise(exercise);
    }
  };

  useImperativeHandle(ref, () => ({
    handleAddExercise
  }));

  return (
    <div className="plan-builder">
      <h2>Current Plan</h2>
      {exercises.map((exercise, index) => (
        <div key={`${exercise.id}-${index}`} className="plan-exercise-item">
          <span>{exercise.name}</span>
        </div>
      ))}
    </div>
  );
});

export default PlanBuilder;
