'use client';

import React, { useState } from 'react';

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
    if (entry.criteria && entry.criteria.length > 0) {
        const idx = Math.max(0, entry.selectedIndex ?? 0);
        const base = entry.criteria[idx]?.score ?? 0;
        return base + (entry.bonusActive ? 10 : 0);
    }
    const base = entry.fixedScore ?? 0;
    return base + (entry.bonusActive ? 10 : 0);
}

export default function DragDropBox() {
    const [deductions, setDeductions] = useState<DroppedEntry[]>([]);
    const [gains, setGains] = useState<DroppedEntry[]>([]);

    const allowDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        let data = e.dataTransfer.getData('application/json');
        if (!data) {
            // Fallback to text/plain if needed
            data = e.dataTransfer.getData('text/plain');
        }
        if (!data) return;

        try {
            const payload: DroppedPayload = JSON.parse(data);
            const entry: DroppedEntry = {
                id: payload.id,
                name: payload.name,
                scoreType: payload.scoreType,
                criteria: payload.criteria,
                baseType: payload.baseType,
                fixedScore: payload.score,
                selectedIndex: 0,
                categoryKey: payload.categoryKey,
                bonusActive: false
            };

            if (entry.scoreType === 'deduction') {
                setDeductions(prev => {
                    const exists = prev.some(p => p.id === entry.id);
                    return exists ? prev : [...prev, entry];
                });
            } else {
                setGains(prev => {
                    const exists = prev.some(p => p.id === entry.id);
                    return exists ? prev : [...prev, entry];
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
        padding: '8px 0',
        borderBottom: '1px solid #1f2937'
    };

    const renderEntry = (entry: DroppedEntry, list: 'deduction' | 'gain') => {
        const score = computeScore(entry);
        const hasCriteria = !!entry.criteria && entry.criteria.length > 0;
        const isTargetGain = entry.categoryKey === 'targetGains' && entry.scoreType === 'gain';

        return (
            <div key={`${list}-${entry.id}`} style={listItemStyle}>
                <span style={{ fontWeight: 500, fontSize: '14px', color: '#e5e7eb' }}>{entry.name}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isTargetGain && (
                        <button
                            onClick={() => {
                                if (list === 'deduction') {
                                    setDeductions(prev => prev.map(p => p.id === entry.id ? { ...p, bonusActive: !p.bonusActive } : p));
                                } else {
                                    setGains(prev => prev.map(p => p.id === entry.id ? { ...p, bonusActive: !p.bonusActive } : p));
                                }
                            }}
                            style={{
                                border: 'none',
                                background: entry.bonusActive ? '#2d1a1e' : '#113227',
                                color: entry.bonusActive ? '#fca5a5' : '#6ee7b7',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '12px'
                            }}
                            aria-label="Toggle bonus"
                        >
                            {entry.bonusActive ? '✕' : '+10'}
                        </button>
                    )}
                    {hasCriteria ? (
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <select
                                value={entry.selectedIndex ?? 0}
                                onChange={(ev) => updateCriteriaIndex(list, entry.id, parseInt(ev.target.value, 10))}
                                style={{
                                    fontSize: '12px',
                                    padding: '4px 28px 4px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#113227',
                                    color: '#6ee7b7',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                    outline: 'none'
                                }}
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
                    <button
                        onClick={() => {
                            if (list === 'deduction') {
                                setDeductions(prev => prev.filter(p => p.id !== entry.id));
                            } else {
                                setGains(prev => prev.filter(p => p.id !== entry.id));
                            }
                        }}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '2px 6px'
                        }}
                        aria-label="Remove item"
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={sectionStyle} onDragOver={allowDrop} onDrop={onDrop}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '16px' }}>
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#e5e7eb' }}>Deductions</div>
                    {deductions.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Drop items here</div>
                    ) : (
                        deductions.map(d => renderEntry(d, 'deduction'))
                    )}
                </div>
                <div style={{ backgroundColor: '#1f2937', width: '1px' }} />
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#e5e7eb' }}>Gains</div>
                    {gains.length === 0 ? (
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Drop items here</div>
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
        </div>
    );
}
