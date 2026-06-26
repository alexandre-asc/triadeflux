import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth }      from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage }   from 'firebase-admin/storage'

let adminApp: App

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // A chave privada vem com \n literal da env — converter para quebra real
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

adminApp = getAdminApp()

export const adminAuth    = getAuth(adminApp)
export const adminDb      = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)
