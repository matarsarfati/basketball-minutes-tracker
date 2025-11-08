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

// Folder operations
export const createFolder = async (folderName, parentId = null) => {
  const folderData = {
    name: folderName,
    type: 'folder',
    parentId: parentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, 'plans'), folderData);
  return { ...folderData, firebaseId: docRef.id };
};

export const movePlanToFolder = async (planId, folderId) => {
  const docRef = doc(db, 'plans', planId);
  await updateDoc(docRef, {
    parentFolder: folderId,
    updatedAt: new Date().toISOString()
  });
};

export const renamePlanOrFolder = async (itemId, newName) => {
  const docRef = doc(db, 'plans', itemId);
  await updateDoc(docRef, {
    name: newName,
    updatedAt: new Date().toISOString()
  });
};

export const duplicatePlan = async (plan) => {
  try {
    console.log('📋 Duplicating plan:', plan.name);

    // Create a clean copy of the plan
    const duplicatedPlan = {
      name: `${plan.name} (Copy)`,
      exercises: JSON.parse(JSON.stringify(plan.exercises || [])),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
      type: plan.type || 'plan', // Ensure it's marked as a plan, not folder
      ...(plan.parentFolder && { parentFolder: plan.parentFolder }) // Keep folder if it had one
    };

    // Remove any undefined fields
    Object.keys(duplicatedPlan).forEach(key => {
      if (duplicatedPlan[key] === undefined) {
        delete duplicatedPlan[key];
      }
    });

    console.log('💾 Saving duplicated plan to Firestore...');
    const docRef = await addDoc(collection(db, 'plans'), duplicatedPlan);
    console.log('✅ Plan duplicated successfully, Firebase ID:', docRef.id);

    return {
      ...duplicatedPlan,
      id: crypto.randomUUID(), // Generate local ID for React state
      firebaseId: docRef.id
    };
  } catch (error) {
    console.error('❌ Failed to duplicate plan:', error);
    console.error('Plan data:', plan);
    throw new Error(`Duplication failed: ${error.message}`);
  }
};

export const toggleArchivePlan = async (planId, currentArchiveState) => {
  const docRef = doc(db, 'plans', planId);
  await updateDoc(docRef, {
    isArchived: !currentArchiveState,
    updatedAt: new Date().toISOString()
  });
};
