import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

let auth = null;
let firebaseApp = null;

if (isFirebaseConfigured()) {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
}

export { auth, firebaseApp, isFirebaseConfigured };
