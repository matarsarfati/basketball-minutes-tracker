import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class MeetingService {
  /**
   * Save meeting protocol data to Firestore
   */
  saveMeetingData = async (sessionId, data) => {
    console.log('📤 Saving meeting data:', {
      sessionId,
      timestamp: new Date().toISOString()
    });

    try {
      const docRef = doc(db, 'meetingProtocols', sessionId);

      const normalized = {
        sessionId: sessionId,
        date: data.date || '',
        time: data.time || '',
        agenda: data.agenda || [],
        actionItems: data.actionItems || [],
        generalNotes: data.generalNotes || '',
        lastUpdated: serverTimestamp()
      };

      await setDoc(docRef, normalized, { merge: false });
      console.log('✅ Meeting save successful');
      return normalized;
    } catch (error) {
      console.error('❌ Meeting save failed:', error);
      throw error;
    }
  };

  /**
   * Get meeting protocol data by sessionId
   */
  getMeetingData = async (sessionId) => {
    if (!sessionId) {
      console.warn('No sessionId provided to getMeetingData');
      return null;
    }

    try {
      const docRef = doc(db, 'meetingProtocols', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('📥 Meeting data loaded successfully');
        return docSnap.data();
      } else {
        console.log('No meeting data found for session:', sessionId);
        return null;
      }
    } catch (error) {
      console.error('Error getting meeting data:', error);
      throw error;
    }
  };

  /**
   * Delete meeting protocol data for a session
   */
  deleteMeetingData = async (sessionId) => {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    try {
      const docRef = doc(db, 'meetingProtocols', sessionId);
      await deleteDoc(docRef);
      console.log('✅ Meeting data deleted for session:', sessionId);
    } catch (error) {
      console.error('Error deleting meeting data:', error);
      throw error;
    }
  };
}

export const meetingService = new MeetingService();
