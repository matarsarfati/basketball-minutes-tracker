import { db } from './config/firebase';
import { setDoc, doc } from 'firebase/firestore';

const migrateToFirestore = async () => {
  try {
    // Get data from localStorage
    const exercises = JSON.parse(localStorage.getItem('basketball_exercises'));
    const muscleGroups = JSON.parse(localStorage.getItem('muscle_groups'));

    console.log('Found', exercises.length, 'exercises');
    console.log('Found', muscleGroups.length, 'muscle groups');

    // Save to Firestore
    await setDoc(doc(db, 'app_data', 'exercises'), {
      exercises: exercises,
      updated_at: new Date().toISOString()
    });

    await setDoc(doc(db, 'app_data', 'muscle_groups'), {
      groups: muscleGroups,
      updated_at: new Date().toISOString()
    });

    console.log('✅ Successfully saved to Firestore!');
    alert('Data migrated successfully! Refresh the page.');
  } catch (error) {
    console.error('Migration failed:', error);
    alert('Migration failed: ' + error.message);
  }
};

// Run migration
migrateToFirestore();

export default migrateToFirestore;