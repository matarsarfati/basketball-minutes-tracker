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
    isArchived: plan.isArchived || false,
    groupId: plan.groupId || null, // Ensure groupId is saved
    programUrl: plan.programUrl || '' // Save program URL
  };

  if (plan.firebaseId) {
    const docRef = doc(db, 'plans', plan.firebaseId);
    await updateDoc(docRef, planData);
    return plan.firebaseId;
  }

  const docRef = await addDoc(collection(db, 'plans'), planData);
  return docRef.id;
};

export const loadPlansFromFirestore = async (groupId = null) => {
  const plansRef = collection(db, 'plans');
  let q;

  if (groupId) {
    // If a group is selected, filter by that groupId
    // Note: You might need to create a composite index in Firestore for 'groupId' + 'updatedAt'
    // For now, sorting in client might be safer if index is missing, but let's try standard query
    // If filtering by group, we might lose ordering if index isn't there, so we can do client-side sort
    // OR just filter by groupId and let client sort.
    // Let's grab all for the group.

    // Simple query for now to avoid Index issues immediately
    // Ideally: query(plansRef, where('groupId', '==', groupId), orderBy('updatedAt', 'desc'));
    // But let's retrieve all and filter in memory if needed, OR just filter by ID.
    // Let's try to query by groupId.
    const { where } = await import('firebase/firestore');
    q = query(plansRef, where('groupId', '==', groupId), orderBy('updatedAt', 'desc'));
  } else {
    // Legacy support or "All Plans" admin view if ever needed
    // However, user wants separation. If no group passed, maybe return nothing or all?
    // Let's default to returning all if no group specified (legacy behavior)
    q = query(plansRef, orderBy('updatedAt', 'desc'));
  }

  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      firebaseId: doc.id
    }));
  } catch (err) {
    // Fallback if index is missing for orderBy
    console.warn("Query failed, potentially missing index. Falling back to client-side sort.", err);
    if (groupId) {
      const { where } = await import('firebase/firestore');
      q = query(plansRef, where('groupId', '==', groupId));
      const snapshot = await getDocs(q);
      const plans = snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id }));
      return plans.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }
    throw err;
  }
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
