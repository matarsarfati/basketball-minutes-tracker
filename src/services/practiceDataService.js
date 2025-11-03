import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class PracticeDataService {
  lastSaveTimestamp = null;

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
        clientTimestamp: saveTimestamp
      };

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

        if (data?.clientTimestamp === this.lastSaveTimestamp) {
          console.log('📥 Skipping own update');
          return;
        }

        console.log('📥 Received practice data:', {
          isFirstLoad,
          hasMetrics: !!data?.metrics
        });

        callback(data, isFirstLoad);
        isFirstLoad = false;
      },
      (error) => {
        console.error('❌ Subscription error:', error);
      }
    );
  };
}

export const practiceDataService = new PracticeDataService();