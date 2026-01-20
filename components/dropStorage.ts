const DB_NAME = 'dragDropBox';
const STORE_NAME = 'entries';
const DB_VERSION = 1;

export interface PersistedEntry {
    id: string;
    name: string;
    scoreType: 'gain' | 'deduction';
    selectedIndex?: number;
    criteria?: any[];
    baseType?: string;
    fixedScore?: number;
    categoryKey?: string;
    bonusActive?: boolean;
    justAdded?: boolean;
    timerSeconds?: number;
    timerRunning?: boolean;
    timerStartTs?: number | null;
    timerPaused?: boolean;
}

export type PersistedState = { deductions: PersistedEntry[]; gains: PersistedEntry[] };

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    });
}

export async function loadPersistedState(dateKey: string): Promise<PersistedState> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(dateKey);
            req.onsuccess = () => {
                const payload = (req.result as PersistedState | undefined) ?? { deductions: [], gains: [] };
                resolve({ deductions: payload.deductions ?? [], gains: payload.gains ?? [] });
            };
            req.onerror = () => reject(req.error ?? new Error('Read failed'));
        });
    } catch (err) {
        return { deductions: [], gains: [] };
    }
}

export async function savePersistedState(dateKey: string, deductions: PersistedEntry[], gains: PersistedEntry[]) {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put({ deductions, gains }, dateKey);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Write failed'));
        });
    } catch (err) {
        // ignore persistence errors
    }
}

export async function clearPersistedState(dateKey: string) {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(dateKey);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Delete failed'));
        });
    } catch (err) {
        // ignore
    }
}

export async function listAllStates(): Promise<Array<{ dateKey: string; state: PersistedState }>> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAllKeys();
            req.onsuccess = async () => {
                const keys = (req.result as string[]).filter(Boolean);
                const results: Array<{ dateKey: string; state: PersistedState }> = [];
                const fetches = keys.map(key => new Promise<void>((res, rej) => {
                    const r = store.get(key);
                    r.onsuccess = () => {
                        const payload = (r.result as PersistedState | undefined) ?? { deductions: [], gains: [] };
                        results.push({ dateKey: key, state: payload });
                        res();
                    };
                    r.onerror = () => rej(r.error ?? new Error('Read failed'));
                }));
                try {
                    await Promise.all(fetches);
                    resolve(results);
                } catch (err) {
                    reject(err);
                }
            };
            req.onerror = () => reject(req.error ?? new Error('List keys failed'));
        });
    } catch (err) {
        return [];
    }
}
