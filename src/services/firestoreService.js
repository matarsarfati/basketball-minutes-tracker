import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const saveExercises = async (exercises) => {
  const cleanedExercises = exercises.map(ex => {
    const cleaned = {};
    Object.entries(ex).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  });

  await setDoc(doc(db, 'app_data', 'exercises'), {
    exercises: cleanedExercises,
    updated_at: new Date().toISOString()
  });
};

export const loadExercises = async () => {
  const docSnap = await getDoc(doc(db, 'app_data', 'exercises'));
  if (docSnap.exists()) {
    return docSnap.data().exercises || [];
  }
  return [];
};