import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  doc 
} from 'firebase/firestore';

const ROSTER_COLLECTION = 'roster';

class RosterService {
  async addPlayer(playerData) {
    try {
      const docRef = await addDoc(collection(db, ROSTER_COLLECTION), playerData);
      console.log('Player added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding player:', error);
      throw error;
    }
  }

  async getPlayers() {
    try {
      const querySnapshot = await getDocs(collection(db, ROSTER_COLLECTION));
      const players = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        firebaseId: doc.id
      }));
      console.log('Loaded players:', players.length);
      return players;
    } catch (error) {
      console.error('Error loading players:', error);
      throw error;
    }
  }

  async updatePlayer(playerId, updatedData) {
    try {
      const playerRef = doc(db, ROSTER_COLLECTION, playerId);
      await updateDoc(playerRef, updatedData);
      console.log('Player updated:', playerId);
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  async deletePlayer(playerId) {
    try {
      const playerRef = doc(db, ROSTER_COLLECTION, playerId);
      await deleteDoc(playerRef);
      console.log('Player deleted:', playerId);
    } catch (error) {
      console.error('Error deleting player:', error);
      throw error;
    }
  }
}

export const rosterService = new RosterService();