const DB_NAME = 'dragDropBox';
const STORE_NAME = 'entries';
const WEEKLY_STORE_NAME = 'weeklyGoals';
const TOTAL_SCORE_STORE_NAME = 'totalScores';
const BANK_STORE_NAME = 'bank';
const DB_VERSION = 4;

import type { ScoringCriteria } from '@/lib/scoring';

export interface BankFixedDeposit {
    id: string;
    amount: number;
    startDate: string;
    maturityDate: string;
    rate: number;
}

export interface BankState {
    demand: number;
    fixed: BankFixedDeposit[];
}

export interface PersistedEntry {
    id: string;
    name: string;
    scoreType: 'gain' | 'deduction';
    selectedIndex?: number;
    criteria?: ScoringCriteria[];
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

// Total score accumulation history: { dateKey: cumulativeTotal }
export type TotalScoreHistory = Record<string, number>;

const BANK_STATE_KEY = 'state';

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
            if (oldVersion < 3 && !db.objectStoreNames.contains(TOTAL_SCORE_STORE_NAME)) {
                db.createObjectStore(TOTAL_SCORE_STORE_NAME);
            }
            if (oldVersion < 4 && !db.objectStoreNames.contains(BANK_STORE_NAME)) {
                db.createObjectStore(BANK_STORE_NAME);
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

export async function loadBankState(): Promise<BankState> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(BANK_STORE_NAME, 'readonly');
            const store = tx.objectStore(BANK_STORE_NAME);
            const req = store.get(BANK_STATE_KEY);
            req.onsuccess = () => {
                const payload = (req.result as BankState | undefined) ?? { demand: 0, fixed: [] };
                resolve({ demand: payload.demand ?? 0, fixed: payload.fixed ?? [] });
            };
            req.onerror = () => reject(req.error ?? new Error('Read failed'));
        });
    } catch (err) {
        return { demand: 0, fixed: [] };
    }
}

export async function saveBankState(state: BankState): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(BANK_STORE_NAME, 'readwrite');
            const store = tx.objectStore(BANK_STORE_NAME);
            const req = store.put(state, BANK_STATE_KEY);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Write failed'));
        });
    } catch (err) {
        // ignore persistence errors
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
// Load total score history
const TOTAL_SCORE_KEY = 'history';

export async function loadTotalScoreHistory(): Promise<TotalScoreHistory> {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(TOTAL_SCORE_STORE_NAME, 'readonly');
            const store = tx.objectStore(TOTAL_SCORE_STORE_NAME);
            const req = store.get(TOTAL_SCORE_KEY);
            req.onsuccess = () => {
                const payload = (req.result as TotalScoreHistory | undefined) ?? {};
                resolve(payload);
            };
            req.onerror = () => reject(req.error ?? new Error('Read failed'));
        });
    } catch (err) {
        return {};
    }
}

// Save total score history
export async function saveTotalScoreHistory(history: TotalScoreHistory): Promise<void> {
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(TOTAL_SCORE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(TOTAL_SCORE_STORE_NAME);
            const req = store.put(history, TOTAL_SCORE_KEY);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error ?? new Error('Write failed'));
        });
    } catch (err) {
        // ignore persistence errors
    }
}

// Calculate total score for a specific date from stored data
function calculateDayScore(state: PersistedState): number {
    // Separate gains and deductions for clarity
    const gainScore = (state.gains ?? []).reduce((sum, entry) => {
        if (entry.scoreType !== 'gain') return sum;

        // With criteria (tiered scoring)
        if (entry.criteria && entry.criteria.length > 0) {
            const idx = Math.max(0, entry.selectedIndex ?? 0);
            const base = entry.criteria[idx]?.score ?? 0;
            return sum + base + (entry.bonusActive ? 10 : 0);
        }

        // Fixed score (simple gain)
        const base = entry.fixedScore ?? 0;
        return sum + base + (entry.bonusActive ? 10 : 0);
    }, 0);

    const deductionScore = (state.deductions ?? []).reduce((sum, entry) => {
        if (entry.scoreType !== 'deduction') return sum;

        // If entry has fixedScore, it's a standard deduction item (not custom expense)
        if (entry.fixedScore !== undefined) {
            return sum - Math.abs(entry.fixedScore * (entry.count ?? 1));
        }

        // If entry has criteria and baseType = 'duration', it's a timer-based deduction (like game)
        if (entry.criteria && entry.criteria.length > 0 && entry.baseType === 'duration') {
            const criteria = entry.criteria[0];
            if (criteria && entry.timerSeconds !== undefined) {
                const scorePerSecond = criteria.score / criteria.time;
                return sum - Math.ceil(scorePerSecond * entry.timerSeconds);
            }
        }

        // If entry has customScore (and no fixedScore), it's a custom expense
        if (entry.customScore !== undefined) {
            return sum - Math.abs(entry.customScore);
        }

        return sum;
    }, 0);

    // Return today's net score: gains - deductions (deductions are already negative)
    return gainScore + deductionScore;
}

