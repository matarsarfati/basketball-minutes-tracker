// ...existing code...

const handleDeleteExercise = (index) => {
  if (window.confirm('Remove this exercise from the plan?')) {
    const newPlan = [...plan];
    newPlan.splice(index, 1);
    onUpdatePlan(newPlan);
  }
};

// ...existing code...

{plan.map((exercise, currentIndex) => (
  <div key={currentIndex} className="exercise-card">
    {/* ...existing code... */}
    <button 
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteExercise(currentIndex);
      }}
      className="icon-button text-sm hover:bg-red-100 hover:text-red-600 rounded-full w-6 h-6 flex items-center justify-center"
    >
      ×
    </button>
    {/* ...existing code... */}
  </div>
))}

// ...existing code...
