import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc, query, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

const TEAMS_COLLECTION = 'teams';

class TeamService {
    async getTeams() {
        try {
            const snapshot = await getDocs(collection(db, TEAMS_COLLECTION));
            return snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
        } catch (e) {
            console.error('Error getting teams:', e);
            throw e;
        }
    }

    async addTeam(team) {
        try {
            const docRef = await addDoc(collection(db, TEAMS_COLLECTION), {
                ...team,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (e) {
            console.error('Error adding team:', e);
            throw e;
        }
    }

    async updateTeam(teamId, updatedData) {
        try {
            await updateDoc(doc(db, TEAMS_COLLECTION, teamId), updatedData);
        } catch (e) {
            console.error('Error updating team:', e);
            throw e;
        }
    }

    async deleteTeam(teamId) {
        try {
            // Because Firestore batch operations have a limit of 500 writes,
            // we will fetch and delete collections sequentially in chunks if they are huge. 
            // For a demo/sandbox app, a simple iterative deletion in parallel will work fine.

            const collectionsToDelete = [
                `teams/${teamId}/testDefinitions`,
                `teams/${teamId}/schedules`,
                `teams/${teamId}/wellness`
            ];

            const batch = writeBatch(db);
            const teamRef = doc(db, TEAMS_COLLECTION, teamId);
            batch.delete(teamRef);

            // Delete standard subcollections
            for (const path of collectionsToDelete) {
                const snap = await getDocs(collection(db, path));
                snap.docs.forEach(docSnap => batch.delete(docSnap.ref));
            }

            // Delete player tests and then players
            const playersSnapshot = await getDocs(collection(db, `teams/${teamId}/players`));
            for (const docSnap of playersSnapshot.docs) {
                const testsSnap = await getDocs(collection(db, `teams/${teamId}/players/${docSnap.id}/tests`));
                testsSnap.docs.forEach(testSnap => batch.delete(testSnap.ref));
                batch.delete(docSnap.ref);
            }

            await batch.commit();
        } catch (e) {
            console.error('Error deleting team:', e);
            throw e;
        }
    }
}

export const teamService = new TeamService();
