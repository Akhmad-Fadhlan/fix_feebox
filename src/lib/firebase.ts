
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIy5Vr143aV2MEXmVLWPFwjzuOzySPlqQ",
  authDomain: "lokerku-8b9d6.firebaseapp.com",
  databaseURL: "https://lokerku-8b9d6-default-rtdb.firebaseio.com/",
  projectId: "lokerku-8b9d6",
  storageBucket: "lokerku-8b9d6.firebasestorage.app",
  messagingSenderId: "744145788849",
  appId: "1:744145788849:web:8135cdee377ddefda5a790"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Realtime Database and get a reference to the service
export const realtimeDb = getDatabase(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
