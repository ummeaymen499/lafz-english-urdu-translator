const DATABASE_NAME = "lafz-local-journal";
const STORE_NAME = "translations";
const DATABASE_VERSION = 2;

type JournalRecord = { id: string };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support the local translation journal."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
      else if (oldVersion < 2) request.transaction?.objectStore(STORE_NAME).clear();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local translation journal."));
  });
}

export async function loadJournal<T>(): Promise<T[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => { database.close(); resolve(request.result as T[]); };
    request.onerror = () => { database.close(); reject(request.error ?? new Error("Could not read the local translation journal.")); };
  });
}

export async function replaceJournal<T extends JournalRecord>(entries: T[]): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    entries.forEach((entry) => store.put(entry));
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the local translation journal."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving the local translation journal was cancelled."));
  });
}

export async function clearJournal(): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear the local translation journal."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Clearing the local translation journal was cancelled."));
  });
}
