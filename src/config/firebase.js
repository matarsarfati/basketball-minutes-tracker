import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDckY0Pvs1Z8uheDEQ26KhixIR-g6fsuWs",
  authDomain: "basketball-eda67.firebaseapp.com",
  projectId: "basketball-eda67",
  storageBucket: "basketball-eda67.firebasestorage.app",
  messagingSenderId: "877731431491",
  appId: "1:877731431491:web:e77dcf6a596455e3bdc0f6",
  measurementId: "G-NG04R1WVBH"
};

const app = initializeApp(firebaseConfig);

// Use memory cache instead of persistent
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

const storage = getStorage(app);

export { app, db, storage };