import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export const practiceDataService = {
  async savePracticeData(sessionId, data) {
    try {
      const practiceRef = doc(db, 'practices', sessionId);
      await setDoc(practiceRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving practice data:', error);
      throw error;
    }
  },

  async getPracticeData(sessionId) {
    try {
      const practiceRef = doc(db, 'practices', sessionId);
      const practiceDoc = await getDoc(practiceRef);
      
      if (practiceDoc.exists()) {
        return practiceDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting practice data:', error);
      throw error;
    }
  },

  async updateSurveyResponse(sessionId, playerName, response) {
    try {
      const practiceRef = doc(db, 'practices', sessionId);
      const practiceDoc = await getDoc(practiceRef);
      
      if (practiceDoc.exists()) {
        const existingData = practiceDoc.data();
        const surveyData = existingData.surveyData || {};
        
        surveyData[playerName] = response;
        
        // Calculate new averages
        const responses = Object.values(surveyData);
        const surveyAverages = responses.length > 0 ? {
          rpe: Number((responses.reduce((sum, r) => sum + (Number(r.rpe) || 0), 0) / responses.length).toFixed(1)),
          legs: Number((responses.reduce((sum, r) => sum + (Number(r.legs) || 0), 0) / responses.length).toFixed(1))
        } : { rpe: 0, legs: 0 };
        
        await updateDoc(practiceRef, {
          surveyData,
          surveyAverages,
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(practiceRef, {
          surveyData: { [playerName]: response },
          surveyAverages: { 
            rpe: Number(response.rpe) || 0,
            legs: Number(response.legs) || 0
          },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating survey response:', error);
      throw error;
    }
  },

  async updateGymSurveyResponse(sessionId, playerName, response) {
    try {
      const practiceRef = doc(db, 'practices', sessionId);
      const practiceDoc = await getDoc(practiceRef);
      
      if (practiceDoc.exists()) {
        const existingData = practiceDoc.data();
        const gymSurveyData = existingData.gymSurveyData || {};
        
        gymSurveyData[playerName] = response;
        
        // Calculate new averages
        const responses = Object.values(gymSurveyData);
        const gymSurveyAverages = responses.length > 0 ? {
          rpe: Number((responses.reduce((sum, r) => sum + (Number(r.rpe) || 0), 0) / responses.length).toFixed(1))
        } : { rpe: 0 };
        
        await updateDoc(practiceRef, {
          gymSurveyData,
          gymSurveyAverages,
          lastUpdated: new Date().toISOString()
        });
      } else {
        await setDoc(practiceRef, {
          gymSurveyData: { [playerName]: response },
          gymSurveyAverages: { rpe: Number(response.rpe) || 0 },
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating gym survey response:', error);
      throw error;
    }
  },

  async getSurveyData(sessionId) {
    try {
      const practiceData = await this.getPracticeData(sessionId);
      return practiceData?.surveyData || null;
    } catch (error) {
      console.error('Error getting survey data:', error);
      throw error;
    }
  }
};
