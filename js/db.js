/* ============================================================
   SENTIMO — Database Layer (Firestore)
   ============================================================ */
import { db } from './firebase-config.js';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch, query, where } from "firebase/firestore";
import { getCurrentUser } from './auth.js';

function getUserId() {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");
  return user.uid;
}

function getColl(collName) {
  const uid = getUserId();
  return collection(db, `users/${uid}/${collName}`);
}

export async function openDB() {
  // DB is initialized in firebase-config.js, this just fulfills the promise for app.js
  return Promise.resolve(db);
}

export async function add(collName, data) {
  const ref = doc(getColl(collName), data.id || data.key);
  await setDoc(ref, data);
  return data.id || data.key;
}

export async function getById(collName, id) {
  const ref = doc(getColl(collName), id);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function getAll(collName) {
  const snap = await getDocs(getColl(collName));
  return snap.docs.map(doc => doc.data());
}

export async function update(collName, data) {
  const ref = doc(getColl(collName), data.id || data.key);
  await setDoc(ref, data, { merge: true });
}

export async function setSetting(key, value) {
  const ref = doc(getColl('settings'), key);
  await setDoc(ref, { key, value });
}

export async function remove(collName, id) {
  const ref = doc(getColl(collName), id);
  await deleteDoc(ref);
}

export async function count(collName) {
  const snap = await getDocs(getColl(collName));
  return snap.size;
}

export async function isEmpty() {
  try {
    const totalAccounts = await count('accounts');
    return totalAccounts === 0;
  } catch (e) {
    return true;
  }
}

export async function bulkInsert(collName, records) {
  if (!records || records.length === 0) return;
  const batch = writeBatch(db);
  const collRef = getColl(collName);
  
  records.forEach(record => {
    const ref = doc(collRef, record.id || record.key);
    batch.set(ref, record);
  });
  
  await batch.commit();
}

export async function clearStore(collName) {
  const snap = await getDocs(getColl(collName));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function clearAll() {
  const stores = ['accounts', 'transactions', 'goals', 'recurring', 'settings'];
  for (const store of stores) {
    await clearStore(store);
  }
}

export async function getTransactionsByDateRange(startDate, endDate) {
  const allTxs = await getAll('transactions');
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return allTxs.filter(tx => {
    const time = new Date(tx.date).getTime();
    return time >= start && time <= end;
  });
}

export async function getTransactionsByAccount(accountId) {
  const q = query(getColl('transactions'), where("accountId", "==", accountId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data());
}

export async function getTransactionsByCategory(category) {
  const q = query(getColl('transactions'), where("category", "==", category));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data());
}
