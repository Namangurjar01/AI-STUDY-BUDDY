// Paste the Firebase web app configuration from Firebase Console here.
// Firebase web config identifies your project; it is not an admin/private key.
// Never paste a service-account JSON file or private service-account key here.
export const firebaseConfig = {
  apiKey: "AIzaSyCsyV4dCXLONhF9qUs0lu0nypt7cSpOUEo",
  authDomain: "ai-study-buddy-39096.firebaseapp.com",
  projectId: "ai-study-buddy-39096",
  storageBucket: "ai-study-buddy-39096.firebasestorage.app",
  messagingSenderId: "454898202611",
  appId: "1:454898202611:web:f7773ec2e99e51fd334486",
  measurementId: "G-QZTZC6Z5PP",
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== 'PASTE_API_KEY_HERE' &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'PASTE_PROJECT_ID_HERE' &&
    firebaseConfig.appId &&
    firebaseConfig.appId !== 'PASTE_APP_ID_HERE'
  );
}
