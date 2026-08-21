import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

let authInstance: any = null;

export async function getFirebaseAuth() {
  if (authInstance) return authInstance;

  try {
    // Fetch the config dynamically from our backend API, preventing build-time static import checks.
    const res = await fetch("/api/firebase-config").catch(() => null);
    if (!res || !res.ok) {
      console.warn("Could not retrieve Firebase config from backend endpoint.");
      return null;
    }
    const config = await res.json();

    if (!config || !config.apiKey) {
      console.warn("Firebase applet config is not populated yet. Waiting for user OAuth consent.");
      return null;
    }

    let app;
    if (getApps().length === 0) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.error("Failed to initialize Firebase Auth dynamically:", error);
    return null;
  }
}

// Perform Google Sign In and request Google Sheets scopes
export async function connectGoogleSheets(): Promise<{ accessToken: string; user: any } | null> {
  const auth = await getFirebaseAuth();
  if (!auth) {
    throw new Error("Sistem autentikasi Google belum siap. Mohon setujui akses OAuth di kartu bawah terlebih dahulu.");
  }

  const provider = new GoogleAuthProvider();
  // Request Google Sheets and Drive.file scopes
  provider.addScope("https://www.googleapis.com/auth/spreadsheets");
  provider.addScope("https://www.googleapis.com/auth/drive.file");

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken;

    if (!accessToken) {
      throw new Error("Gagal memperoleh token akses Google Sheets.");
    }

    return {
      accessToken,
      user: result.user
    };
  } catch (error: any) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

export async function disconnectGoogleSheets() {
  const auth = await getFirebaseAuth();
  if (auth) {
    await signOut(auth);
  }
}
