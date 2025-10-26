import { db } from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const calculateAverages = (responses) => {
  if (!responses || Object.keys(responses).length === 0) {
    return { sleep: 0, fatigue: 0, soreness: 0 };
  }

  const sums = Object.values(responses).reduce((acc, response) => ({
    sleep: acc.sleep + response.sleep,
    fatigue: acc.fatigue + response.fatigue,
    soreness: acc.soreness + response.soreness
  }), { sleep: 0, fatigue: 0, soreness: 0 });

  const count = Object.keys(responses).length;
  
  return {
    sleep: Math.round((sums.sleep / count) * 10) / 10,
    fatigue: Math.round((sums.fatigue / count) * 10) / 10,
    soreness: Math.round((sums.soreness / count) * 10) / 10
  };
};

export const wellnessService = {
  async submitWellnessCheck(playerName, data) {
    try {
      const date = getTodayDate();
      const docRef = doc(db, 'wellness', date);
      const docSnap = await getDoc(docRef);
      
      const currentData = docSnap.exists() ? docSnap.data() : null;
      const newResponses = {
        ...(currentData?.responses || {}),
        [playerName]: {
          ...data,
          timestamp: serverTimestamp()
        }
      };

      const updateData = {
        date,
        responses: newResponses,
        averages: calculateAverages(newResponses),
        completedCount: Object.keys(newResponses).length,
        lastUpdated: serverTimestamp()
      };

      if (!currentData) {
        updateData.createdAt = serverTimestamp();
      }

      await setDoc(docRef, updateData, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error submitting wellness check:', error);
      return { success: false, error };
    }
  },

  async getTodayWellness() {
    try {
      const date = getTodayDate();
      return await this.getWellnessData(date);
    } catch (error) {
      console.error('Error getting today wellness:', error);
      return null;
    }
  },

  async getWellnessData(date) {
    try {
      const docRef = doc(db, 'wellness', date);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting wellness data:', error);
      return null;
    }
  }
};
