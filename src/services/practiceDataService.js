import { db } from '../config/firebase';
import { 
  collection, 
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

const PRACTICES_COLLECTION = 'practices';

class PracticeDataService {
  async savePracticeData(sessionId, data) {
    try {
      const docRef = doc(db, PRACTICES_COLLECTION, sessionId);
      await setDoc(docRef, {
        ...data,
        sessionId,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      console.log('Practice data saved:', sessionId);
    } catch (error) {
      console.error('Error saving practice data:', error);
      throw error;
    }
  }

  async getPracticeData(sessionId) {
    try {
      const docRef = doc(db, PRACTICES_COLLECTION, sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('Practice data loaded:', sessionId);
        return docSnap.data();
      } else {
        console.log('No practice data found for:', sessionId);
        return null;
      }
    } catch (error) {
      console.error('Error loading practice data:', error);
      throw error;
    }
  }

  async updateSurveyResponse(sessionId, playerName, response) {
    try {
      const docRef = doc(db, PRACTICES_COLLECTION, sessionId);
      const docSnap = await getDoc(docRef);
      
      const existingData = docSnap.exists() ? docSnap.data() : {};
      const surveyData = existingData.surveyData || {};
      
      surveyData[playerName] = response;
      
      // Calculate averages
      const responses = Object.values(surveyData);
      const totals = responses.reduce((acc, r) => ({
        rpe: acc.rpe + (Number(r.rpe) || 0),
        legs: acc.legs + (Number(r.legs) || 0)
      }), { rpe: 0, legs: 0 });
      
      const surveyAverages = {
        rpe: Number((totals.rpe / responses.length).toFixed(1)),
        legs: Number((totals.legs / responses.length).toFixed(1))
      };
      
      await updateDoc(docRef, {
        surveyData,
        surveyAverages,
        lastUpdated: serverTimestamp()
      });
      
      console.log('Survey response saved for:', playerName);
    } catch (error) {
      console.error('Error saving survey response:', error);
      throw error;
    }
  }

  async getSurveyData(sessionId) {
    try {
      const docRef = doc(db, PRACTICES_COLLECTION, sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().surveyData || {};
      }
      return {};
    } catch (error) {
      console.error('Error loading survey data:', error);
      throw error;
    }
  }

  async deletePracticeData(sessionId) {
    try {
      const docRef = doc(db, PRACTICES_COLLECTION, sessionId);
      await deleteDoc(docRef);
      console.log('Practice data deleted:', sessionId);
    } catch (error) {
      console.error('Error deleting practice data:', error);
      throw error;
    }
  }
}

export const practiceDataService = new PracticeDataService();
