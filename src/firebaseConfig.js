// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQc9c_MWG-V6MmJiSArQcMUC-rT-auYkY",
  authDomain: "tischkicker-cabaa.firebaseapp.com",
  databaseURL: "https://tischkicker-cabaa-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tischkicker-cabaa",
  storageBucket: "tischkicker-cabaa.appspot.com",
  messagingSenderId: "996545403314",
  appId: "1:996545403314:web:6c51f867dcf4d176b52cab",
  measurementId: "G-1PY8E3XFWD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);