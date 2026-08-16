const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Since we can't easily run modern ES modules from src without babel, let's just inspect the .env file to construct a rest API call
