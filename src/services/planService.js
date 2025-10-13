const DB_NAME = 'workout-plans-db';
const STORE_NAME = 'plans';
const VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const savePlans = async (plans) => {
  try {
    localStorage.setItem('workout-plans', JSON.stringify(plans));
    return true;
  } catch (error) {
    console.error('Failed to save plans:', error);
    return false;
  }
};

export const loadPlans = async () => {
  try {
    const saved = localStorage.getItem('workout-plans');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load plans:', error);
    return [];
  }
};
