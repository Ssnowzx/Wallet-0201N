import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkN8EbZnFEwcGYxaD0kIEn_r9g7gliZho",
  authDomain: "dags-bf1c8.firebaseapp.com",
  projectId: "dags-bf1c8",
  storageBucket: "dags-bf1c8.firebasestorage.app",
  messagingSenderId: "393472829135",
  appId: "1:393472829135:web:14ac8cb13bee2cd3eab9ba",
  measurementId: "G-2Q205551DK" // Este pode ser opcional, adicionei porque você o incluiu
};

console.log("Firebase Config:", firebaseConfig); // Log da configuração

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase App initialized:", app); // Log após inicializar o app

const auth = getAuth(app);
console.log("Firebase Auth instance obtained:", auth); // Log após obter a instância de auth

const db = getFirestore(app);
console.log("Firebase Firestore instance obtained:", db); // Log após obter a instância de firestore


export { app, auth, db };