'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './DragDropBox.module.css';
import { useDroppedItems } from './DroppedItemsContext';
import { clearPersistedState, loadPersistedState, savePersistedState } from './dropStorage';
import Calendar from './Calendar';
import { useSelectedDate } from './DateContext';
import { getFocusScore, getFocusCriteria, getDeductionScore } from '@/lib/scoring';
import scoringData from '@/data/scoring.json';

interface Criteria {
    time: number;
    score: number;
    comparison?: string;
}

interface DroppedPayload {
    id: string;
    name: string;
    scoreType: 'gain' | 'deduction';
    score?: number;
    criteria?: Criteria[];
    baseType?: string;
    categoryKey?: string;
}

interface DroppedEntry {
    id: string;
    name: string;
    scoreType: 'gain' | 'deduction';
    selectedIndex?: number; // for criteria
    criteria?: Criteria[];
    baseType?: string;
    fixedScore?: number; // if no criteria
    categoryKey?: string;
    bonusActive?: boolean; // for targetGains bonus toggle
    justAdded?: boolean;
    timerSeconds?: number;
    timerRunning?: boolean;
    timerStartTs?: number | null;
    timerPaused?: boolean;
    count?: number; // for count-based deductions (bili, sosx)
}

const badgeBase: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500
};
const badgeStyles = {
    pts: { backgroundColor: '#113227', color: '#6ee7b7' }
} as const;

const PtsBadge = ({ value }: { value: number }) => (
    <span style={{ ...badgeBase, ...badgeStyles.pts }}>{value} pts</span>
);

function computeScore(entry: DroppedEntry): number {
    // For count-based deductions (fixed type)
    if (entry.scoreType === 'deduction' && entry.categoryKey !== 'targetGains') {
        const deducItem = scoringData.deductions.items.find(d => d.name === entry.name);
        if (deducItem?.type === 'fixed') {
            return (deducItem.score ?? 0) * (entry.count ?? 1);
        }
        // For timer-based deductions (duration type)
        if (deducItem?.type === 'tiered' && deducItem.baseType === 'duration') {
            return getDeductionScore(deducItem, entry.timerSeconds ?? 0);
        }
    }

    // Original logic for gains
    if (entry.criteria && entry.criteria.length > 0) {
        const idx = Math.max(0, entry.selectedIndex ?? 0);
        const base = entry.criteria[idx]?.score ?? 0;
        return base + (entry.bonusActive ? 10 : 0);
    }
    const base = entry.fixedScore ?? 0;
    return base + (entry.bonusActive ? 10 : 0);
}

