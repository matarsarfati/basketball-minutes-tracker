import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const saveExercises = async (exercises) => {
  try {
    // Ensure exercises always have muscleGroup property
    const normalizedExercises = exercises.map(ex => ({
      ...ex,
      muscleGroup: ex.muscleGroup || ex.muscle_group || 'Other'
    }));

    await setDoc(doc(db, 'app_data', 'exercises'), {
      exercises: normalizedExercises,
      updated_at: new Date().toISOString()
    });
    console.log('✅ Exercises saved to Firestore');
  } catch (error) {
    console.error('Failed to save exercises:', error);
    throw error;
  }
};

export const loadExercises = async () => {
  try {
    const docSnap = await getDoc(doc(db, 'app_data', 'exercises'));
    if (docSnap.exists()) {
      const exercises = docSnap.data().exercises || [];
      // Normalize exercise data on load
      return exercises.map(ex => ({
        ...ex,
        muscleGroup: ex.muscleGroup || ex.muscle_group || 'Other'
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to load exercises:', error);
    return [];
  }
};

// Remove saveMuscleGroups and loadMuscleGroups functions since we're using localStorage
