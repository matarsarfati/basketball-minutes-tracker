import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PlanBuilderModal from '../components/gym/PlanBuilderModal';
import ExerciseLibrarySettings from '../components/gym/ExerciseLibrarySettings';
import { savePlans, loadPlans } from '../services/planService';
import { 
  uploadExerciseImage,
  updateExerciseOrder
} from '../services/exerciseService';
import ImageUploadModal from '../components/gym/ImageUploadModal';
import { loadExercises, saveExercises } from '../services/firestoreService';
import MuscleGroupEditModal from '../components/gym/MuscleGroupEditModal';

const GymPage = () => {
  // Add validation helper at the top
  const validateMuscleGroup = useCallback((group) => {
    return group && 
      typeof group === 'object' && 
      typeof group.name === 'string' &&
      typeof group.rows === 'number';
  }, []);

  // Default muscle groups - source of truth
  const defaultMuscleGroups = [
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

  // Category fix map for common typos
  const categoryFixMap = {
    'Playomtric': 'Plyometric',
    'Playometric': 'Plyometric',
    'Sholders': 'Shoulders',
    'Shoulder': 'Shoulders',
    'Uncategorized': 'Other',
    'arm': 'Arms',
    'leg': 'Legs',
    'push': 'Push',
    'pull': 'Pull',
    'core': 'Core',
    'calf': 'Calf',
    'glutes': 'Glutes',
    'glute': 'Glutes'
  };

  // State declarations
  const [searchQuery, setSearchQuery] = useState('');
  const [customExercises, setCustomExercises] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [minimizedPlans, setMinimizedPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [planPositions, setPlanPositions] = useState({});
  const [showMessage, setShowMessage] = useState(false);
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
  const [visibleGroups, setVisibleGroups] = useState([]);
  const [dragTargetIndex, setDragTargetIndex] = useState(null); // Add new state for tracking drag target index
  const [editingExercise, setEditingExercise] = useState(null);

  // Add safety check helper
  const isValidGroup = useCallback((group) => {
    return group && typeof group === 'object' && typeof group.name === 'string';
  }, []);

  // Normalize category names
  const normalizeCategory = useCallback((category) => {
    if (!category) return 'Other';
    
    const trimmed = category.trim();
    
    // Check fix map (case-insensitive)
    const fixedCategory = categoryFixMap[trimmed] || 
      Object.entries(categoryFixMap).find(([key]) => 
        key.toLowerCase() === trimmed.toLowerCase()
      )?.[1];
    
    if (fixedCategory) return fixedCategory;
    
    // Check existing muscle groups with null safety
    const matchedGroup = muscleGroups.find(g => 
      isValidGroup(g) && g.name.toLowerCase() === trimmed.toLowerCase()
    );
    
    if (matchedGroup) return matchedGroup.name;
    
    return trimmed;
  }, [muscleGroups, isValidGroup]);

  // Clean exercise data
  const cleanExerciseData = useCallback((exercise) => {
    const cleaned = {
      id: exercise.id || crypto.randomUUID(),
      name: exercise.name?.trim() || 'Unnamed Exercise',
      muscleGroup: normalizeCategory(exercise.muscleGroup || exercise.muscle_group),
      imageUrl: exercise.imageUrl || ''
    };

    return Object.fromEntries(
      Object.entries(cleaned).filter(([_, value]) => value !== undefined)
    );
  }, [normalizeCategory]);

  // Update visibleGroups when muscleGroups changes
  useEffect(() => {
    if (muscleGroups.length > 0) {
      setVisibleGroups(muscleGroups.map(group => group.name));
    }
  }, [muscleGroups]);

  // Migration function to remove duplicates
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
      
      // Add missing categories to groups (avoid duplicates)
      if (!groupNames.includes(category) && category !== 'Other') {
        groups.push({ name: category, rows: 2 });
        groupNames.push(category);
      }
      
      return {
        ...ex,
        muscleGroup: category,
        muscle_group: undefined
      };
    });
  };

  // Remove duplicate groups helper
  const removeDuplicateGroups = (groups) => {
    const seen = new Set();
    return groups.filter(group => {
      // Add null safety check
      if (!group || !group.name) return false;
      
      const key = group.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Load exercises and muscle groups on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load exercises from Firestore only
        const exercises = await loadExercises();
        console.log('📦 Loaded exercises:', exercises.length);
        
        // Load muscle groups from localStorage
        const savedGroups = localStorage.getItem('muscle_groups');
        let groups = savedGroups ? JSON.parse(savedGroups) : [...defaultMuscleGroups];
        
        // Clean and process data
        groups = removeDuplicateGroups(groups);
        const fixedExercises = migrateExerciseCategories(exercises, groups);
        groups = removeDuplicateGroups(groups);

        // Update state
        setCustomExercises(fixedExercises);
        setMuscleGroups(groups);
        setVisibleGroups(groups.map(g => g.name));

        // Save cleaned groups to localStorage
        localStorage.setItem('muscle_groups', JSON.stringify(groups));
        
      } catch (error) {
        console.error('Failed to load from Firestore:', error);
        setError('Cannot load exercises - please check internet connection');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save exercises to Firestore when they change
  useEffect(() => {
    if (!isLoading && customExercises.length > 0) {
      saveExercises(customExercises).catch(err => {
        console.error('Failed to save exercises:', err);
      });
    }
  }, [customExercises, isLoading]);

  // Modify the plans loading effect to set minimizedPlans
  useEffect(() => {
    loadPlans()
      .then(savedPlans => {
        const plansArray = Array.isArray(savedPlans) ? savedPlans : [];
        setPlans(plansArray);
        // Add all plan IDs to minimizedPlans by default
        setMinimizedPlans(plansArray.map(plan => plan.id));
      })
      .catch(err => {
        console.error('Failed to load plans:', err);
        setError('Failed to load workout plans');
        setPlans([]);
      });
  }, []);

  // Save muscle groups to localStorage when they change
  useEffect(() => {
    if (!isLoading && muscleGroups.length > 0) {
      const cleanedGroups = removeDuplicateGroups(muscleGroups);
      localStorage.setItem('muscle_groups', JSON.stringify(cleanedGroups));
    }
  }, [muscleGroups, isLoading]);

  // Add cleanup effect
  useEffect(() => {
    if (muscleGroups.length > 0) {
      const cleaned = muscleGroups.filter(validateMuscleGroup);
      if (cleaned.length !== muscleGroups.length) {
        console.log('🧹 Cleaned corrupted muscle groups:', 
          muscleGroups.length - cleaned.length, 'items removed');
        setMuscleGroups(cleaned);
      }
    }
  }, [muscleGroups, validateMuscleGroup]);

  // Add after other useEffects, before the component functions
  useEffect(() => {
    if (!isLoading && plans.length >= 0) {
      try {
        savePlans(plans).catch(err => {
          console.error('Failed to auto-save plans:', err);
        });
      } catch (err) {
        console.error('Failed to auto-save plans:', err);
      }
    }
  }, [plans, isLoading]);

  // Add muscle group handler
  const handleAddMuscleGroup = (newGroupName) => {
    setMuscleGroups(prev => {
      const exists = prev.some(g => 
        g?.name?.toLowerCase() === newGroupName.toLowerCase()
      );
      
      if (!exists) {
        const newGroup = { name: newGroupName, rows: 2 };
        if (validateMuscleGroup(newGroup)) {
          return [...prev, newGroup];
        }
      }
      return prev;
    });
  };

  // Update group rows handler
  const handleUpdateGroupRows = (groupName, rows) => {
    setMuscleGroups(prev => 
      prev.filter(validateMuscleGroup)
        .map(g => g.name === groupName ? { ...g, rows: Number(rows) } : g)
    );
  };

  // Delete muscle group handler
  const handleDeleteMuscleGroup = (groupNameToDelete) => {
    setMuscleGroups(prev => prev.filter(group => group.name !== groupNameToDelete));
    setCustomExercises(prev => prev.map(exercise =>
      exercise.muscleGroup === groupNameToDelete
        ? { ...exercise, muscleGroup: 'Other' }
        : exercise
    ));
  };

  // Modify createNewPlan to not add to minimizedPlans
  const createNewPlan = () => {
    const newPlan = {
      id: crypto.randomUUID(),
      name: 'New Workout Plan',
      exercises: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const initialPosition = {
      x: window.innerWidth - 800,
      y: 20
    };

    const initialSize = {
      width: 750,
      height: 600
    };

    setPlans(prev => [...prev, newPlan]); // Only update state
    setOpenPlanIds(prev => [...prev, newPlan.id]);
    setEditModes(prev => ({ ...prev, [newPlan.id]: true }));
    setPlanPositions(prev => ({ ...prev, [newPlan.id]: { ...initialPosition, ...initialSize } }));
    setCurrentPlanId(newPlan.id);
    setActivePlanId(newPlan.id);
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
    setCurrentPlanId(planId);
  };

  // Update closePlan to add back to minimizedPlans
  const closePlan = (planId) => {
    setOpenPlanIds(prev => prev.filter(id => id !== planId));
    setMinimizedPlans(prev => [...prev, planId]);
    if (currentPlanId === planId) {
      setCurrentPlanId(null);
    }
  };

  // Update minimizePlan to do nothing (since plans are minimized by default)
  const minimizePlan = (planId) => {
    setOpenPlanIds(prev => prev.filter(id => id !== planId));
  };

  // Update restorePlan to remove from minimizedPlans
  const restorePlan = (planId) => {
    const scrollPosition = window.scrollY;
    const newPosition = {
      x: window.innerWidth - 520,
      y: scrollPosition + 20
    };

    setMinimizedPlans(prev => prev.filter(id => id !== planId));
    setOpenPlanIds(prev => [...prev, planId]);
    setPlanPositions(prev => ({ ...prev, [planId]: newPosition }));
  };

  // Update deletePlan to clean up both states
  const deletePlan = (planId) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      setPlans(plans.filter(p => p.id !== planId));
      setMinimizedPlans(prev => prev.filter(id => id !== planId));
      closePlan(planId);
    }
  };

  const setActiveWorkoutPlan = (planId) => {
    setActivePlanId(planId);
    setCurrentPlanId(planId);
  };

  const renamePlan = (planId, newName) => {
    setPlans(plans.map(plan =>
      plan.id === planId
        ? { ...plan, name: newName, updatedAt: new Date() }
        : plan
    ));
  };

  const updatePlan = async (planId, updatedExercises) => {
    const updatedPlan = {
      ...plans.find(p => p.id === planId),
      exercises: updatedExercises,
      updatedAt: new Date()
    };

    setPlans(prev => prev.map(p =>
      p.id === planId ? updatedPlan : p
    ));
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
        muscleGroup: details.muscleGroup,
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
        const newExercises = await Promise.all(files.map(async (file) => {
          const imageUrl = await uploadExerciseImage(file);
          return {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, '').replace(/-|_/g, ' '),
            muscleGroup: muscleGroup,
            imageUrl: imageUrl
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

  const handleDragStart = (e, exercise, index) => {
    setDraggedExercise({ ...exercise, originalIndex: index });
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedExercise(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragTargetIndex(index);
  };

  const handleDrop = (e, muscleGroup) => {
    e.preventDefault();
    if (!draggedExercise || dragTargetIndex === null) return;

    const updatedExercises = [...customExercises];
    const oldIndex = updatedExercises.findIndex(ex => ex.id === draggedExercise.id);
    
    // Remove from old position
    const [movedExercise] = updatedExercises.splice(oldIndex, 1);
    
    // Insert at new position
    updatedExercises.splice(dragTargetIndex, 0, movedExercise);
    
    setCustomExercises(updatedExercises);
    setDraggedExercise(null);
    setDragTargetIndex(null);
  };

  const handleExerciseClick = (exercise) => {
    if (!currentPlanId) {
      setShowMessage(true);
      return;
    }
  
    const currentPlan = plans.find(p => p.id === currentPlanId);
    if (!currentPlan) return;
  
    const exerciseCopy = {
      ...exercise,
      id: crypto.randomUUID(),
      sets: '3',
      reps: '12',
      repType: 'reps'
    };
  
    const updatedPlan = {
      ...currentPlan,
      exercises: [...(currentPlan.exercises || []), exerciseCopy],
      updatedAt: new Date()
    };
  
    setPlans(prev => 
      prev.map(p => p.id === currentPlanId ? updatedPlan : p)
    );
  };

  const savePlan = async (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    const updatedPlan = {
      ...plan,
      updatedAt: new Date()
    };

    setPlans(prev => 
      prev.map(p => p.id === planId ? updatedPlan : p)
    );
  };

  const handleMuscleGroupChange = (exerciseId, newGroup) => {
    setCustomExercises(prev => prev.map(ex => 
      ex.id === exerciseId 
        ? { ...ex, muscleGroup: newGroup }
        : ex
    ));
    setEditingExercise(null);
  };

  const filteredGroups = useMemo(() => {
    return (Array.isArray(muscleGroups) ? muscleGroups : [])
      .filter(isValidGroup);
  }, [muscleGroups, isValidGroup]);

  const handleDeletePlan = (planId) => {
    if (window.confirm('Delete this plan? This action cannot be undone.')) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      setMinimizedPlans(prev => prev.filter(id => id !== planId));
      setOpenPlanIds(prev => prev.filter(id => id !== planId));
      if (currentPlanId === planId) {
        setCurrentPlanId(null);
      }
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
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            } text-sm`}
          >
            {isEditMode ? 'Done' : 'Edit'}
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
        {Array.isArray(muscleGroups) && muscleGroups
          .filter(validateMuscleGroup)
          .map((group) => {
            // Check if group is visible
            if (!visibleGroups.includes(group.name)) return null;
            
            const groupExercises = customExercises.filter(ex => 
              ex?.muscleGroup === group.name
            );
            
            if (!groupExercises.length) return null;
            
            return (
              <div key={group.name}>
                <h3 className="text-xl font-bold mb-4 text-gray-800">
                  {group.name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {groupExercises.map((exercise, index) => (
                    <div 
                      key={exercise.id} 
                      className={`relative cursor-pointer hover:opacity-80 transition bg-white rounded-lg shadow-sm p-2
                        ${isEditMode && dragTargetIndex === index ? 'border-2 border-blue-500' : ''}`}
                      onClick={() => !isEditMode && handleExerciseClick(exercise)}
                      draggable={isEditMode}
                      onDragStart={(e) => handleDragStart(e, exercise, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => isEditMode && handleDragOver(e, index)}
                      onDrop={(e) => isEditMode && handleDrop(e, group.name)}
                    >
                      {isEditMode && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteExercise(exercise.id);
                            }}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-10"
                          >
                            ×
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingExercise(exercise);
                            }}
                            className="absolute top-2 left-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 z-10"
                          >
                            ⇄
                          </button>
                        </>
                      )}
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
          muscleGroups={muscleGroups.map(g => g.name)}  // Pass only names array
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
            if (newIndex >= 0 && newIndex < newGroups.length) {
              [newGroups[index], newGroups[newIndex]] = [newGroups[newIndex], newGroups[index]];
              setMuscleGroups(newGroups);
            }
          }}
          onAddMuscleGroup={handleAddMuscleGroup}
          onDeleteGroup={handleDeleteMuscleGroup}
          onUpdateGroupRows={handleUpdateGroupRows}
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

      <div className="fixed bottom-0 left-0 right=0 bg-gray-100 border-t flex items-center p-2 gap-2">
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
            onDelete={() => handleDeletePlan(planId)}  // Changed from onClose
            onMinimize={() => minimizePlan(planId)}
            plan={plan.exercises || []}
            onUpdatePlan={(exercises) => updatePlan(planId, exercises)}
            isEditMode={editModes[planId] || false}
            onToggleEditMode={(value) => toggleEditMode(planId, value)}
            exercises={customExercises}
            initialPosition={planPositions[planId] || { x: window.innerWidth - 520, y: 20 }}
            planName={plan.name}
            onDuplicate={() => duplicatePlan(planId)}
            onSave={() => savePlan(planId)}
            isActive={activePlanId === planId}
            onActivate={() => setActiveWorkoutPlan(planId)}
            onRenamePlan={(newName) => renamePlan(planId, newName)}
          />
        );
      })}

      {editingExercise && (
        <MuscleGroupEditModal
          exercise={editingExercise}
          muscleGroups={muscleGroups}
          onSave={handleMuscleGroupChange}
          onClose={() => setEditingExercise(null)}
        />
      )}
    </div>
  );
};

export default GymPage;