function formatTimer(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getAccumulatedTargetGainsTime(gains: DroppedEntry[]): number {
    return gains
        .filter(g => g.categoryKey === 'targetGains')
        .reduce((acc, g) => acc + (g.timerSeconds ?? 0), 0);
}

// Helper functions to identify item types from JSON structure
function isCountBasedDeduction(name: string): boolean {
    const item = scoringData.deductions.items.find(d => d.name === name);
    return item?.type === 'fixed';
}

function isTimerDeduction(name: string): boolean {
    const item = scoringData.deductions.items.find(d => d.name === name);
    return item?.type === 'tiered' && item.baseType === 'duration';
}

export default function DragDropBox() {
    const [deductions, setDeductions] = useState<DroppedEntry[]>([]);
    const [gains, setGains] = useState<DroppedEntry[]>([]);
    const { selectedDate: dateKey, setSelectedDate } = useSelectedDate();
    const [hydrated, setHydrated] = useState(false);
    const [isPressingClear, setIsPressingClear] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [activeGainTimerId, setActiveGainTimerId] = useState<string | null>(null);
    const [activeDeductionTimerId, setActiveDeductionTimerId] = useState<string | null>(null);
    const [focusScore, setFocusScore] = useState<number>(0);
    const [focusTime, setFocusTime] = useState<number>(0);
    const clearTimerRef = useRef<number | null>(null);
    const { replaceAll } = useDroppedItems();

    const formatDate = (key: string) => {
        if (!key) return '';
        const [y, m, d] = key.split('-');
        return `${y}-${m}-${d}`;
    };

    const isToday = () => {
        const today = new Date().toISOString().slice(0, 10);
        return dateKey === today;
    };

    const editable = isToday();

    const handleDateSelect = (newDateKey: string) => {
        setSelectedDate(newDateKey);
        setDeductions([]);
        setGains([]);
        setHydrated(false);
    };

    const handleReturnToToday = () => {
        const today = new Date().toISOString().slice(0, 10);
        handleDateSelect(today);
    };

    useEffect(() => {
        const ids = [...deductions, ...gains].map(e => e.id);
        replaceAll(ids);
    }, [deductions, gains, replaceAll]);

    useEffect(() => {
        if (!hydrated) return;
        if (!editable) {
            setActiveGainTimerId(null);
            setActiveDeductionTimerId(null);
            setGains(prev => prev.map(g => g.categoryKey === 'targetGains'
                ? { ...g, timerRunning: false, timerStartTs: null }
                : g
            ));
            setDeductions(prev => prev.map(d => isTimerDeduction(d.name)
                ? { ...d, timerRunning: false, timerStartTs: null }
                : d
            ));
            return;
        }

        const targetGains = gains.filter(g => g.categoryKey === 'targetGains');
        const bottom = targetGains[targetGains.length - 1];
        const bottomId = bottom?.id ?? null;
        setActiveGainTimerId(bottomId);

        setGains(prev => {
            const now = Date.now();
            let changed = false;
            const next = prev.map(g => {
                if (g.categoryKey !== 'targetGains') return g;
                if (g.id === bottomId) {
                    if (g.timerRunning && !g.timerStartTs) {
                        changed = true;
                        return { ...g, timerStartTs: now };
                    }
                    if (g.timerRunning === false && g.timerStartTs) {
                        changed = true;
                        return { ...g, timerStartTs: null };
                    }
                    return g;
                }
                if (g.timerRunning || g.timerStartTs || g.timerPaused) {
                    changed = true;
                    return { ...g, timerRunning: false, timerStartTs: null, timerPaused: false };
                }
                return g;
            });
            return changed ? next : prev;
        });
    }, [gains, editable, hydrated]);

    useEffect(() => {
        if (!hydrated || !editable) return;
        const running = [...deductions].reverse().find(d => isTimerDeduction(d.name) && d.timerRunning);
        setActiveDeductionTimerId(running?.id ?? null);
    }, [deductions, editable, hydrated]);

    useEffect(() => {
        if (!editable || !activeGainTimerId) return;
        const interval = window.setInterval(() => {
            setGains(prev => {
                const now = Date.now();
                let changed = false;
                const next = prev.map(g => {
                    if (g.id !== activeGainTimerId || g.categoryKey !== 'targetGains') return g;
                    if (!g.timerRunning || !g.timerStartTs) return g;
                    const delta = Math.max(0, Math.floor((now - g.timerStartTs) / 1000));
                    if (delta <= 0) return g;
                    changed = true;
                    return {
                        ...g,
                        timerSeconds: (g.timerSeconds ?? 0) + delta,
                        timerStartTs: now
                    };
                });
                if (changed) {
                    const accum = getAccumulatedTargetGainsTime(next);
                    setFocusTime(accum);
                    setFocusScore(getFocusScore(accum));
                }
                return changed ? next : prev;
            });
        }, 1000);
        return () => window.clearInterval(interval);
    }, [activeGainTimerId, editable]);

    useEffect(() => {
        const accum = getAccumulatedTargetGainsTime(gains);
        setFocusTime(accum);
        setFocusScore(getFocusScore(accum));
    }, [gains]);

    useEffect(() => {
        if (!editable || !activeDeductionTimerId) return;

        const interval = window.setInterval(() => {
            const now = Date.now();

            setDeductions(prev => {
                let changed = false;
                const next = prev.map(d => {
                    if (d.id !== activeDeductionTimerId) return d;
                    if (!isTimerDeduction(d.name)) return d;
                    if (!d.timerRunning || !d.timerStartTs) return d;
                    const delta = Math.max(0, Math.floor((now - d.timerStartTs) / 1000));
                    if (delta <= 0) return d;
                    changed = true;
                    return {
                        ...d,
                        timerSeconds: (d.timerSeconds ?? 0) + delta,
                        timerStartTs: now
                    };
                });
                return changed ? next : prev;
            });
        }, 1000);

        return () => window.clearInterval(interval);
    }, [activeDeductionTimerId, editable]);

    useEffect(() => {
        let mounted = true;
        
        // Initialize with today's date if dateKey is empty
        let targetDateKey = dateKey;
        if (!targetDateKey) {
            targetDateKey = new Date().toISOString().slice(0, 10);
        }
        
        loadPersistedState(targetDateKey).then(state => {
            if (!mounted) return;
            const now = Date.now();
            const normalize = (list: DroppedEntry[]) => list.map(e => {
                let entry: DroppedEntry = { ...e, justAdded: false, timerPaused: e.timerPaused ?? false };
                if (entry.categoryKey === 'targetGains') {
                    const baseSeconds = entry.timerSeconds ?? 0;
                    if (entry.timerRunning && editable && entry.timerStartTs) {
                        const delta = Math.max(0, Math.floor((now - entry.timerStartTs) / 1000));
                        entry = {
                            ...entry,
                            timerSeconds: baseSeconds + delta,
                            timerStartTs: now,
                            timerRunning: true
                        };
                    } else {
                        entry = {
                            ...entry,
                            timerSeconds: baseSeconds,
                            timerStartTs: null,
                            timerRunning: false
                        };
                    }
                } else if (entry.scoreType === 'deduction' && isTimerDeduction(entry.name)) {
                    // Handle timer-based deductions
                    const baseSeconds = entry.timerSeconds ?? 0;
                    if (entry.timerRunning && editable && entry.timerStartTs) {
                        const delta = Math.max(0, Math.floor((now - entry.timerStartTs) / 1000));
                        entry = {
                            ...entry,
                            timerSeconds: baseSeconds + delta,
                            timerStartTs: now,
                            timerRunning: true
                        };
                    } else {
                        entry = {
                            ...entry,
                            timerSeconds: baseSeconds,
                            timerStartTs: null,
                            timerRunning: false
                        };
                    }
                }
                return entry;
            });
            setDeductions(normalize(state.deductions ?? []));
            setGains(normalize(state.gains ?? []));
            setHydrated(true);
        }).catch(err => {
            console.error('Failed to load persisted state:', err);
            setHydrated(true);
        });
        return () => {
            mounted = false;
        };
    }, [dateKey, editable]);

    useEffect(() => {
        if (!hydrated || !dateKey) return;
        savePersistedState(dateKey, deductions, gains);
    }, [deductions, gains, hydrated, dateKey]);

    const triggerClear = () => {
        setDeductions([]);
        setGains([]);
        if (dateKey) clearPersistedState(dateKey);
    };

    const startClearHold = () => {
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
        setIsPressingClear(true);
        clearTimerRef.current = window.setTimeout(() => {
            clearTimerRef.current = null;
            triggerClear();
            setIsPressingClear(false);
        }, 3000);
    };

    const cancelClearHold = () => {
        if (clearTimerRef.current) {
            window.clearTimeout(clearTimerRef.current);
            clearTimerRef.current = null;
        }
        setIsPressingClear(false);
    };

    const allowDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!editable) {
            return;
        }
        let data = e.dataTransfer.getData('application/json');
        if (!data) {
            // Fallback to text/plain if needed
            data = e.dataTransfer.getData('text/plain');
        }
        if (!data) return;

        try {
            const payload: DroppedPayload = JSON.parse(data);
            const baseEntry: DroppedEntry = {
                id: payload.id,
                name: payload.name,
                scoreType: payload.scoreType,
                criteria: payload.criteria,
                baseType: payload.baseType,
                fixedScore: payload.score,
                selectedIndex: 0,
                categoryKey: payload.categoryKey,
                bonusActive: false,
                timerSeconds: 0,
                timerRunning: false,
                timerStartTs: null,
                timerPaused: false,
                count: 1 // Initialize count for count-based deductions
            };

            if (baseEntry.scoreType === 'deduction') {
                setDeductions(prev => {
                    const exists = prev.some(p => p.id === baseEntry.id);
                    if (exists) return prev;

                    // For timer-based deductions (like game), auto-start the timer
                    const now = Date.now();
                    let fresh = { ...baseEntry, justAdded: true };
                    if (isTimerDeduction(baseEntry.name)) {
                        fresh = { ...fresh, timerRunning: true, timerStartTs: now };
                        setActiveDeductionTimerId(baseEntry.id);
                    }

                    setTimeout(() => {
                        setDeductions(current => current.map(p => p.id === fresh.id ? { ...p, justAdded: false } : p));
                    }, 950);
                    return [...prev, fresh];
                });
            } else {
                setGains(prev => {
                    const exists = prev.some(p => p.id === baseEntry.id);
                    if (exists) return prev;
                    const now = Date.now();
                    const fresh = { ...baseEntry, justAdded: true, timerRunning: true, timerStartTs: now };
                    const next = [...prev.map(g => g.categoryKey === 'targetGains'
                        ? { ...g, timerRunning: false, timerStartTs: null, timerPaused: false }
                        : g
                    ), fresh];
                    setTimeout(() => {
                        setGains(current => current.map(p => p.id === fresh.id ? { ...p, justAdded: false } : p));
                    }, 950);
                    return next;
                });
            }
        } catch (err) {
            // ignore malformed drops
        }
    };

    const updateCriteriaIndex = (
        list: 'deduction' | 'gain',
        id: string,
        idx: number
    ) => {
        if (list === 'deduction') {
            setDeductions(prev => prev.map(p => (p.id === id ? { ...p, selectedIndex: idx } : p)));
        } else {
            setGains(prev => prev.map(p => (p.id === id ? { ...p, selectedIndex: idx } : p)));
        }
    };

    const pauseTimer = (id: string, timerType: 'gain' | 'deduction') => {
        if (timerType === 'gain') {
            setActiveGainTimerId(prev => (prev === id ? null : prev));
            setGains(prev => prev.map(g => {
                if (g.id !== id || g.categoryKey !== 'targetGains') return g;
                if (!g.timerRunning) return g;
                const now = Date.now();
                const delta = g.timerStartTs ? Math.max(0, Math.floor((now - g.timerStartTs) / 1000)) : 0;
                return {
                    ...g,
                    timerSeconds: (g.timerSeconds ?? 0) + delta,
                    timerRunning: false,
                    timerStartTs: null,
                    timerPaused: true
                };
            }));
        } else {
            setActiveDeductionTimerId(prev => (prev === id ? null : prev));
            setDeductions(prev => prev.map(d => {
                if (d.id !== id || !isTimerDeduction(d.name)) return d;
                if (!d.timerRunning) return d;
                const now = Date.now();
                const delta = d.timerStartTs ? Math.max(0, Math.floor((now - d.timerStartTs) / 1000)) : 0;
                return {
                    ...d,
                    timerSeconds: (d.timerSeconds ?? 0) + delta,
                    timerRunning: false,
                    timerStartTs: null,
                    timerPaused: true
                };
            }));
        }
    };

    const resumeTimer = (id: string, timerType: 'gain' | 'deduction') => {
        if (timerType === 'gain') {
            setActiveGainTimerId(id);
            setGains(prev => prev.map(g => {
                if (g.categoryKey !== 'targetGains') return g;
                if (g.id === id) {
                    if (g.timerRunning) return g;
                    return {
                        ...g,
                        timerRunning: true,
                        timerStartTs: Date.now(),
                        timerPaused: false
                    };
                }
                return { ...g, timerRunning: false, timerStartTs: null, timerPaused: false };
            }));
        } else {
            setActiveDeductionTimerId(id);
            setDeductions(prev => prev.map(d => {
                if (!isTimerDeduction(d.name)) return d;
                if (d.id === id) {
                    if (d.timerRunning) return d;
                    return {
                        ...d,
                        timerRunning: true,
                        timerStartTs: Date.now(),
                        timerPaused: false
                    };
                }
                return { ...d, timerRunning: false, timerStartTs: null, timerPaused: false };
            }));
        }
    };

    const sectionStyle: React.CSSProperties = {
        border: '2px dashed #2d3b55',
        borderRadius: '8px',
        padding: '16px',
        minHeight: '360px',
        backgroundColor: '#0f1625',
        color: '#e5e7eb',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)'
    };

    const listItemStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 10px',
        borderBottom: '1px solid #1f2937'
    };

    const renderEntry = (entry: DroppedEntry, list: 'deduction' | 'gain') => {
        const score = computeScore(entry);
        const hasCriteria = !!entry.criteria && entry.criteria.length > 0;
        const isTargetGain = entry.categoryKey === 'targetGains' && entry.scoreType === 'gain';
        const isActiveTimer = isTargetGain && activeGainTimerId === entry.id;
        const timerDisplay = formatTimer(entry.timerSeconds ?? 0);

        // Check if this is a count-based deduction using JSON structure
        const isCountBased = entry.scoreType === 'deduction' && isCountBasedDeduction(entry.name);

        // Check if this is a timer-based deduction using JSON structure
        const isTimerBasedDeduction = entry.scoreType === 'deduction' && isTimerDeduction(entry.name);

        const handleCountChange = (delta: number) => {
            if (!editable) return;
            const newCount = Math.max(0, (entry.count ?? 1) + delta);

            // Delete if count becomes 0
            if (newCount === 0) {
                setDeductions(prev => prev.filter(p => p.id !== entry.id));
                return;
            }

            setDeductions(prev => prev.map(p =>
                p.id === entry.id
                    ? { ...p, count: newCount }
                    : p
            ));
        };

        return (
            <div
                key={`${list}-${entry.id}`}
                style={listItemStyle}
                className={`${styles.entry} ${entry.justAdded ? styles.entryHighlight : ''}`}
            >
                <span style={{ fontWeight: 500, fontSize: '14px', color: '#e5e7eb' }}>{entry.name}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Count buttons for count-based deductions */}
                    {isCountBased && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                onClick={() => handleCountChange(-1)}
                                disabled={!editable || (entry.count ?? 1) <= 1}
                                style={{
                                    border: '1px solid #475569',
                                    background: editable && (entry.count ?? 1) > 1 ? '#1f2937' : '#111827',
                                    color: editable && (entry.count ?? 1) > 1 ? '#94a3b8' : '#64748b',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    cursor: editable && (entry.count ?? 1) > 1 ? 'pointer' : 'not-allowed',
                                    fontSize: '12px',
                                    fontWeight: 500
                                }}
                                aria-label="Decrease count"
                            >
                                −
                            </button>
                            <span style={{
                                minWidth: '20px',
                                textAlign: 'center',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#cbd5e1'
                            }}>
                                {entry.count ?? 1}
                            </span>
                            <button
                                onClick={() => handleCountChange(1)}
                                disabled={!editable}
                                style={{
                                    border: '1px solid #475569',
                                    background: editable ? '#1f2937' : '#111827',
                                    color: editable ? '#94a3b8' : '#64748b',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    cursor: editable ? 'pointer' : 'not-allowed',
                                    fontSize: '12px',
                                    fontWeight: 500
                                }}
                                aria-label="Increase count"
                            >
                                +
                            </button>
                        </div>
                    )}

                    {/* Timer UI for timer-based deductions (game) */}
                    {isTimerBasedDeduction && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #1f2937',
                            background: '#111827',
                            color: '#94a3b8',
                            fontSize: '12px'
                        }}>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {timerDisplay}
                            </span>
                            {editable && entry.timerRunning && (
                                <button
                                    onClick={() => pauseTimer(entry.id, 'deduction')}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#e5e7eb',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        lineHeight: 1
                                    }}
                                    aria-label="Pause timer"
                                >
                                    ⏸
                                </button>
                            )}
                            {editable && !entry.timerRunning && (
                                <button
                                    onClick={() => resumeTimer(entry.id, 'deduction')}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#e5e7eb',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        lineHeight: 1
                                    }}
                                    aria-label="Resume timer"
                                >
                                    ▶
                                </button>
                            )}
                        </div>
                    )}

                    {/* Timer UI for target gains */}
                    {isTargetGain && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: isActiveTimer ? '1px solid #1f2937' : '1px solid #1f2937',
                            background: isActiveTimer ? '#0b1220' : '#111827',
                            color: isActiveTimer ? '#e5e7eb' : '#94a3b8',
                            fontSize: '12px'
                        }}>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {timerDisplay}
                            </span>
                            {isActiveTimer && editable && entry.timerRunning && (
                                <button
                                    onClick={() => pauseTimer(entry.id, 'gain')}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#e5e7eb',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        lineHeight: 1
                                    }}
                                    aria-label="Pause timer"
                                >
                                    ⏸
                                </button>
                            )}
                            {isActiveTimer && editable && !entry.timerRunning && (
                                <button
                                    onClick={() => resumeTimer(entry.id, 'gain')}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#e5e7eb',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        lineHeight: 1
                                    }}
                                    aria-label="Resume timer"
                                >
                                    ▶
                                </button>
                            )}
                        </div>
                    )}

                    {/* Bonus toggle for target gains */}
                    {isTargetGain && (
                        <button
                            onClick={() => {
                                if (!editable) return;
                                if (list === 'deduction') {
                                    setDeductions(prev => prev.map(p => p.id === entry.id ? { ...p, bonusActive: !p.bonusActive } : p));
                                } else {
                                    setGains(prev => prev.map(p => p.id === entry.id ? { ...p, bonusActive: !p.bonusActive } : p));
                                }
                            }}
                            style={{
                                border: 'none',
                                background: editable ? (entry.bonusActive ? '#2d1a1e' : '#113227') : '#1f2937',
                                color: editable ? (entry.bonusActive ? '#fca5a5' : '#6ee7b7') : '#64748b',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: editable ? 'pointer' : 'not-allowed',
                                fontWeight: 600,
                                fontSize: '12px'
                            }}
                            disabled={!editable}
                            aria-label="Toggle bonus"
                        >
                            {entry.bonusActive ? '✕' : '+10'}
                        </button>
                    )}

                    {/* Criteria select for gains with criteria */}
                    {hasCriteria && entry.scoreType === 'gain' ? (
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <select
                                value={entry.selectedIndex ?? 0}
                                onChange={(ev) => updateCriteriaIndex(list, entry.id, parseInt(ev.target.value, 10))}
                                style={{
                                    fontSize: '12px',
                                    padding: '4px 28px 4px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: editable ? '#113227' : '#1f2937',
                                    color: editable ? '#6ee7b7' : '#64748b',
                                    fontWeight: 500,
                                    cursor: editable ? 'pointer' : 'not-allowed',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    outline: 'none'
                                }}
                                disabled={!editable}
                            >
                                {entry.criteria!.map((c, i) => (
                                    <option value={i} key={`${entry.id}-opt-${i}`}>
                                        {c.score} pts
                                    </option>
                                ))}
                            </select>
                            <span style={{
                                position: 'absolute',
                                right: '8px',
                                pointerEvents: 'none',
                                color: '#e5e7eb',
                                fontSize: '12px'
                            }}>▾</span>
                        </div>
                    ) : (
                        <PtsBadge value={score} />
                    )}

                    {/* Remove button */}
                    <button
                        onClick={() => {
                            if (!editable) return;
                            if (list === 'deduction') {
                                setDeductions(prev => prev.filter(p => p.id !== entry.id));
                            } else {
                                setGains(prev => prev.filter(p => p.id !== entry.id));
                            }
                        }}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            color: editable ? '#94a3b8' : '#64748b',
                            cursor: editable ? 'pointer' : 'not-allowed',
                            fontSize: '12px',
                            padding: '2px 6px'
                        }}
                        disabled={!editable}
                        aria-label="Remove item"
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.section} style={sectionStyle} onDragOver={allowDrop} onDrop={onDrop}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div
                    className={styles.dateChip}
                    onClick={() => setShowCalendar(true)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    title="Click to select date"
                >
                    {formatDate(dateKey) || '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!editable && (
                        <span style={{
                            background: '#1f2937',
                            color: '#94a3b8',
                            border: '1px solid #334155',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px'
                        }}>🔒 locked</span>
                    )}
                    {!isToday() && (
                        <button
                            onClick={handleReturnToToday}
                            style={{
                                background: 'transparent',
                                border: '1px solid #334155',
                                color: '#94a3b8',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'all 120ms ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                e.currentTarget.style.color = '#3b82f6';
                                e.currentTarget.style.borderColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#94a3b8';
                                e.currentTarget.style.borderColor = '#334155';
                            }}
                            aria-label="Return to today"
                        >
                            current
                        </button>
                    )}
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>daily record</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '16px' }}>
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#e5e7eb' }}>Deductions</div>
                    {deductions.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>{editable ? 'Drop items here' : 'Read-only'}</div>
                    ) : (
                        deductions.map(d => renderEntry(d, 'deduction'))
                    )}
                </div>
                <div style={{ backgroundColor: '#1f2937', width: '1px' }} />
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#e5e7eb' }}>Gains</div>
                    {focusTime > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderBottom: '1px solid #1f2937',
                            backgroundColor: 'rgba(34, 197, 94, 0.08)',
                            borderRadius: '4px',
                            marginBottom: '4px'
                        }}>
                            <span style={{ fontWeight: 500, fontSize: '14px', color: '#6ee7b7' }}>focus</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontVariantNumeric: 'tabular-nums',
                                    fontSize: '12px',
                                    color: '#94a3b8'
                                }}>
                                    {formatTimer(focusTime)}
                                </span>
                                <span style={{ backgroundColor: '#113227', color: '#6ee7b7', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                                    {focusScore} pts
                                </span>
                            </div>
                        </div>
                    )}
                    {gains.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>{editable ? 'Drop items here' : 'Read-only'}</div>
                    ) : (
                        gains.map(g => renderEntry(g, 'gain'))
                    )}
                </div>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px solid #1f2937', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>Total</span>
                <PtsBadge value={
                    (gains.reduce((acc, e) => acc + computeScore(e), 0)) - (deductions.reduce((acc, e) => acc + computeScore(e), 0))
                } />
            </div>

            <button
                className={`${styles.clearButton} ${isPressingClear ? styles.clearButtonActive : ''}`}
                onPointerDown={startClearHold}
                onPointerUp={cancelClearHold}
                onPointerLeave={cancelClearHold}
                onPointerCancel={cancelClearHold}
                disabled={!editable}
                aria-label="Clear all dropped items"
            >
                Clear
            </button>

            {showCalendar && (
                <Calendar
                    selectedDate={dateKey}
                    onDateSelect={handleDateSelect}
                    onClose={() => setShowCalendar(false)}
                />
            )}
        </div>
    );
}
