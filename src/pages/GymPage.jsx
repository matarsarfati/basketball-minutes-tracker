import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PlanBuilderModal from '../components/gym/PlanBuilderModal';
import ExerciseLibrarySettings from '../components/gym/ExerciseLibrarySettings';
import { savePlans, loadPlans } from '../services/planService';
import { nanoid } from 'nanoid';
import { 
  fetchExercises, 
  addExercise, 
  uploadMultipleImages,
  uploadExerciseImage,
  updateExerciseOrder
} from '../services/exerciseService';
import ImageUploadModal from '../components/gym/ImageUploadModal';
import { loadExercises, saveExercises } from '../services/firestoreService';

const GymPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null); // Add state for current plan ID
  const [minimizedPlans, setMinimizedPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [planPositions, setPlanPositions] = useState({}); // State to store plan positions
  const [showMessage, setShowMessage] = useState(false); // Add state for showing message

  const [muscleGroups, setMuscleGroups] = useState([]);
  
  const [plans, setPlans] = useState([]);
  const [openPlanIds, setOpenPlanIds] = useState([]);
  const [editModes, setEditModes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedExercise, setDraggedExercise] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visibleGroups, setVisibleGroups] = useState([]);  // Will be populated when muscleGroups loads

  // Update visibleGroups when muscleGroups changes
  useEffect(() => {
    if (muscleGroups.length > 0) {
      setVisibleGroups(muscleGroups.map(group => group.name));
    }
  }, [muscleGroups]);

  // Add migration function
  const migrateExerciseCategories = (exercises, groups) => {
    const groupNames = groups.map(g => g.name);
    
    return exercises.map(ex => {
      let category = ex.muscleGroup || ex.muscle_group || 'Other';
      
      // Fix common typos
      const fixes = {
        'Playomtric': 'Plyometric',
        'Sholders': 'Shoulders',
        'Uncategorized': 'Other'
      };
      
      if (fixes[category]) {
        category = fixes[category];
      }
      
      // If category doesn't exist in groups, add it
      if (!groupNames.includes(category) && category !== 'Other') {
        groups.push({ name: category, rows: 2 });
      }
      
      return {
        ...ex,
        muscleGroup: category,
        muscle_group: undefined // Remove old property
      };
    });
  };

  // Load data from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const exercises = await loadExercises();
        const savedGroups = localStorage.getItem('muscle_groups');
        let groups = savedGroups ? JSON.parse(savedGroups) : [
          { name: 'Plyometric', rows: 2 },
          { name: 'Functional Power', rows: 2 },
          { name: 'Legs', rows: 2 },
          { name: 'Push', rows: 2 },
          { name: 'Pull', rows: 2 },
          { name: 'Arms', rows: 2 },
          { name: 'Core', rows: 2 },
          { name: 'Calf', rows: 2 },
          { name: 'Glutes', rows: 2 },
          { name: 'Shoulders', rows: 2 }
        ];
        
        // Migrate and fix data
        console.log('Running category migration...');
        console.log('Before migration:', { exercises, groups });
        
        const fixedExercises = migrateExerciseCategories(exercises, groups);
        
        console.log('After migration:', { 
          exercises: fixedExercises, 
          groups,
          categories: [...new Set(fixedExercises.map(ex => ex.muscleGroup))]
        });
        
        setCustomExercises(fixedExercises);
        setMuscleGroups(groups);
        
        // Save fixed data
        await saveExercises(fixedExercises);
        localStorage.setItem('muscle_groups', JSON.stringify(groups));
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load exercises');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    loadPlans()
      .then(savedPlans => {
        const plansArray = Array.isArray(savedPlans) ? savedPlans : [];
        setPlans(plansArray);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load plans:', err);
        setError('Failed to load workout plans');
        setIsLoading(false);
        setPlans([]);
      });
  }, []); // Only run on mount

  // Save exercises to Firestore when they change
  useEffect(() => {
    if (!isLoading && customExercises.length > 0) {
      saveExercises(customExercises).catch(err => {
        console.error('Failed to save exercises:', err);
      });
    }
  }, [customExercises, isLoading]);

  // Save muscle groups to localStorage when they change
  useEffect(() => {
    if (!isLoading && muscleGroups.length > 0) {
      localStorage.setItem('muscle_groups', JSON.stringify(muscleGroups));
      console.log('✅ Muscle groups saved to localStorage:', muscleGroups);
    }
  }, [muscleGroups, isLoading]);

  const createNewPlan = () => {
    const newPlan = {
      id: crypto.randomUUID(),
      name: 'New Workout Plan',
      exercises: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const initialPosition = {
      x: window.innerWidth - 800, // Changed from 520
      y: 20
    };

    const initialSize = {
      width: 750, // Added initial width
      height: 600 // Added initial height
    };

    setPlans(prev => [...prev, newPlan]);
    setOpenPlanIds(prev => [...prev, newPlan.id]);
    setEditModes(prev => ({ ...prev, [newPlan.id]: true }));
    setPlanPositions(prev => ({ ...prev, [newPlan.id]: { ...initialPosition, ...initialSize } }));
    setCurrentPlanId(newPlan.id); // Ensure the new plan is set as current
    setActivePlanId(newPlan.id); // Ensure the new plan is set as active
    return newPlan.id;
  };

  const duplicatePlan = (planId) => {
    const originalPlan = plans.find(p => p.id === planId);
    if (!originalPlan) return;
    
    const duplicatedPlan = {
      ...originalPlan,
      id: crypto.randomUUID(),
      name: `${originalPlan.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: JSON.parse(JSON.stringify(originalPlan.exercises))
    };
    
    setPlans([...plans, duplicatedPlan]);
    setOpenPlanIds([...openPlanIds, duplicatedPlan.id]);
  };

  const openPlan = (planId) => {
    setOpenPlanIds(prev => [...prev, planId]);
    setCurrentPlanId(planId); // Set as current plan when opening
  };

  const closePlan = (planId) => {
    setOpenPlanIds(prev => prev.filter(id => id !== planId));
    if (currentPlanId === planId) {
      setCurrentPlanId(null);
    }
  };

  const minimizePlan = (planId) => {
    setMinimizedPlans(prev => [...prev, planId]);
    setOpenPlanIds(prev => prev.filter(id => id !== planId));
  };

  const restorePlan = (planId) => {
    const scrollPosition = window.scrollY; // Get current scroll position

    // Calculate new position relative to the current viewport
    const newPosition = {
      x: window.innerWidth - 520,
      y: scrollPosition + 20 // Small margin from the top of the current viewport
    };

    setMinimizedPlans(prev => prev.filter(id => id !== planId));
    setOpenPlanIds(prev => [...prev, planId]);
    setPlanPositions(prev => ({ ...prev, [planId]: newPosition })); // Save the new position
  };

  const setActiveWorkoutPlan = (planId) => {
    setActivePlanId(planId);
    setCurrentPlanId(planId); // Ensure the active plan is also set as current
  };

  const renamePlan = (planId, newName) => {
    setPlans(plans.map(plan =>
      plan.id === planId
        ? { ...plan, name: newName, updatedAt: new Date() }
        : plan
    ));
  };

  const deletePlan = (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      setPlans(plans.filter(p => p.id !== planId));
      closePlan(planId);
    }
  };

  const updatePlan = async (planId, updatedExercises) => {
    try {
      const updatedPlan = {
        ...plans.find(p => p.id === planId),
        exercises: updatedExercises,
        updatedAt: new Date()
      };

      // Save to localStorage first
      await savePlans([
        ...plans.filter(p => p.id !== planId),
        updatedPlan
      ]);

      // Then update state once
      setPlans(prev => prev.map(p => 
        p.id === planId ? updatedPlan : p
      ));
    } catch (err) {
      console.error('Failed to update plan:', err);
      setError('Failed to update plan');
    }
  };

  const toggleEditMode = (planId, value) => {
    setEditModes({
      ...editModes,
      [planId]: value
    });
  };

  const organizedExercises = useMemo(() => {
    const groupedExercises = (Array.isArray(customExercises) ? customExercises : [])
      .reduce((acc, exercise) => {
        const group = exercise?.muscleGroup || 'Other';
        if (!acc[group]) {
          acc[group] = [];
        }
        acc[group].push(exercise);
        return acc;
      }, {});

    return Object.entries(groupedExercises).map(([groupName, exercises]) => ({
      id: groupName.toLowerCase().replace(/\s+/g, '-'),
      name: groupName,
      exercises: exercises
    }));
  }, [customExercises]);

  const handleDeleteExercise = (exerciseId) => {
    if (window.confirm('Are you sure you want to delete this exercise?')) {
      setCustomExercises(prev => prev.filter(ex => ex.id !== exerciseId));
    }
  };

  const handleImageDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadedImages(files);
    setShowUploadModal(true);
    setCurrentImageIndex(0);
  }, []);

  const handleSaveExercise = async (index, details) => {
    try {
      const file = uploadedImages[index];
      const imageUrl = await uploadExerciseImage(file);

      const newExercise = {
        id: crypto.randomUUID(),
        name: details.name,
        muscleGroup: details.muscleGroup, // Ensure consistent property name
        imageUrl: imageUrl
      };

      setCustomExercises(prev => [...prev, newExercise]);

      if (index < uploadedImages.length - 1) {
        setCurrentImageIndex(index + 1);
      } else {
        setShowUploadModal(false);
        setUploadedImages([]);
        setCurrentImageIndex(0);
      }
    } catch (error) {
      console.error('Failed to save exercise:', error);
      alert('Failed to save exercise. Please try again.');
    }
  };

  const handleAddExercise = async (muscleGroup) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      try {
        console.log('Adding new exercises for group:', muscleGroup);

        // Upload images to Firebase Storage
        const newExercises = await Promise.all(files.map(async (file) => {
          const imageUrl = await uploadExerciseImage(file);
          return {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, '').replace(/-|_/g, ' '),
            muscleGroup: muscleGroup,
            imageUrl: imageUrl // Use the Firebase Storage URL
          };
        }));
        
        setCustomExercises(prev => [...prev, ...newExercises]);
      } catch (error) {
        console.error('Failed to add exercises:', error);
        alert('Failed to upload images. Please try again.');
      }
    };
    
    input.click();
  };

  const reorderExercises = async (draggedExercise, targetIndex) => {
    if (!draggedExercise) return;

    try {
      await updateExerciseOrder(draggedExercise.id, targetIndex);
      const updatedExercises = await fetchExercises();
      setCustomExercises(updatedExercises);
    } catch (error) {
      console.error('Error reordering exercises:', error);
    }
  };

  const handleDeleteMuscleGroup = (groupToDelete) => {
    setMuscleGroups(prev => prev.filter(group => group !== groupToDelete));
    setCustomExercises(prev => prev.map(exercise =>
      exercise.muscleGroup === groupToDelete
        ? { ...exercise, muscleGroup: 'Other' }
        : exercise
    ));
  };

  const handleDragStart = (e, exercise, sectionIndex = null) => {
    if (sectionIndex !== null) {
      e.dataTransfer.setData('application/json', JSON.stringify({
        exerciseId: exercise,
        sourceSectionIndex: sectionIndex
      }));
    } else {
      setDraggedExercise(exercise);
    }
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedExercise(null);
  };

  const handleDragOver = (e, targetExerciseId, targetSectionIndex) => {
    e.preventDefault();
    
    // Handle drop indicator
    const dropIndicator = document.getElementById(`drop-indicator-${targetExerciseId}`);
    if (dropIndicator) {
      dropIndicator.classList.add('active');
    }

    // Handle exercise reordering
    if (draggedExercise && draggedExercise.id !== targetExerciseId) {
      const updatedExercises = [...customExercises];
      const dragIndex = updatedExercises.findIndex(ex => ex.id === draggedExercise.id);
      const dropIndex = updatedExercises.findIndex(ex => ex.id === targetExerciseId);

      updatedExercises.splice(dragIndex, 1);
      updatedExercises.splice(dropIndex, 0, draggedExercise);

      setCustomExercises(updatedExercises);
    }
  };

  const handleDragLeave = (e, targetExerciseId) => {
    const dropIndicator = document.getElementById(`drop-indicator-${targetExerciseId}`);
    if (dropIndicator) {
      dropIndicator.classList.remove('active');
    }
  };

  const handleDrop = (e, targetExerciseId, targetSectionIndex) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { exerciseId, sourceSectionIndex } = data;

      if (sourceSectionIndex === targetSectionIndex && exerciseId === targetExerciseId) {
        return;
      }

      const planToUpdate = plans.find(p => p.id === currentPlanId);
      if (!planToUpdate) return;

      const updatedExercises = [...planToUpdate.exercises];
      const sourceExercise = updatedExercises.find(ex => ex.id === exerciseId);
      const targetExercise = updatedExercises.find(ex => ex.id === targetExerciseId);

      if (!sourceExercise || !targetExercise) return;

      updatedExercises.splice(updatedExercises.indexOf(sourceExercise), 1);
      updatedExercises.splice(updatedExercises.indexOf(targetExercise) + 1, 0, sourceExercise);

      updatePlan(currentPlanId, updatedExercises);
    } catch (error) {
      console.error('Drop failed:', error);
    }
  };

  const handleExerciseClick = (exercise) => {
    // Check if we have an active plan
    if (!currentPlanId) {
      setShowMessage(true);
      return;
    }
  
    const currentPlan = plans.find(p => p.id === currentPlanId);
    if (!currentPlan) return;
  
    // Create a copy of the exercise with a new ID
    const exerciseCopy = {
      ...exercise,
      id: crypto.randomUUID(),
      sets: '3',        // Default values
      reps: '12',       // Default values
      repType: 'reps'   // Default values
    };
  
    // Add the exercise to the plan
    const updatedPlan = {
      ...currentPlan,
      exercises: [...(currentPlan.exercises || []), exerciseCopy],
      updatedAt: new Date()
    };
  
    // Update plans state
    setPlans(prev => 
      prev.map(p => p.id === currentPlanId ? updatedPlan : p)
    );
  
    // Save changes
    try {
      savePlans([
        ...plans.filter(p => p.id !== currentPlanId),
        updatedPlan
      ]);
    } catch (err) {
      console.error('Failed to save plan:', err);
      setError('Failed to save plan');
    }
  };

  const savePlan = async (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const updatedPlan = {
      ...plan,
      updatedAt: new Date()
    };

    try {
      // First save to localStorage
      await savePlans([
        ...plans.filter(p => p.id !== planId), 
        updatedPlan
      ]);
      
      // Then update state once
      setPlans(prev => prev.map(p => 
        p.id === planId ? updatedPlan : p
      ));
    } catch (err) {
      console.error('Failed to save plan:', err);
      setError('Failed to save plan');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-600">Loading workout plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleImageDrop}
      >
        <p className="text-gray-500">
          Drag and drop images here to create new exercises
        </p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
          />
        </div>
        <div className="flex items-center gap-4 ml-4">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg ${
              isEditMode 
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-100 hover:bg-gray-200'
            } text-sm`}
          >
            {isEditMode ? 'Done Editing' : '✏️ Edit Order'}
          </button>
          <button
            onClick={createNewPlan}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            + New Plan
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {Array.isArray(muscleGroups) && muscleGroups.map((group) => {
          const groupExercises = customExercises.filter(ex => ex.muscleGroup === group.name);
          
          if (groupExercises.length === 0) {
            console.log(`No exercises found for group ${group.name}`);
            return null;
          }
          
          console.log(`Displaying ${groupExercises.length} exercises for ${group.name}`);
          
          return (
            <div key={group.name}>
              <h3 className="text-xl font-bold mb-4 text-gray-800">{group.name}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {groupExercises.map(exercise => (
                  <div 
                    key={exercise.id} 
                    className="cursor-pointer hover:opacity-80 transition bg-white rounded-lg shadow-sm p-2"
                    onClick={() => handleExerciseClick(exercise)}
                    draggable={isEditMode}
                    onDragStart={(e) => handleDragStart(e, exercise)}
                    onDragEnd={handleDragEnd}
                  >
                    <img 
                      src={exercise.imageUrl} 
                      alt={exercise.name} 
                      className="w-full h-40 object-cover rounded-lg mb-2"
                    />
                    <p className="text-sm text-center truncate">{exercise.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showUploadModal && (
        <ImageUploadModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setUploadedImages([]);
            setCurrentImageIndex(0);
          }}
          images={uploadedImages}
          muscleGroups={muscleGroups}
          onSaveExercise={handleSaveExercise}
          currentIndex={currentImageIndex}
        />
      )}

      {showSettings && (
        <ExerciseLibrarySettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          muscleGroups={muscleGroups}
          visibleGroups={visibleGroups}
          onToggleVisibility={(groupName) => {
            setVisibleGroups(prev => 
              prev.includes(groupName) 
                ? prev.filter(g => g !== groupName)
                : [...prev, groupName]
            );
          }}
          onMoveGroup={(index, direction) => {
            const newGroups = [...muscleGroups];
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]];
            setMuscleGroups(newGroups);
          }}
          onAddMuscleGroup={(newGroupName) => {
            setMuscleGroups(prev => [...prev, { name: newGroupName, rows: 2 }]);
          }}
          onDeleteGroup={(groupName) => {
            setMuscleGroups(prev => prev.filter(g => g.name !== groupName));
          }}
          onUpdateGroupRows={(groupName, rows) => {
            setMuscleGroups(prev => 
              prev.map(g => g.name === groupName ? { ...g, rows } : g)
            );
          }}
        />
      )}

      {showMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold mb-4">No Active Plan</h3>
            <p className="mb-4">Please select or create a workout plan first.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={createNewPlan}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create New Plan
              </button>
              <button
                onClick={() => setShowMessage(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 border-t flex items-center p-2 gap-2">
        {minimizedPlans.map(planId => {
          const plan = plans.find(p => p.id === planId);
          if (!plan) return null;

          return (
            <div 
              key={planId}
              className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50
                ${activePlanId === planId ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
              onClick={() => {
                restorePlan(planId);
                setActiveWorkoutPlan(planId);
              }}
            >
              <span className="text-sm font-medium truncate max-w-[150px]">
                {plan.name}
              </span>
            </div>
          );
        })}
      </div>

      {openPlanIds.map((planId) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return null;
        
        return (
          <PlanBuilderModal
            key={planId}
            isOpen={true}
            onClose={() => closePlan(planId)}
            plan={plan.exercises || []}
            onUpdatePlan={(exercises) => updatePlan(planId, exercises)}
            isEditMode={editModes[planId] || false}
            onToggleEditMode={(value) => toggleEditMode(planId, value)}
            exercises={customExercises}
            initialPosition={planPositions[planId] || { x: window.innerWidth - 520, y: 20 }}
            planName={plan.name}
            onDuplicate={() => duplicatePlan(planId)}
            onMinimize={() => minimizePlan(planId)}
            onSave={() => savePlan(planId)}
            isActive={activePlanId === planId}
            onActivate={() => setActiveWorkoutPlan(planId)}
            onRenamePlan={(newName) => renamePlan(planId, newName)} // Pass renamePlan function
          />
        );
      })}
    </div>
  );
};

export default GymPage;