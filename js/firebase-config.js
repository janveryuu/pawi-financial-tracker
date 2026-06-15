import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_-zvzSWj99LVjzZRql8zc0zvjx1Ez_Gs",
  authDomain: "pawi-budget-tracker.firebaseapp.com",
  projectId: "pawi-budget-tracker",
  storageBucket: "pawi-budget-tracker.firebasestorage.app",
  messagingSenderId: "313269159091",
  appId: "1:313269159091:web:7795c5d01d9ff12e0c9cc6",
  measurementId: "G-FP362F5FMZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, offline persistence disabled.');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence.');
  }
});

export { auth, db };
