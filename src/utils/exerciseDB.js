import { openDB } from 'idb';

const DB_NAME = 'WorkoutPlannerDB';
const STORE_NAME = 'exercises';
const DB_VERSION = 1;

async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveCustomExercises(exercises) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([
    ...exercises.map(exercise => tx.store.put(exercise)),
    tx.done
  ]);
}

export async function loadCustomExercises() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function addExercise(exercise) {
  const db = await initDB();
  await db.put(STORE_NAME, exercise);
}

export async function deleteExercise(id) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}

export async function clearAllExercises() {
  const db = await initDB();
  await db.clear(STORE_NAME);
}
