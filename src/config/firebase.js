// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDckY0Pvs1Z8uheDEQ26KhixIR-g6fsuWs",
  authDomain: "basketball-eda67.firebaseapp.com",
  projectId: "basketball-eda67",
  storageBucket: "basketball-eda67.firebasestorage.app",
  messagingSenderId: "877731431491",
  appId: "1:877731431491:web:e77dcf6a596455e3bdc0f6",
  measurementId: "G-NG04R1WVBH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('Firebase config:', {
  projectId: db.app.options.projectId,
  databaseURL: db.app.options.databaseURL
});

console.log('Firebase config loaded:', db ? 'Successfully' : 'Failed');
console.log('Firebase configuration loaded:', db ? 'Firestore initialized successfully' : 'Firestore initialization failed');
console.log('Firestore database instance:', db);

// Export everything needed
export { app, db, storage };