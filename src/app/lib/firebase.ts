import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔥 إضافة الفايرستور
import { getStorage } from "firebase/storage";   // 🔥 إضافة الاستورج

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;
if (getApps().length === 0) {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  } else {
    console.warn("Firebase API Key is missing. Check your .env.local file.");
  }
} else {
  app = getApp();
}

// تهيئة الخدمات بأمان (لو الـ app مش موجود هيرجع null لتجنب كراش الـ Build)
const auth = app ? getAuth(app) : null as any;
const db = app ? getFirestore(app) : null as any;       // 🔥 تصدير الداتابيز بأمان
const storage = app ? getStorage(app) : null as any;   // 🔥 تصدير الاستورج بأمان

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, storage, googleProvider }; // 🔥 تصدير الكل هنا