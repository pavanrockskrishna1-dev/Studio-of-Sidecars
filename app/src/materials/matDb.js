/* Mission 11A (Agent #2) — material persistence.
   ---------------------------------------------------------------------------
   Same architecture as Mission 10E's asset database (see ../assets/idb.js):
   dependency-free, promise-based, one object store with keyPath "id", and
   every failure degrading to "session-only edit" instead of breaking Studio.

   It deliberately opens its OWN database (`sos-materials`, version 1) rather
   than adding records to 10E's `sos-asset-library` store: the importer
   hydrates by reading *all* records out of that store, so a foreign record
   shape would be a change to Mission 10E's behaviour. Same pattern, separate
   namespace, neither module can disturb the other. */

const DB_NAME = "sos-materials";
const STORE = "records";
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error || new Error("IndexedDB transaction failed"));
  });
}

export async function matPut(record) {
  const db = await openDb();
  return tx(db, "readwrite", (s) => s.put(record));
}

export async function matGet(id) {
  const db = await openDb();
  return tx(db, "readonly", (s) => s.get(id));
}

export async function matDelete(id) {
  const db = await openDb();
  return tx(db, "readwrite", (s) => s.delete(id));
}

/** Read one record and never reject: a cold, private-mode or blocked database
 *  must leave the editor fully usable for the session. */
export async function matRead(id, fallback = null) {
  try {
    const rec = await matGet(id);
    return rec && rec.value !== undefined ? rec.value : fallback;
  } catch {
    return fallback;
  }
}

export async function matWrite(id, value) {
  try {
    await matPut({ id, value, updatedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}

export async function matRemove(id) {
  try {
    await matDelete(id);
    return true;
  } catch {
    return false;
  }
}
