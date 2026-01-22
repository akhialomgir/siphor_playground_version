const DB_NAME = 'dragDropBox';
const STORE_NAME = 'entries';
const WEEKLY_STORE_NAME = 'weeklyGoals';
const DB_VERSION = 2;

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
    count?: number; // for count-based deductions
    customDescription?: string; // for custom expense description
    customScore?: number; // for custom expense score
    weeklyGoalId?: string;
    weeklyRewardId?: string; // track granted reward entry ID
}

export type PersistedState = { deductions: PersistedEntry[]; gains: PersistedEntry[] };

export interface WeeklyGoalProgress {
    count: number;
    rewarded: boolean;
}

export interface WeeklyGoalsState {
    goals: Record<string, WeeklyGoalProgress>;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = request.result;
            const oldVersion = (event.oldVersion ?? 0);
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            if (oldVersion < 2 && !db.objectStoreNames.contains(WEEKLY_STORE_NAME)) {
                db.createObjectStore(WEEKLY_STORE_NAME);
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

export async function loadWeeklyGoals(weekKey: string): Promise<WeeklyGoalsState> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(WEEKLY_STORE_NAME, 'readonly');
            const store = tx.objectStore(WEEKLY_STORE_NAME);
            const req = store.get(weekKey);
            req.onsuccess = () => {
                const payload = (req.result as WeeklyGoalsState | undefined) ?? { goals: {} };
                resolve({ goals: payload.goals ?? {} });
            };
            req.onerror = () => reject(req.error ?? new Error('Read failed'));
        });
    } catch (err) {
        return { goals: {} };
    }
}

export async function saveWeeklyGoals(weekKey: string, state: WeeklyGoalsState) {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(WEEKLY_STORE_NAME, 'readwrite');
            const store = tx.objectStore(WEEKLY_STORE_NAME);
            const req = store.put(state, weekKey);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Write failed'));
        });
    } catch (err) {
        // ignore persistence errors
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

export async function listAllWeeklyGoals(): Promise<Array<{ weekKey: string; state: WeeklyGoalsState }>> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(WEEKLY_STORE_NAME, 'readonly');
            const store = tx.objectStore(WEEKLY_STORE_NAME);
            const req = store.getAllKeys();
            req.onsuccess = async () => {
                const keys = (req.result as string[]).filter(Boolean);
                const results: Array<{ weekKey: string; state: WeeklyGoalsState }> = [];
                const fetches = keys.map(key => new Promise<void>((res, rej) => {
                    const r = store.get(key);
                    r.onsuccess = () => {
                        const payload = (r.result as WeeklyGoalsState | undefined) ?? { goals: {} };
                        results.push({ weekKey: key, state: { goals: payload.goals ?? {} } });
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

export interface ExportData {
    version: string;
    exportDate: string;
    data: Array<{ dateKey: string; state: PersistedState }>;
    weeklyGoals?: Array<{ weekKey: string; state: WeeklyGoalsState }>;
}

export async function exportAllData(): Promise<ExportData> {
    const allStates = await listAllStates();
    const weeklyGoals = await listAllWeeklyGoals();
    return {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: allStates,
        weeklyGoals
    };
}

export async function importAllData(importData: ExportData): Promise<void> {
    if (!importData.version || !Array.isArray(importData.data)) {
        throw new Error('Invalid import data format');
    }

    const db = await openDb();

    for (const { dateKey, state } of importData.data) {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(state, dateKey);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Write failed'));
        });
    }

    // Weekly goals are optional for backward compatibility
    const weeklyGoals = importData.weeklyGoals ?? [];
    for (const { weekKey, state } of weeklyGoals) {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(WEEKLY_STORE_NAME, 'readwrite');
            const store = tx.objectStore(WEEKLY_STORE_NAME);
            const req = store.put(state, weekKey);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Write failed'));
        });
    }
}
