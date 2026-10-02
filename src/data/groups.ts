import {
  addDoc, collection, doc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Group } from '../lib/types'

const groupsCol = (uid: string) => collection(db, 'users', uid, 'groups')

export function subscribeGroups(uid: string, onData: (groups: Group[]) => void, onError: (e: Error) => void) {
  return onSnapshot(
    query(groupsCol(uid), orderBy('createdAt', 'desc')),
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }) as Group)),
    onError,
  )
}

export async function createGroup(uid: string, name: string) {
  const ref = await addDoc(groupsCol(uid), {
    name: name.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export function renameGroup(uid: string, groupId: string, name: string) {
  return updateDoc(doc(groupsCol(uid), groupId), { name: name.trim(), updatedAt: serverTimestamp() })
}

/** Deletes the group and every expense in it, atomically. */
export async function deleteGroup(uid: string, groupId: string) {
  const expenses = await getDocs(query(collection(db, 'users', uid, 'expenses'), where('groupId', '==', groupId)))
  const batch = writeBatch(db)
  expenses.forEach((e) => batch.delete(e.ref))
  batch.delete(doc(groupsCol(uid), groupId))
  await batch.commit()
}
