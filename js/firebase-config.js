// Paste the Firebase web app configuration from Firebase Console here.
// Firebase web config identifies your project; it is not an admin/private key.
// Never paste a service-account JSON file or private service-account key here.
export const firebaseConfig = {
  apiKey: 'PASTE_API_KEY_HERE',
  authDomain: 'PASTE_PROJECT_ID_HERE.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID_HERE',
  storageBucket: 'PASTE_STORAGE_BUCKET_HERE',
  messagingSenderId: 'PASTE_MESSAGING_SENDER_ID_HERE',
  appId: 'PASTE_APP_ID_HERE',
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
