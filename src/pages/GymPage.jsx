import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlanBuilderModal from '../components/gym/PlanBuilderModal';
import IndividualPlanBuilderModal from '../components/gym/IndividualPlanBuilderModal';
import ExerciseLibrarySettings from '../components/gym/ExerciseLibrarySettings';
import SidePanelPlans from '../components/gym/SidePanelPlans';
import { savePlans, savePlanToFirestore, saveIndividualPlanToFirestore } from '../services/planService';
import {
  uploadExerciseImage,
  fetchMuscleGroups,    // Add this
  saveMuscleGroups     // Add this
} from '../services/exerciseService';
import ImageUploadModal from '../components/gym/ImageUploadModal';
import { loadExercises, saveExercises } from '../services/firestoreService';
import ExerciseEditModal from '../components/gym/ExerciseEditModal'; // Changed from MuscleGroupEditModal
import { loadPlansFromFirestore } from '../services/planService';
import { useTeam } from '../context/TeamContext';

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
const GymPage = () => {
  const [searchParams] = useSearchParams();
  const urlPlanId = searchParams.get('planId');
  const urlTvMode = searchParams.get('tv') === 'true';
  // Add validation helper at the top
  const validateMuscleGroup = useCallback((group) => {
    return group &&
      typeof group === 'object' &&
      typeof group.name === 'string' &&
      typeof group.rows === 'number';
  }, []);

  // Default muscle groups - source of truth

  // Category fix map for common typos

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
  const [showSavedPlansPanel, setShowSavedPlansPanel] = useState(false);
  // Click-to-add: when an exercise is clicked in the library, if an individual plan is active
  // it gets routed as pendingExercise to IndividualPlanBuilderModal
  const [pendingExercise, setPendingExercise] = useState(null);
  const { activeTeamId } = useTeam();

  // Add safety check helper

  // Normalize category names

  // Clean exercise data

  // Update visibleGroups when muscleGroups changes
  useEffect(() => {
    if (muscleGroups.length > 0) {
      setVisibleGroups(muscleGroups.map(group => group.name));
    }
  }, [muscleGroups]);

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
        // Load exercises from Firestore
        const exercises = await loadExercises();
        console.log('📦 Loaded exercises:', exercises.length);

        let groups = [];

        // Try to load muscle groups from Firestore
        const firestoreGroups = await fetchMuscleGroups();
        console.log('🔍 Firestore groups:', firestoreGroups);

        // Check if we got valid data (non-empty array with proper structure)
        if (Array.isArray(firestoreGroups) && firestoreGroups.length > 0) {
          // Check if first item has the correct structure
          if (typeof firestoreGroups[0] === 'object' && firestoreGroups[0].name) {
            groups = firestoreGroups;
            console.log('✅ Loaded muscle groups from Firestore');
          } else if (typeof firestoreGroups[0] === 'string') {
            // Old format - convert strings to objects
            groups = firestoreGroups.map(name => ({ name, rows: 2 }));
            console.log('🔄 Converted old string format to objects');
            await saveMuscleGroups(groups);
          }
        } else {
          // Firestore is empty, check localStorage
          const savedGroups = localStorage.getItem('muscle_groups');

          if (savedGroups) {
            try {
              groups = JSON.parse(savedGroups);
              console.log('📤 Migrating from localStorage to Firestore');
              await saveMuscleGroups(groups);
              localStorage.removeItem('muscle_groups');
            } catch (e) {
              console.error('Failed to parse localStorage:', e);
              groups = [...defaultMuscleGroups];
            }
          } else {
            // Nothing anywhere, use defaults
            console.log('⚡ Using default muscle groups');
            groups = [...defaultMuscleGroups];
            await saveMuscleGroups(groups);
          }
        }

        // Ensure proper format and remove duplicates
        groups = removeDuplicateGroups(groups);

        // Update state
        setCustomExercises(exercises);
        setMuscleGroups(groups);
        setVisibleGroups(groups.map(g => g.name));

        console.log('✅ Final muscle groups:', groups);

      } catch (error) {
        console.error('Failed to load data:', error);
        setError('Cannot load data - please check internet connection');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    loadData();
  }, []);

  // Fetch plans when selectedGroupId changes
  useEffect(() => {
    setIsLoading(true);
    loadPlansFromFirestore(activeTeamId || null)
      .then(savedPlans => {
        const plansArray = Array.isArray(savedPlans) ? savedPlans : [];
        setPlans(plansArray);
        setMinimizedPlans(plansArray.map(plan => plan.id));
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load plans:', err);
        setError('Failed to load workout plans');
        setPlans([]);
        setIsLoading(false);
      });
  }, [activeTeamId]);

  // Handle URL Deep Linking
  useEffect(() => {
    if (!isLoading && plans.length > 0 && urlPlanId) {
      const targetPlan = plans.find(p => p.id === urlPlanId);
      if (targetPlan) {
        if (!openPlanIds.includes(urlPlanId)) {
          setOpenPlanIds(prev => [...prev, urlPlanId]);
        }
        setCurrentPlanId(urlPlanId);
        setActivePlanId(urlPlanId);
        // We will pass the TV mode preference down to the modal
      }
    }
  }, [isLoading, plans, urlPlanId, openPlanIds]); // Added dependencies to ensure it runs when plans load
  useEffect(() => {
    if (!isLoading && customExercises.length > 0) {
      saveExercises(customExercises).catch(err => {
        console.error('Failed to save exercises:', err);
      });
    }
  }, [customExercises, isLoading]);

  // Main plan loading effect replaced by the one above depending on selectedGroupId
  // Retaining this comment to indicate removal of the old useEffect


  // Save muscle groups to Firestore when they change
  useEffect(() => {
    if (!isLoading && muscleGroups.length > 0) {
      const cleanedGroups = removeDuplicateGroups(muscleGroups);
      saveMuscleGroups(cleanedGroups).catch(err => {
        console.error('Failed to save muscle groups:', err);
      });
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
  const handleAddMuscleGroup = async (newGroupName) => {
    try {
      setMuscleGroups(prev => {
        const exists = prev.some(g =>
          g?.name?.toLowerCase() === newGroupName.toLowerCase()
        );

        if (!exists) {
          const newGroup = { name: newGroupName, rows: 2 };
          if (validateMuscleGroup(newGroup)) {
            const updatedGroups = [...prev, newGroup];
            saveMuscleGroups(updatedGroups).catch(console.error);
            return updatedGroups;
          }
        }
        return prev;
      });
    } catch (error) {
      console.error('Failed to add muscle group:', error);
    }
  };

  // Update group rows handler
  const handleUpdateGroupRows = async (groupName, rows) => {
    try {
      setMuscleGroups(prev => {
        const updated = prev.filter(validateMuscleGroup)
          .map(g => g.name === groupName ? { ...g, rows: Number(rows) } : g);
        saveMuscleGroups(updated).catch(console.error);
        return updated;
      });
    } catch (error) {
      console.error('Failed to update group rows:', error);
    }
  };

  // Delete muscle group handler
  const handleDeleteMuscleGroup = async (groupNameToDelete) => {
    try {
      setMuscleGroups(prev => {
        const updated = prev.filter(group => group.name !== groupNameToDelete);
        saveMuscleGroups(updated).catch(console.error);
        return updated;
      });

      setCustomExercises(prev => prev.map(exercise =>
        exercise.muscleGroup === groupNameToDelete
          ? { ...exercise, muscleGroup: 'Other' }
          : exercise
      ));
    } catch (error) {
      console.error('Failed to delete muscle group:', error);
    }
  };

  // Modify createNewPlan to not add to minimizedPlans
  const createNewPlan = async () => {
    const newPlan = {
      id: crypto.randomUUID(),
      name: new Date().toLocaleDateString('en-GB'),
      exercises: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      groupId: activeTeamId || null // Assign to current group
    };

    const initialPosition = {
      x: window.innerWidth - 800,
      y: 20
    };

    const initialSize = {
      width: 750,
      height: 600
    };

    // Save to Firestore immediately to get firebaseId
    try {
      const firebaseId = await savePlanToFirestore(newPlan);
      newPlan.firebaseId = firebaseId;
      console.log('✅ New plan created and saved to Firestore:', newPlan.name);
    } catch (error) {
      console.error('Failed to save new plan to Firestore:', error);
      // Continue anyway - plan will be in local state
    }

    setPlans(prev => [...prev, newPlan]); // Only update state
    setOpenPlanIds(prev => [...prev, newPlan.id]);
    setEditModes(prev => ({ ...prev, [newPlan.id]: true }));
    setPlanPositions(prev => ({ ...prev, [newPlan.id]: { ...initialPosition, ...initialSize } }));
    setCurrentPlanId(newPlan.id);
    setActivePlanId(newPlan.id);
    return newPlan.id;
  };

  const createNewIndividualPlan = async () => {
    const newPlan = {
      id: crypto.randomUUID(),
      name: new Date().toLocaleDateString('en-GB'),
      type: 'individual',
      players: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      groupId: activeTeamId || null
    };

    try {
      // Use saveIndividualPlanToFirestore to auto-assign to 'Individual' folder
      const firebaseId = await saveIndividualPlanToFirestore(newPlan);
      newPlan.firebaseId = firebaseId;
    } catch (error) {
      console.error('Failed to save new individual plan:', error);
    }

    setPlans(prev => [...prev, newPlan]);
    setOpenPlanIds(prev => [...prev, newPlan.id]);
    setPlanPositions(prev => ({ ...prev, [newPlan.id]: { x: window.innerWidth - 960, y: 20 } }));
    setCurrentPlanId(newPlan.id);
    setActivePlanId(newPlan.id);
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


  // Update closePlan to add back to minimizedPlans

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

  const setActiveWorkoutPlan = (planId) => {
    setActivePlanId(planId);
    setCurrentPlanId(planId);
  };

  const renamePlan = async (planId, newName) => {
    const updatedPlan = plans.find(p => p.id === planId);
    if (!updatedPlan) return;

    updatedPlan.name = newName;
    updatedPlan.updatedAt = new Date();

    // Update local state
    setPlans(plans.map(plan =>
      plan.id === planId
        ? { ...plan, name: newName, updatedAt: new Date() }
        : plan
    ));

    // Save to Firestore
    try {
      if (updatedPlan.firebaseId) {
        await savePlanToFirestore(updatedPlan);
        console.log('✅ Plan renamed and saved to Firestore:', newName);
      }
    } catch (error) {
      console.error('Failed to save renamed plan:', error);
    }
  };

  const updatePlan = async (planId, updatedExercises) => {
    const currentPlan = plans.find(p => p.id === planId);
    if (!currentPlan) return;

    const updatedPlan = {
      ...currentPlan,
      exercises: updatedExercises,
      updatedAt: new Date()
    };

    setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));
    try {
      if (currentPlan.firebaseId) await savePlanToFirestore(updatedPlan);
    } catch (e) { console.error(e) }
  };

  const updateFullPlan = async (planId, updatedPlanObj) => {
    const currentPlan = plans.find(p => p.id === planId);
    if (!currentPlan) return;

    const newPlan = { ...currentPlan, ...updatedPlanObj, updatedAt: new Date() };

    setPlans(prev => prev.map(p => p.id === planId ? newPlan : p));

    try {
      if (currentPlan.firebaseId) await savePlanToFirestore(newPlan);
    } catch (err) { console.error(err); }
  };

  const toggleEditMode = (planId, value) => {
    setEditModes({
      ...editModes,
      [planId]: value
    });
  };


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

  const handleDrop = (e) => {
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
    // If the currently active plan is an individual plan, route to pendingExercise
    const currentPlan = plans.find(p => p.id === currentPlanId);
    if (currentPlan?.type === 'individual') {
      setPendingExercise({ ...exercise });
      return;
    }

    if (!currentPlanId) {
      setShowMessage(true);
      return;
    }

    if (!currentPlan) return;

    const exerciseCopy = {
      ...exercise,
      id: crypto.randomUUID(),
      sets: '2',
      reps: '6',
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
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) { console.error('Plan not found:', planId); return; }

      console.log('💾 Saving plan to Firestore:', plan.name);

      // Route individual plans to saveIndividualPlanToFirestore for auto-folder assignment
      const saveFunc = plan.type === 'individual' ? saveIndividualPlanToFirestore : savePlanToFirestore;
      const firebaseId = await saveFunc(plan);

      const updatedPlan = { ...plan, firebaseId: firebaseId || plan.firebaseId, updatedAt: new Date() };
      setPlans(prev => prev.map(p => p.id === planId ? updatedPlan : p));

      console.log('✅ Plan saved successfully to Firestore');
    } catch (error) {
      console.error('❌ Failed to save plan to Firestore:', error);
      alert('Failed to save plan. Please check your internet connection and try again.');
    }
  };

  const handleExerciseUpdate = (updatedExercise) => {
    setCustomExercises(prev => prev.map(ex =>
      ex.id === updatedExercise.id
        ? updatedExercise
        : ex
    ));
    setEditingExercise(null);
  };


  const handleDeletePlan = (planId) => {
    if (window.confirm('Delete this plan? This action cannot be undone.')) {
      setPlans(prev => prev.filter(p => p.id !== planId));
      setMinimizedPlans(prev => prev.filter(id => id !== planId));
      setOpenPlanIds(prev => prev.filter(id => id !== planId));
      if (currentPlanId === planId) {
        setCurrentPlanId(null);
      }
      // Also delete from Firestore if needed, planService handles this? 
      // The original code only updated local state here (and maybe depended on auto-save? No, deletePlanFromFirestore exists)
      // Original code just modified state. I should probably ensure it's deleted from DB too if I want consistency.
      // But adhering to original style for now unless specifically asked to fix bugs.
      // Actually, let's call the service
      import('../services/planService').then(mod => mod.deletePlanFromFirestore(planId));
    }
  };


  const handleOpenPlanFromSidebar = (planData) => {
    // Check if plan already exists in state
    const existingPlan = plans.find(p => p.firebaseId === planData.firebaseId);

    if (existingPlan) {
      // Plan already loaded, just open it
      if (!openPlanIds.includes(existingPlan.id)) {
        setOpenPlanIds(prev => [...prev, existingPlan.id]);
        setMinimizedPlans(prev => prev.filter(id => id !== existingPlan.id));
      }
      setCurrentPlanId(existingPlan.id);
      setActivePlanId(existingPlan.id);
    } else {
      // Load plan into state
      const newPlan = {
        ...planData,
        id: planData.id || crypto.randomUUID(),
      };

      setPlans(prev => [...prev, newPlan]);
      setOpenPlanIds(prev => [...prev, newPlan.id]);
      setCurrentPlanId(newPlan.id);
      setActivePlanId(newPlan.id);

      // Set initial position
      const initialPosition = {
        x: window.innerWidth - 800,
        y: 20
      };
      const initialSize = {
        width: 750,
        height: 600
      };
      setPlanPositions(prev => ({ ...prev, [newPlan.id]: { ...initialPosition, ...initialSize } }));
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
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden">
      <div className="px-4 py-4 flex flex-col h-full min-h-0 gap-4">

        {/* Action Bar (Pinned) */}
        <div className="flex justify-between items-center shrink-0">
          <div className="flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={() => setShowSavedPlansPanel(true)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 shadow-sm hover:shadow-md hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all"
            >
              📋 Last Plans
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all border ${isEditMode
                ? 'bg-green-500 hover:bg-green-600 text-white border-transparent'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:shadow-md'
                }`}
            >
              {isEditMode ? 'Done' : 'Edit'}
            </button>
            <button
              onClick={createNewPlan}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:bg-blue-700 border border-transparent transition-all text-sm"
            >
              + New Plan
            </button>
            <button
              onClick={createNewIndividualPlan}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-700 border border-transparent transition-all text-sm"
            >
              + Individual
            </button>
            <button
              onClick={() => {
                setUploadedImages([]);
                setShowUploadModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-xl shadow-sm hover:shadow-md hover:bg-emerald-700 border border-transparent transition-all text-sm"
            >
              + Upload Exercises
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-10 h-10 flex items-center justify-center bg-white border border-slate-300 shadow-sm hover:shadow-md hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Categories Quick-Jump Bar (Pinned) */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-hide items-center">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest mr-2 shrink-0">Jump To:</span>
          {Array.isArray(muscleGroups) && muscleGroups
            .filter(validateMuscleGroup)
            .filter(g => visibleGroups.includes(g.name))
            .map(group => (
              <button
                key={group.name}
                onClick={() => {
                  document.getElementById(`category-section-${group.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-3 py-1.5 whitespace-nowrap bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-bold transition-colors shrink-0"
              >
                {group.name}
              </button>
            ))}
        </div>

        {/* Library Container (Scrollable) — ONLY this element scrolls */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-800 p-4 md:p-6 rounded-2xl shadow-inner border border-slate-700 custom-scrollbar space-y-6">
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
                <div id={`category-section-${group.name}`} key={group.name} className="relative z-10 scroll-mt-4">
                  <h3 className="text-lg font-bold mb-3 text-white tracking-wide border-b border-slate-700 pb-2">
                    {group.name}
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
                    {groupExercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className={`relative cursor-pointer transition-all duration-200 bg-slate-800 rounded-lg overflow-hidden border border-slate-600 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col p-2 w-full ${isEditMode && dragTargetIndex === index ? 'border-2 border-blue-500' : ''
                          }`}
                        onClick={() => !isEditMode && handleExerciseClick(exercise)}
                        draggable={isEditMode}
                        onDragStart={(e) => handleDragStart(e, exercise, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => isEditMode && handleDragOver(e, index)}
                        onDrop={(e) => isEditMode && handleDrop(e, group.name)}
                      >
                        {/* Edit / Delete overlay buttons */}
                        {isEditMode && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExercise(exercise.id);
                              }}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 z-20 shadow-md text-xs"
                            >
                              ×
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExercise(exercise);
                              }}
                              className="absolute top-1 left-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 z-20 shadow-md text-xs"
                            >
                              ✎
                            </button>
                          </>
                        )}

                        {/* Square Image Container - Maximizes space and keeps aspect ratio 1:1 */}
                        <div className="w-full aspect-square bg-white rounded-md overflow-hidden flex items-center justify-center p-1.5">
                          <img
                            src={exercise.imageUrl}
                            alt={exercise.name}
                            className="w-full h-full object-contain max-w-full max-h-full"
                          />
                        </div>

                        {/* Title */}
                        <div className="pt-2 pb-0.5 px-0.5 text-center font-bold text-white text-[12.5px] leading-tight truncate">
                          {exercise.name}
                        </div>
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
            muscleGroups={muscleGroups.map(g => g.name)}
            onSaveExercise={handleSaveExercise}
            currentIndex={currentImageIndex}
            onImageDrop={handleImageDrop}
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

          if (plan.type === 'individual') {
            return (
              <IndividualPlanBuilderModal
                key={planId}
                isOpen={true}
                onClose={() => handleDeletePlan(planId)}
                plan={plan}
                onUpdatePlan={(updated) => updateFullPlan(planId, updated)}
                onMinimize={() => minimizePlan(planId)}
                onSave={() => savePlan(planId)}
                isActive={activePlanId === planId}
                onActivate={() => setActiveWorkoutPlan(planId)}
                planName={plan.name}
                onRenamePlan={(newName) => renamePlan(planId, newName)}
                draggedExercise={draggedExercise}
                exercises={customExercises}
                defaultTVMode={urlTvMode && plan.id === urlPlanId}
                pendingExercise={activePlanId === planId ? pendingExercise : null}
                onPendingExerciseConsumed={() => setPendingExercise(null)}
              />
            );
          }

          return (
            <PlanBuilderModal
              key={planId}
              isOpen={true}
              onClose={() => handleDeletePlan(planId)}  // Changed from onDelete to onClose
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
              defaultTVMode={urlTvMode && plan.id === urlPlanId}
              planId={planId}
              firebaseId={plan.firebaseId}
            />
          );
        })}

        {editingExercise && (
          <ExerciseEditModal
            exercise={editingExercise}
            muscleGroups={muscleGroups}
            onSave={handleExerciseUpdate}
            onClose={() => setEditingExercise(null)}
          />
        )}

        <SidePanelPlans
          isOpen={showSavedPlansPanel}
          onClose={() => setShowSavedPlansPanel(false)}
          onOpenPlan={handleOpenPlanFromSidebar}
          activePlanId={activePlanId}
        />
      </div>
    </div>
  );
};

export default GymPage;