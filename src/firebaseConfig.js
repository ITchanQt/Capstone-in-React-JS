import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDAYL5q-CG3bU1VuRs3PVZ11CUm34ML5BM",
  authDomain: "dataloger-48c70.firebaseapp.com",
  databaseURL: "https://dataloger-48c70-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dataloger-48c70",
  storageBucket: "dataloger-48c70.firebasestorage.app",
  messagingSenderId: "651248484497",
  appId: "1:651248484497:web:0c5ab0d250049b2a99bf30",
  measurementId: "G-Q795NPXTMR"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };