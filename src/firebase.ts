import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, addDoc, updateDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export async function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string, userEmail?: string) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Salvar erro no Firestore para visualização no Admin
  try {
    await addDoc(collection(db, 'system_errors'), {
      ...errInfo,
      userId: userId || auth.currentUser?.uid,
      userEmail: userEmail || auth.currentUser?.email,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Falha ao salvar erro no Firestore:", e);
  }

  throw new Error(JSON.stringify(errInfo));
}

export async function sendNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning') {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, 'notifications');
  }
}

export async function logPageVisit(userId: string, pageName: string) {
  try {
    await addDoc(collection(db, 'page_visits'), {
      userId,
      pageName,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, 'page_visits');
  }
}
