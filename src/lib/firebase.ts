import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const functions = getFunctions(app, 'us-central1')

// Opt-in: `npm run dev` talks to the real project by default. Set
// VITE_USE_FIREBASE_EMULATORS=true to point at `firebase emulators:start`
// instead.
if (
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
