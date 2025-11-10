import { doc, setDoc, getDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class PracticeDataService {
  lastSaveTimestamp = null;
  deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  savePracticeData = async (sessionId, data, isInitialLoad = false) => {
    if (isInitialLoad) {
      console.log('🔄 Skipping save during initial load');
      return null;
    }

    console.log('📤 Starting save operation:', {
      sessionId,
      timestamp: new Date().toISOString()
    });

    try {
      const docRef = doc(db, 'practices', sessionId);
      const saveTimestamp = new Date().getTime();
      this.lastSaveTimestamp = saveTimestamp;

      const normalized = {
        ...data,
        metrics: {
          planned: {
            totalTime: data.metrics?.planned?.totalTime ?? 0,
            highIntensity: data.metrics?.planned?.highIntensity ?? 0,
            courtsUsed: data.metrics?.planned?.courtsUsed ?? 0,
            rpeCourt: data.metrics?.planned?.rpeCourt ?? 0,
            rpeGym: data.metrics?.planned?.rpeGym ?? 0
          },
          actual: {
            totalTime: data.metrics?.actual?.totalTime ?? 0,
            highIntensity: data.metrics?.actual?.highIntensity ?? 0,
            courtsUsed: data.metrics?.actual?.courtsUsed ?? 0,
            rpeCourt: data.metrics?.actual?.rpeCourt ?? 0,
            rpeGym: data.metrics?.actual?.rpeGym ?? 0
          }
        },
        drillRows: data.drillRows || [],
        attendance: data.attendance || {},
        surveyCompleted: data.surveyCompleted || false,
        lastUpdated: serverTimestamp(),
        clientTimestamp: saveTimestamp,
        deviceId: this.deviceId
      };

      // Only include survey data if it exists (to avoid overwriting with empty objects)
      if (data.surveyData && Object.keys(data.surveyData).length > 0) {
        normalized.surveyData = data.surveyData;
      }
      if (data.gymSurveyData && Object.keys(data.gymSurveyData).length > 0) {
        normalized.gymSurveyData = data.gymSurveyData;
      }

      await setDoc(docRef, normalized, { merge: true });
      console.log('✅ Save successful');
      return normalized;
    } catch (error) {
      console.error('❌ Save failed:', error);
      throw error;
    }
  };

  subscribeToPracticeData = (sessionId, callback) => {
    if (!sessionId) {
      console.error('❌ No sessionId provided for subscription');
      return () => {};
    }

    console.log('🔄 Setting up subscription:', { sessionId });
    let isFirstLoad = true;

    const docRef = doc(db, 'practices', sessionId);

    return onSnapshot(
      docRef,
      (docSnap) => {
        const data = docSnap.data();

        // Only skip if this is our own device's recent save
        if (data?.deviceId === this.deviceId &&
            data?.clientTimestamp === this.lastSaveTimestamp) {
          console.log('📥 Skipping own update');
          return;
        }

        console.log('📥 Received practice data:', {
          isFirstLoad,
          hasMetrics: !!data?.metrics,
          hasSurveyData: !!data?.surveyData,
          hasGymSurveyData: !!data?.gymSurveyData,
          fromDevice: data?.deviceId
        });

        callback(data, isFirstLoad);
        isFirstLoad = false;
      },
      (error) => {
        console.error('❌ Subscription error:', error);
      }
    );
  };

  syncSessionToPracticeLive = async (sessionId, metricsToSync) => {
    if (!sessionId) {
      throw new Error('Session ID is required for sync');
    }

    console.log('🔄 Syncing schedule metrics to PracticeLive:', {
      sessionId,
      metricsToSync
    });

    try {
      const docRef = doc(db, 'practices', sessionId);

      // Map schedule metrics to PracticeLive structure
      const plannedMetrics = {
        totalTime: Number(metricsToSync.totalMinutes) || 0,
        highIntensity: Number(metricsToSync.highIntensityMinutes) || 0,
        courtsUsed: Number(metricsToSync.courts) || 0,
        rpeCourt: Number(metricsToSync.rpeCourtPlanned) || 0,
        rpeGym: Number(metricsToSync.rpeGymPlanned) || 0
      };

      // Prepare update data with default actual metrics
      const updateData = {
        metrics: {
          planned: plannedMetrics,
          actual: {
            totalTime: 0,
            highIntensity: 0,
            courtsUsed: 0,
            rpeCourt: 0,
            rpeGym: 0
          }
        },
        lastUpdated: serverTimestamp()
      };

      await setDoc(docRef, updateData, { merge: true });
      console.log('✅ Successfully synced metrics to PracticeLive');

      return updateData;
    } catch (error) {
      console.error('❌ Failed to sync metrics:', error);
      throw error;
    }
  };

  // Get practice data by sessionId
  getPracticeData = async (sessionId) => {
    if (!sessionId) {
      console.warn('No sessionId provided to getPracticeData');
      return null;
    }

    try {
      const docRef = doc(db, 'practices', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        console.log('No practice data found for session:', sessionId);
        return null;
      }
    } catch (error) {
      console.error('Error getting practice data:', error);
      throw error;
    }
  };

  // Update court RPE survey response for a player
  updateSurveyResponse = async (sessionId, playerName, surveyData) => {
    if (!sessionId || !playerName) {
      throw new Error('Session ID and player name are required');
    }

    try {
      const docRef = doc(db, 'practices', sessionId);

      // Get existing data first
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      // Merge the new survey response with existing survey data
      const surveyDataObj = existingData.surveyData || {};
      surveyDataObj[playerName] = {
        ...surveyData,
        timestamp: serverTimestamp()
      };

      await setDoc(docRef, {
        surveyData: surveyDataObj,
        lastUpdated: serverTimestamp(),
        clientTimestamp: Date.now(),
        deviceId: `survey-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      }, { merge: true });

      console.log('✅ Court RPE survey response saved for', playerName);
    } catch (error) {
      console.error('Error saving court RPE survey response:', error);
      throw error;
    }
  };

  // Update gym RPE survey response for a player
  updateGymSurveyResponse = async (sessionId, playerName, surveyData) => {
    if (!sessionId || !playerName) {
      throw new Error('Session ID and player name are required');
    }

    try {
      const docRef = doc(db, 'practices', sessionId);

      // Get existing data first
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      // Merge the new survey response with existing gym survey data
      const gymSurveyDataObj = existingData.gymSurveyData || {};
      gymSurveyDataObj[playerName] = {
        ...surveyData,
        timestamp: serverTimestamp()
      };

      await setDoc(docRef, {
        gymSurveyData: gymSurveyDataObj,
        lastUpdated: serverTimestamp(),
        clientTimestamp: Date.now(),
        deviceId: `gym-survey-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      }, { merge: true });

      console.log('✅ Gym RPE survey response saved for', playerName);
    } catch (error) {
      console.error('Error saving gym RPE survey response:', error);
      throw error;
    }
  };

  // Get court RPE survey data for a session
  getSurveyData = async (sessionId) => {
    if (!sessionId) {
      console.warn('No sessionId provided to getSurveyData');
      return null;
    }

    try {
      const docRef = doc(db, 'practices', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.surveyData || null;
      } else {
        console.log('No survey data found for session:', sessionId);
        return null;
      }
    } catch (error) {
      console.error('Error getting survey data:', error);
      return null; // Return null instead of throwing to prevent breaking the caller
    }
  };

  // Get gym RPE survey data for a session
  getGymSurveyData = async (sessionId) => {
    if (!sessionId) {
      console.warn('No sessionId provided to getGymSurveyData');
      return null;
    }

    try {
      const docRef = doc(db, 'practices', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.gymSurveyData || null;
      } else {
        console.log('No gym survey data found for session:', sessionId);
        return null;
      }
    } catch (error) {
      console.error('Error getting gym survey data:', error);
      return null; // Return null instead of throwing to prevent breaking the caller
    }
  };

  // Delete all practice data for a session
  deletePracticeData = async (sessionId) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    try {
      const docRef = doc(db, 'practices', sessionId);
      await deleteDoc(docRef);
      console.log('✅ Practice data deleted for session:', sessionId);
    } catch (error) {
      console.error('Error deleting practice data:', error);
      throw error;
    }
  };

  // Sync schedule updates to practice (for backwards compatibility)
  syncScheduleWithPractice = async (sessionId, sessionData) => {
    return this.syncSessionToPracticeLive(sessionId, sessionData);
  };
}

export const practiceDataService = new PracticeDataService();