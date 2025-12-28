// js/firebase.js (Multi-Driver Project)

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ✅ Firebase configuration (converted correctly)
const firebaseConfig = {
  apiKey: "AIzaSyAyi3uTjQZ6ruzXeqKWTGolZBx7wjutQd8",
  authDomain: "multi-driver-live-tracking.firebaseapp.com",
  databaseURL: "https://multi-driver-live-tracking-default-rtdb.firebaseio.com",
  projectId: "multi-driver-live-tracking",
  storageBucket: "multi-driver-live-tracking.appspot.com",
  messagingSenderId: "834561348072",
  appId: "1:834561348072:web:bd6553c6cbfcce897a145d"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
