import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connectivity check as per instructions
async function testConnection() {
  try {
    // Using a path that follows rules if possible, but 'test/connection' is often used
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase 서버에 연결할 수 없습니다. 네트워크 상태를 확인하시거나, Firestore 데이터베이스가 생성되었는지 확인해 주세요.");
    }
  }
}

testConnection();
