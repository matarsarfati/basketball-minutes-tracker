import { 
  saveCustomExercises as saveToIDB, 
  loadCustomExercises as loadFromIDB 
} from './exerciseDB';

import { safeGet, safeSet } from './storage';

export const CUSTOM_EXERCISES_KEY = "gymExercisesV1";

export const makeExerciseKey = exercise => 
  `${exercise.name.trim().toLowerCase()}|${exercise.muscleGroup.toLowerCase()}`;

export async function loadCustomExercises() {
  try {
    return await loadFromIDB();
  } catch (error) {
    console.error('Failed to load exercises from IndexedDB:', error);
    return [];
  }
}

export async function saveCustomExercises(exercises) {
  await saveToIDB(exercises);
}

export const mergeExercises = (seedExercises, customExercises) => {
  const seen = new Map();
  // Custom exercises override seeds with same key
  [...seedExercises, ...customExercises].forEach(ex => {
    seen.set(makeExerciseKey(ex), ex);
  });
  return [...seen.values()];
};

export const isCustomExercise = (exercise, seedExercises) => 
  !seedExercises.some(seed => makeExerciseKey(seed) === makeExerciseKey(exercise));
