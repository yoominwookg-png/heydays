import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity check as per instructions
async function testConnection() {
  try {
    // Attempting to fetch a document from the server to verify connectivity
    await getDocFromServer(doc(db, 'system', 'health'));
    console.log("Firebase Firestore connection successful.");
  } catch (error) {
    console.error("Firestore Connectivity Error Detail:", error);
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firebase 서버에 연결할 수 없습니다. 네트워크 상태를 확인하시거나, Firestore 데이터베이스가 생성되었는지 확인해 주세요. (Client is Offline)");
      } else if (error.message.includes('NOT_FOUND')) {
        // Not found is actually a success in terms of connectivity!
        console.log("Firebase connection verified (Document not found, but backend reached).");
      } else {
        console.error("Firebase connection error: " + error.message);
      }
    }
  }
}

testConnection();
