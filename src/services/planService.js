import { db } from '../config/firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';

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

export const savePlanToFirestore = async (plan) => {
  const planData = {
    ...plan,
    updatedAt: new Date().toISOString(),
    createdAt: plan.createdAt || new Date().toISOString(),
    isArchived: plan.isArchived || false
  };

  if (plan.firebaseId) {
    const docRef = doc(db, 'plans', plan.firebaseId);
    await updateDoc(docRef, planData);
    return plan.firebaseId;
  }

  const docRef = await addDoc(collection(db, 'plans'), planData);
  return docRef.id;
};

export const loadPlansFromFirestore = async () => {
  const q = query(collection(db, 'plans'), orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    firebaseId: doc.id
  }));
};

export const archivePlan = async (planId) => {
  const docRef = doc(db, 'plans', planId);
  await updateDoc(docRef, {
    isArchived: true,
    updatedAt: new Date().toISOString()
  });
};

export const deletePlanFromFirestore = async (planId) => {
  const docRef = doc(db, 'plans', planId);
  await deleteDoc(docRef);
};
