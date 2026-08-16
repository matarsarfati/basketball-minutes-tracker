import { db } from '../config/firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    deleteDoc,
    doc
} from 'firebase/firestore';

const GLOBAL_TEST_DEFS = [
    { id: 'global_beep', name: 'Beep Test', unit: 'Level.Shuttle', isHigherBetter: true, isGlobal: true },
    { id: 'global_sq', name: '1RM Barbell Back Squat', unit: 'kg', isHigherBetter: true, isGlobal: true },
    { id: 'global_dl', name: '1RM Conventional Deadlift', unit: 'kg', isHigherBetter: true, isGlobal: true },
    { id: 'global_bp', name: '1RM Barbell Bench Press', unit: 'kg', isHigherBetter: true, isGlobal: true },
    { id: 'global_vj', name: 'Vertical Jump', unit: 'cm', isHigherBetter: true, isGlobal: true },
    { id: 'global_bj', name: 'Broad Jump', unit: 'cm', isHigherBetter: true, isGlobal: true },
    { id: 'global_20m', name: '20m Sprint', unit: 'sec', isHigherBetter: false, isGlobal: true },
    { id: 'global_505', name: '5-0-5 Agility Test', unit: 'sec', isHigherBetter: false, isGlobal: true }
];

class TestService {
    getDefinitionPath(teamId = null) {
        const id = teamId || localStorage.getItem('activeTeamId');
        if (!id) return 'testDefinitions'; // fallback
        return `teams/${id}/testDefinitions`;
    }

    getResultsPath(teamId = null) {
        const id = teamId || localStorage.getItem('activeTeamId');
        if (!id) return 'testResults'; // fallback
        return `teams/${id}/testResults`;
    }

    // --- Test Definitions ---
    async getTestDefinitions(teamId = null) {
        try {
            const q = query(collection(db, this.getDefinitionPath(teamId)));
            const snapshot = await getDocs(q);
            const teamDefs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            return [...GLOBAL_TEST_DEFS, ...teamDefs];
        } catch (error) {
            console.error('Error fetching test definitions:', error);
            return [];
        }
    }

    async addTestDefinition(definition, teamId = null) {
        try {
            const docRef = await addDoc(collection(db, this.getDefinitionPath(teamId)), {
                ...definition,
                createdAt: new Date().toISOString()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding test definition:', error);
            throw error;
        }
    }

    async deleteTestDefinition(definitionId, teamId = null) {
        try {
            await deleteDoc(doc(db, this.getDefinitionPath(teamId), definitionId));
        } catch (error) {
            console.error('Error deleting definition:', error);
            throw error;
        }
    }

    // --- Test Results ---
    async saveTestResults(results, teamId = null) {
        // expecting an array of result objects
        try {
            const id = teamId || localStorage.getItem('activeTeamId');
            if (!id) throw new Error("No active team ID found");

            const promises = results.map(res => {
                if (!res.playerId) return Promise.resolve();
                const collRef = collection(db, `teams/${id}/players/${res.playerId}/tests`);
                return addDoc(collRef, {
                    ...res,
                    createdAt: new Date().toISOString()
                });
            });
            await Promise.all(promises);
        } catch (error) {
            console.error('Error saving test results:', error);
            throw error;
        }
    }

    async getTestResultsByPlayer(playerId, teamId = null) {
        try {
            const id = teamId || localStorage.getItem('activeTeamId');
            if (!id || !playerId) return [];

            const q = query(collection(db, `teams/${id}/players/${playerId}/tests`));
            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort by date descending
            results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return results;
        } catch (error) {
            console.error('Error fetching player test results:', error);
            return [];
        }
    }
}

export const testService = new TestService();
