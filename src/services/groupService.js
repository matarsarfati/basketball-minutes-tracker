import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy
} from 'firebase/firestore';

const COLLECTION_NAME = 'gym_groups';

export const getGymGroups = async () => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
    } catch (error) {
        console.error('Error fetching gym groups:', error);
        return [];
    }
};

export const createGymGroup = async (name) => {
    try {
        const newGroup = {
            name,
            createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, COLLECTION_NAME), newGroup);
        return {
            ...newGroup,
            id: docRef.id
        };
    } catch (error) {
        console.error('Error creating gym group:', error);
        throw error;
    }
};

export const deleteGymGroup = async (groupId) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, groupId));
    } catch (error) {
        console.error('Error deleting gym group:', error);
        throw error;
    }
};
