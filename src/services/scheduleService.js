import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SCHEDULE_COLLECTION = 'schedule';

export const scheduleService = {
  async addScheduleEvent(eventData) {
    console.log('Attempting to add a new schedule event:', eventData);
    try {
      const docRef = await addDoc(collection(db, SCHEDULE_COLLECTION), eventData);
      console.log('Event successfully added. Document ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding schedule event:', error);
      throw error;
    }
  },

  async getScheduleEvents() {
    console.log('Fetching all schedule events...');
    try {
      const querySnapshot = await getDocs(collection(db, SCHEDULE_COLLECTION));
      const events = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        firebaseId: doc.id  // Ensure this is included
      }));
      console.log('Loaded events with IDs:', events.map(e => ({ id: e.id, firebaseId: e.firebaseId })));
      return events;
    } catch (error) {
      console.error('Error loading schedule events:', error);
      throw error;
    }
  },

  async updateScheduleEvent(eventId, updatedData) {
    try {
      const eventRef = doc(db, SCHEDULE_COLLECTION, eventId);
      await updateDoc(eventRef, updatedData);
    } catch (error) {
      console.error('Error updating schedule event:', error);
      throw error;
    }
  },

  async deleteScheduleEvent(eventId) {
    try {
      const eventRef = doc(db, SCHEDULE_COLLECTION, eventId);
      await deleteDoc(eventRef);
    } catch (error) {
      console.error('Error deleting schedule event:', error);
      throw error;
    }
  },

  async verifyEvent(eventId) {
    try {
      const eventRef = doc(db, SCHEDULE_COLLECTION, eventId);
      const docSnap = await getDoc(eventRef);

      if (docSnap.exists()) {
        console.log('Document exists:', docSnap.data());
        return true;
      } else {
        console.log('Document does not exist!');
        return false;
      }
    } catch (error) {
      console.error('Error verifying document:', error);
      return false;
    }
  },

  async initializeTestEvent() {
    console.log('Initializing test event to create schedule collection...');
    const testEvent = {
      title: 'Test Event',
      date: new Date().toISOString(),
      slot: 'AM',
      type: 'Practice',
      created: new Date().toISOString()
    };

    try {
      const exists = (await this.getScheduleEvents()).length > 0;
      if (!exists) {
        const docRef = await this.addScheduleEvent(testEvent);
        console.log('Test event created successfully with ID:', docRef);
        await this.deleteScheduleEvent(docRef);
        console.log('Test event cleaned up');
      } else {
        console.log('Schedule collection already contains events');
      }
    } catch (error) {
      console.error('Failed to initialize test event:', error);
    }
  }
};

// Initialize test event immediately
scheduleService.initializeTestEvent().then(() => {
  console.log('Schedule collection initialization complete');
});

// Test function to verify Firebase connection and collection creation
async function testFirebaseConnection() {
  const testData = {
    title: 'Test Event',
    date: new Date().toISOString(),
    slot: 'AM',
    type: 'Test',
    created: new Date().toISOString()
  };

  try {
    // Try to add a document
    const docId = await scheduleService.addScheduleEvent(testData);
    console.log('Test document created with ID:', docId);

    // Verify it exists
    const exists = await scheduleService.verifyEvent(docId);
    console.log('Document exists:', exists);

    // Clean up
    await scheduleService.deleteScheduleEvent(docId);
    console.log('Test document cleaned up');

    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}

// Run the test
testFirebaseConnection().then(success => {
  console.log('Firebase connection test completed. Success:', success);
});
