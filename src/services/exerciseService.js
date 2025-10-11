import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

// ========== EXERCISES ==========
export const fetchExercises = async () => {
  try {
    const docSnap = await getDoc(doc(db, 'app_data', 'exercises'));
    if (docSnap.exists()) {
      return docSnap.data().exercises || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to load exercises:', error);
    return [];
  }
};

export const addExercise = async (exercise) => {
  try {
    const current = await fetchExercises();
    const newExercise = {
      ...exercise,
      id: exercise.id || Date.now().toString(),
      created_at: new Date().toISOString()
    };
    
    const updated = [...current, newExercise];
    
    await setDoc(doc(db, 'app_data', 'exercises'), {
      exercises: updated,
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Exercise added to Firestore');
    return updated;
  } catch (error) {
    console.error('Failed to add exercise:', error);
    throw error;
  }
};

export const deleteExercise = async (exerciseId) => {
  try {
    const exercises = await fetchExercises();
    const filtered = exercises.filter(e => e.id !== exerciseId);
    
    await setDoc(doc(db, 'app_data', 'exercises'), {
      exercises: filtered,
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ Exercise deleted from Firestore');
  } catch (error) {
    console.error('Failed to delete exercise:', error);
    throw error;
  }
};

export const updateExerciseOrder = async (exerciseId, newOrder) => {
  try {
    const exercises = await fetchExercises();
    const updated = exercises.map(e => 
      e.id === exerciseId ? { ...e, order: newOrder } : e
    );
    
    await setDoc(doc(db, 'app_data', 'exercises'), {
      exercises: updated,
      updated_at: new Date().toISOString()
    });
    
    return exercises.find(e => e.id === exerciseId);
  } catch (error) {
    console.error('Failed to update exercise order:', error);
    throw error;
  }
};

// ========== IMAGES ==========
export const uploadExerciseImage = async (file, exerciseId) => {
  try {
    const fileName = exerciseId ? `${exerciseId}-${file.name}` : `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `exercise-images/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('✅ Image uploaded to Firebase:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Firebase upload error:', error);
    throw error;
  }
};

export const uploadMultipleImages = async (files) => {
  try {
    const uploadPromises = files.map(async (file) => {
      const imageUrl = await uploadExerciseImage(file);
      return {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        imageUrl: imageUrl,
        muscleGroup: 'Other'
      };
    });

    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

// ========== MUSCLE GROUPS ==========
export const fetchMuscleGroups = async () => {
  try {
    const docSnap = await getDoc(doc(db, 'app_data', 'muscle_groups'));
    if (docSnap.exists()) {
      return docSnap.data().groups || [];
    }
    return ['Plyometric', 'Functional Power', 'Legs']; // Default
  } catch (error) {
    console.error('Failed to load muscle groups:', error);
    return ['Plyometric', 'Functional Power', 'Legs'];
  }
};

export const saveMuscleGroups = async (groups) => {
  try {
    await setDoc(doc(db, 'app_data', 'muscle_groups'), {
      groups: groups,
      updated_at: new Date().toISOString()
    });
    console.log('✅ Muscle groups saved to Firestore');
  } catch (error) {
    console.error('Failed to save muscle groups:', error);
    throw error;
  }
};