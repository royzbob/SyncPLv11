import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicitly set browserLocalPersistence to guarantee login session persists across reloads, tab closes, and navigations
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("[Auth Persistence] Note:", err?.message || err);
  });
} catch (e) {
  console.warn("[Auth Persistence] Setup notice:", e);
}

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

