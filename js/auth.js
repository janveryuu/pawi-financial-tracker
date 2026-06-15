import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

let currentUser = null;

export function initAuth(onLogin, onLogout) {
  onAuthStateChanged(auth, async (user) => {
    if (user && !user.isAnonymous) {
      currentUser = user;
      console.log('User signed in with Google:', user.uid);
      if (onLogin) onLogin(user);
    } else {
      currentUser = null;
      console.log('No authenticated user. Triggering login screen...');
      
      // If they somehow have an anonymous session leftover, sign them out
      if (user && user.isAnonymous) {
        signOut(auth).catch(console.error);
      }
      
      if (onLogout) onLogout();
    }
  });
}

export function getCurrentUser() {
  return currentUser;
}

export function isAnonymous() {
  return currentUser ? currentUser.isAnonymous : true;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Successfully signed in with Google:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("Google sign in failed:", error);
    throw error;
  }
}

export async function logOut() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error", error);
  }
}
