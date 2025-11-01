import { db } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection } from 'firebase/firestore';

const subscribeToPracticeData = (sessionId, callback) => {
  if (!sessionId) {
    console.error('Session ID is required for subscription');
    return () => {};
  }
  const docRef = doc(db, 'practices', sessionId);
  // Set up real-time listener
  const unsubscribe = onSnapshot(
    docRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        callback({
          ...data,
          id: docSnapshot.id
        });
      } else {
        console.log('No practice data available for session:', sessionId);
        callback(null);
      }
    },
    (error) => {
      console.error('Error listening to practice data:', error);
    }
  );
  return unsubscribe;
};

export const practiceDataService = {
  async savePracticeData(sessionId, data) {
    try {
      const normalized = {
        ...data,
        metrics: {
          planned: {
            ...data.metrics?.planned,
            rpeCourt: data.metrics?.planned?.rpeCourt || 0,
            rpeGym: data.metrics?.planned?.rpeGym || 0
          },
          actual: {
            ...data.metrics?.actual,
            rpeCourt: data.metrics?.actual?.rpeCourt || 0,
            rpeGym: data.metrics?.actual?.rpeGym || 0
          }
        },
        rpeCourtPlanned: data.rpeCourtPlanned || data.metrics?.planned?.rpeCourt || 0,
        rpeGymPlanned: data.rpeGymPlanned || data.metrics?.planned?.rpeGym || 0,
        lastUpdated: Date.now()
      };
      await db.collection('practices').doc(sessionId).set(normalized, { merge: true });
      return normalized;
    } catch (error) {
      console.error('Failed to save practice data:', error);
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
  },
  async syncPracticeWithSchedule(sessionId, scheduleData) {
    try {
      const practiceData = await this.getPracticeData(sessionId);
      if (practiceData) {
        const updatedPlan = scheduleData.parts.map(part => ({
          id: part.id,
          name: part.label,
          duration: part.minutes,
          isHighIntensity: part.highIntensity,
          notes: part.notes,
          courts: scheduleData.courts,
        }));
        await this.savePracticeData(sessionId, {
          ...practiceData,
          plan: updatedPlan,
        });
      }
    } catch (error) {
      console.error('Error syncing practice with schedule:', error);
    }
  },
  async syncScheduleWithPractice(scheduleData) {
    const firebaseData = {
      totalMinutes: scheduleData.totalMinutes || 0,
      highIntensityMinutes: scheduleData.highIntensityMinutes || 0,
      courts: scheduleData.courts || 0,
      rpeCourtPlanned: scheduleData.rpeCourtPlanned || 0,
      rpeGymPlanned: scheduleData.rpeGymPlanned || 0,
      plan: scheduleData.parts?.map(part => ({
        name: part.label || '',
        duration: part.minutes || 0,
        isHighIntensity: Boolean(part.highIntensity),
        courts: part.courts || 0
      })) || [],
      metrics: {
        planned: {
          totalTime: scheduleData.totalMinutes || 0,
          highIntensity: scheduleData.highIntensityMinutes || 0,
          courtsUsed: scheduleData.courts || 0,
          rpeCourt: scheduleData.rpeCourtPlanned || 0,
          rpeGym: scheduleData.rpeGymPlanned || 0
        },
        actual: {
          totalTime: 0,
          highIntensity: 0,
          courtsUsed: 0,
          rpeCourt: 0,
          rpeGym: 0
        }
      },
      lastUpdated: Date.now()
    };
    try {
      await db.collection('practices').doc(scheduleData.id).set(firebaseData, { merge: true });
      return firebaseData;
    } catch (error) {
      console.error('Failed to sync practice data:', error);
      throw error;
    }
  },
  async syncSessionToPracticeLive(sessionId, sessionData) {
    try {
      const practiceRef = doc(db, 'practices', sessionId);
      
      const practiceMetrics = {
        // Add root level fields
        totalMinutes: Number(sessionData.totalMinutes) || 0,
        highIntensityMinutes: Number(sessionData.highIntensityMinutes) || 0, 
        courts: Number(sessionData.courts) || 0,
        metrics: {
          planned: {
            totalTime: Number(sessionData.totalMinutes) || 0,
            highIntensity: Number(sessionData.highIntensityMinutes) || 0,
            courtsUsed: Number(sessionData.courts) || 0,
            rpeCourt: Number(sessionData.rpeCourtPlanned) || 0,
            rpeGym: Number(sessionData.rpeGymPlanned) || 0
          },
          actual: {
            totalTime: 0,
            highIntensity: 0,
            courtsUsed: 0,
            rpeCourt: 0,
            rpeGym: 0
          }
        },
        lastUpdated: new Date().toISOString()
      };

      await setDoc(practiceRef, practiceMetrics, { merge: true });
      return practiceMetrics;
    } catch (error) {
      console.error('Failed to sync session to PracticeLive:', error);
      throw error;
    }
  },

  formatPracticeForSchedule(practiceData) {
    return {
      totalMinutes: practiceData.totalDuration || 0,
      highIntensityMinutes: practiceData.plan?.reduce((acc, part) => 
        acc + (part.isHighIntensity ? (part.duration || 0) : 0), 0) || 0,
      courts: practiceData.courts || 0,
      parts: practiceData.plan?.map(part => ({
        id: part.id,
        label: part.name || '',
        minutes: part.duration || 0,
        highIntensity: !!part.isHighIntensity,
        notes: part.notes || '',
        courts: part.courts || practiceData.courts || 0
      })) || []
    };
  },

  subscribeToPracticeData,
};