/* eslint-disable no-unused-vars */
import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

class RosterService {
  getCollectionPath(teamId = null) {
    const id = teamId || localStorage.getItem('activeTeamId');
    if (!id) {
      return 'roster';
    }
    return `teams/${id}/players`;
  }

  async addPlayer(playerData, teamId = null) {
    try {
      const docRef = await addDoc(collection(db, this.getCollectionPath(teamId)), playerData);
      console.log('Player added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }

  async getPlayers(teamId = null) {
    try {
      const querySnapshot = await getDocs(collection(db, this.getCollectionPath(teamId)));
      const players = querySnapshot.docs.map(d => ({
        ...d.data(),
        id: d.id,
        firebaseId: d.id
      }));
      console.log('Loaded players:', players.length);
      return players;
    } catch (error) {
      console.error('Error loading players:', error);
      throw error;
    }
  }

  async updatePlayer(playerId, updatedData, teamId = null) {
    try {
      const playerRef = doc(db, this.getCollectionPath(teamId), playerId);
      await updateDoc(playerRef, updatedData);
      console.log('Player updated:', playerId);
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  async deletePlayer(playerId, teamId = null) {
    try {
      const playerRef = doc(db, this.getCollectionPath(teamId), playerId);
      await deleteDoc(playerRef);
      console.log('Player deleted:', playerId);

      // Cascade Delete player's test results
      const resolvedTeamId = teamId || localStorage.getItem('activeTeamId');
      if (resolvedTeamId) {
        const { query, where, getDocs, writeBatch } = await import('firebase/firestore');
        const testResultsQ = query(
          collection(db, `teams/${resolvedTeamId}/testResults`),
          where('playerId', '==', playerId)
        );
        const snapshot = await getDocs(testResultsQ);
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
          console.log(`Cascade deleted ${snapshot.size} test results for player ${playerId}`);
        }
      }
    } catch (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  }
}

export const rosterService = new RosterService();
