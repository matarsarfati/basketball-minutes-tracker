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
    const currentSize = new Blob([JSON.stringify(plans)]).size;
    if (currentSize > 4800000) { // ~4.8MB limit
      localStorage.clear();
    }
    localStorage.setItem('workout-plans', JSON.stringify(plans));
  } catch (error) {
    console.error('Storage quota exceeded - clearing old data');
    localStorage.clear();
    localStorage.setItem('workout-plans', JSON.stringify(plans));
  }
};

export const loadPlans = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const plans = await store.getAll();
  
  db.close();
  return plans;
};
