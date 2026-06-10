import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Reemplazá esto con tus credenciales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAbU3VkwfSMDajfD0Q4rrTojEA2uDuIDNQ",
  authDomain: "batik-843ba.firebaseapp.com",
  projectId: "batik-843ba",
  storageBucket: "batik-843ba.firebasestorage.app",
  messagingSenderId: "1081272447968",
  appId: "1:1081272447968:web:f0b2bce1670ab5bfb3f185",
  measurementId: "G-C73TPDRMRB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);