import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { auth, firebaseApp } from './firebase.js';

export const db = firebaseApp ? getFirestore(firebaseApp) : null;

export function getSignedInUser() {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const stopListening = onAuthStateChanged(auth, (user) => {
      stopListening();
      resolve(user);
    });
  });
}

function userDocument(user, collectionName, documentId) {
  return doc(db, 'users', user.uid, collectionName, documentId);
}

function userCollection(user, collectionName) {
  return collection(db, 'users', user.uid, collectionName);
}

export async function saveUserProfile(user) {
  if (!db || !user) return false;
  const profileReference = doc(db, 'users', user.uid);
  const existingProfile = await getDoc(profileReference);
  const profile = {
    name: user.displayName || user.email?.split('@')[0] || 'Student',
    email: user.email || '',
  };
  if (!existingProfile.exists()) profile.createdAt = serverTimestamp();
  await setDoc(profileReference, profile, { merge: true });
  return true;
}

export async function saveStudyMaterial(user, material) {
  if (!db || !user) return null;
  const reference = await addDoc(userCollection(user, 'studyMaterials'), {
    title: material.title || material.fileName,
    fileName: material.fileName,
    uploadDate: serverTimestamp(),
    summary: material.summary || '',
    pageCount: Number(material.pageCount) || 0,
    characterCount: Number(material.characterCount) || 0,
    topics: Array.isArray(material.topics) ? material.topics : [],
  });
  return reference.id;
}

export async function saveStudyActivity(user, activity) {
  if (!db || !user) return false;
  await addDoc(userCollection(user, 'progress'), {
    activity: activity.activity || 'study',
    score: Number.isFinite(Number(activity.score)) ? Number(activity.score) : null,
    documentId: activity.documentId || null,
    timestamp: serverTimestamp(),
  });
  return true;
}

export async function updateStudyMaterial(user, materialId, updates) {
  if (!db || !user || !materialId) return false;
  await updateDoc(userDocument(user, 'studyMaterials', materialId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function removeStudyMaterial(user, materialId) {
  if (!db || !user || !materialId) return false;
  await deleteDoc(userDocument(user, 'studyMaterials', materialId));
  return true;
}

export async function getStudyMaterials(user, maximum = 10) {
  if (!db || !user) return [];
  const materialsQuery = query(userCollection(user, 'studyMaterials'), orderBy('uploadDate', 'desc'), limit(maximum));
  const snapshot = await getDocs(materialsQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveQuizResult(user, result) {
  if (!db || !user) return false;
  await addDoc(userCollection(user, 'quizResults'), {
    score: Number(result.score) || 0,
    totalQuestions: Number(result.totalQuestions) || 0,
    percentage: Number(result.percentage) || 0,
    date: serverTimestamp(),
  });
  return true;
}

export async function getStudyActivities(user, maximum = 20) {
  if (!db || !user) return [];
  const activityQuery = query(userCollection(user, 'progress'), orderBy('timestamp', 'desc'), limit(maximum));
  const snapshot = await getDocs(activityQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getQuizResults(user, maximum = 20) {
  if (!db || !user) return [];
  const resultsQuery = query(userCollection(user, 'quizResults'), orderBy('date', 'desc'), limit(maximum));
  const snapshot = await getDocs(resultsQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function saveFlashcardProgress(user, progress) {
  if (!db || !user) return false;
  await setDoc(userDocument(user, 'flashcardProgress', 'current'), {
    known: Number(progress.known) || 0,
    needRevision: Number(progress.needRevision) || 0,
    reviewed: Number(progress.reviewed) || 0,
    ratings: progress.ratings || {},
    date: serverTimestamp(),
  }, { merge: true });
  return true;
}

export async function getFlashcardProgress(user) {
  if (!db || !user) return null;
  const snapshot = await getDoc(userDocument(user, 'flashcardProgress', 'current'));
  return snapshot.exists() ? snapshot.data() : null;
}