// Rebuild total score history with a new initial value
export async function rebuildTotalScoreHistory(initialValue: number): Promise<TotalScoreHistory> {
    const allStates = await listAllStates();

    // Start with provided initial value at epoch date
    const history: TotalScoreHistory = { '1970-01-01': initialValue };
    let cumulative = initialValue;

    if (allStates.length === 0) {
        await saveTotalScoreHistory(history);
        return history;
    }

    // Sort by date to accumulate in order
    const sorted = allStates.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    for (const { dateKey, state } of sorted) {
        const dayScore = calculateDayScore(state);
        cumulative += dayScore;
        history[dateKey] = cumulative;
    }

    await saveTotalScoreHistory(history);
    return history;
}

// Initialize total score history from existing data
export async function initializeTotalScoreHistory(): Promise<TotalScoreHistory> {
    const allStates = await listAllStates();
    if (allStates.length === 0) {
        return { '1970-01-01': 0 };
    }

    // Sort by date
    const sorted = allStates.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const history: TotalScoreHistory = { '1970-01-01': 0 };
    let cumulative = 0;

    for (const { dateKey, state } of sorted) {
        const dayScore = calculateDayScore(state);
        cumulative += dayScore;
        history[dateKey] = cumulative;
    }

    await saveTotalScoreHistory(history);
    return history;
}

// Get total score up to a specific date (yesterday)
export async function getTotalScoreUpToDate(dateKey: string): Promise<number> {
    const history = await loadTotalScoreHistory();

    // If history is empty or only has initial value, initialize it
    if (Object.keys(history).length <= 1) {
        const initialized = await initializeTotalScoreHistory();
        return getTotalFromHistory(initialized, dateKey);
    }

    return getTotalFromHistory(history, dateKey);
}

function getTotalFromHistory(history: TotalScoreHistory, dateKey: string): number {
    // Get the date before the given date
    const currentDate = new Date(dateKey);
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    // If we have exact match for yesterday, return it
    if (history[yesterdayKey] !== undefined) {
        return history[yesterdayKey];
    }

    // Otherwise, find the most recent date before yesterday
    const dates = Object.keys(history).sort();
    let lastTotal = 0;

    for (const date of dates) {
        if (date <= yesterdayKey) {
            lastTotal = history[date];
        } else {
            break;
        }
    }

    return lastTotal;
}

// Update total score history when a day changes
export async function updateTotalScoreForDate(dateKey: string, dayScore: number): Promise<void> {
    const history = await loadTotalScoreHistory();

    // Get cumulative score up to previous day
    const currentDate = new Date(dateKey);
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const previousTotal = getTotalFromHistory(history, dateKey);
    history[dateKey] = previousTotal + dayScore;

    await saveTotalScoreHistory(history);
}

// Recalculate weekly goal count by checking all items in the week
export async function recalculateWeeklyGoalCount(weekKey: string, goalId: string): Promise<number> {
    const allStates = await listAllStates();

    // Extract week start date from weekKey (format: "week-YYYY-MM-DD")
    const weekStart = weekKey.replace('week-', '');
    const weekStartDate = new Date(`${weekStart}T00:00:00`);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7); // One week = 7 days

    // Count all items with this goalId across entire week (excluding reward entries)
    let totalCount = 0;
    for (const { dateKey, state } of allStates) {
        const itemDate = new Date(`${dateKey}T00:00:00`);
        // Check if date is within this week
        if (itemDate >= weekStartDate && itemDate < weekEndDate) {
            const count = (state.gains ?? []).filter(
                g => g.weeklyGoalId === goalId && !g.weeklyRewardId
            ).length;
            totalCount += count;
        }
    }

    return totalCount;
}