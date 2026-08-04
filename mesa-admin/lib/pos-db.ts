/**
 * Minimal IndexedDB wrapper — no dependency (FR-POS-002/003 offline queue).
 * Covers exactly what the POS needs: object stores for queued transactions,
 * audit events, and the encrypted-template cache, with a tiny promise API.
 *
 * ponytail: if the app later needs more DB surface, replace this with a
 * maintained library; the API is deliberately narrow so migration is trivial.
 */

export interface IdbRecord {
  id?: number;
  createdAt: string;
  [key: string]: unknown;
}

export class LocalDb {
  private db: Promise<IDBDatabase> | null = null;
  private readonly name: string;
  private readonly version: number;
  private readonly stores: string[];

  constructor(name: string, version: number, stores: string[]) {
    this.name = name;
    this.version = version;
    this.stores = stores;
  }

  /** Lazily open the connection on first use so SSR (no indexedDB) never rejects at module scope. */
  private get dbPromise(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = this.open(this.name, this.version, this.stores);
    }
    return this.db;
  }

  private open(name: string, version: number, stores: string[]): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable (non-browser context)."));
        return;
      }
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const store of stores) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, {
              keyPath: "id",
              autoIncrement: true,
            });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error(`IndexedDB open failed for ${name}`));
    });
  }

  async add(store: string, value: Record<string, unknown>): Promise<number> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).add(value);
      req.onsuccess = () => resolve(Number(req.result));
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(store: string): Promise<IdbRecord[]> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as IdbRecord[]);
      req.onerror = () => reject(req.error);
    });
  }

  async delete(store: string, id: number): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async count(store: string): Promise<number> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(store: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const posDb = new LocalDb("mesa-pos", 1, [
  "queue", // queued meal transactions awaiting sync
  "audit", // audit events (overrides, reprints, logins)
  "templates", // encrypted template cache for offline matching
]);
