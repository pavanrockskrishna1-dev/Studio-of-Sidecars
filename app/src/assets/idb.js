/* Mission 10E (Asset Import Manager) — tiny IndexedDB wrapper.
   Imported assets (original file bytes, generated previews, metadata) live
   here so they survive reloads. No dependencies, promise-based, and every
   failure degrades to "session-only import" instead of breaking the Studio:
   the caller falls back to in-memory records when IDB is unavailable. */

const DB_NAME = "sos-asset-library";
const STORE = "assets";
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
    const store = t.objectStore(STORE);
    const out = fn(store);
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
    t.onerror = () => reject(t.error || new Error("IndexedDB transaction failed"));
  });
}

export async function idbPut(record) {
  const db = await openDb();
  return tx(db, "readwrite", (s) => s.put(record));
}

export async function idbGet(id) {
  const db = await openDb();
  return tx(db, "readonly", (s) => s.get(id));
}

export async function idbAll() {
  const db = await openDb();
  return tx(db, "readonly", (s) => s.getAll());
}

export async function idbDelete(id) {
  const db = await openDb();
  return tx(db, "readwrite", (s) => s.delete(id));
}
