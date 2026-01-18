'use client';

import { useState, useEffect } from 'react';
import scoringData from '@/data/scoring.json';

interface Criteria {
    time: number;
    score: number;
    comparison?: string;
}

interface ScoringItem {
    id: string;
    name: string;
    score?: number;
    type: string;
    baseType?: string;
    criteria?: Criteria[];
}

interface ScoringCategory {
    scoreType: string;
    items: ScoringItem[];
}

export default function ScoringDisplay() {
    const [data, setData] = useState<Record<string, ScoringCategory> | null>(null);

    // Load scoring data on component mount
    useEffect(() => {
        setData(scoringData as unknown as Record<string, ScoringCategory>);
    }, []);

    if (!data) return <div>Loading...</div>;

    // Format seconds to human-readable time format
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
        }
        return `${minutes}m`;
    };

    // Get localized category titles
    const getCategoryTitle = (key: string): string => {
        const titles: Record<string, string> = {
            deductions: 'Deductions',
            regularGains: 'Regular Gains',
            targetGains: 'Target Gains'
        };
        return titles[key] || key;
    };

    // Generic badge component to reduce duplication
    const badgeBase: React.CSSProperties = {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500
    };
    const badgeStyles = {
        pts: { backgroundColor: '#113227', color: '#6ee7b7' },
        time: { backgroundColor: '#10233d', color: '#93c5fd' }
    } as const;

    const Badge = ({ variant, children }: { variant: 'pts' | 'time'; children: React.ReactNode }) => (
        <span style={{ ...badgeBase, ...badgeStyles[variant] }}>{children}</span>
    );

    // Right-aligned vertical stack for badges/rows
    const RightStack = ({ children }: { children: React.ReactNode }) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            {children}
        </div>
    );

    // Render criteria rows (right-aligned badges)
    const renderCriteria = (item: ScoringItem) => {
        if (!item.criteria || item.criteria.length === 0) return null;

        const rows = item.criteria.map((c, idx) => {
            let badgeText = '';
            if (item.baseType === 'duration') {
                badgeText = formatTime(c.time);
            } else if (item.baseType === 'relativeTime') {
                const time = new Date(0);
                time.setSeconds(c.time);
                const timeStr = time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                badgeText = `${c.comparison} ${timeStr}`;
            }

            return (
                <div
                    key={`${item.id}-crit-${idx}-${c.time}-${c.score}`}
                    style={{
                        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px'
                    }}
                >
                    {badgeText && <Badge variant="time">{badgeText}</Badge>}
                    <Badge variant="pts">{c.score} pts</Badge>
                </div>
            );
        });

        // If more than two rows, render two-row columns laid out horizontally
        if (rows.length > 2) {
            const columns = [] as React.ReactNode[];
            for (let i = 0; i < rows.length; i += 2) {
                const colRows = rows.slice(i, i + 2);
                columns.push(
                    <div key={`crit-col-${item.id}-${i}`} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '6px'
                    }}>
                        {colRows}
                    </div>
                );
            }

            return (
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
                    {columns}
                </div>
            );
        }

        // Otherwise, stack vertically to keep tight alignment (single column)
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                {rows}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0b1220', color: '#e5e7eb' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
                {Object.entries(data).map(([categoryKey, category]) => (
                    <div key={categoryKey} style={{
                        border: '2px solid #243046',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#0f1625',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.35)'
                    }}>
                        {/* Category header */}
                        <div style={{
                            backgroundColor: '#111827',
                            padding: '12px 16px',
                            borderBottom: '2px solid #243046',
                            fontWeight: 600,
                            fontSize: '16px',
                            color: '#e5e7eb'
                        }}>
                            {getCategoryTitle(categoryKey)}
                            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#94a3b8' }}>
                                ({category.scoreType === 'gain' ? 'Gain' : 'Deduction'})
                            </span>
                        </div>

                        {/* Item list */}
                        <div>
                            {category.items.map((item, index) => {
                                const hasCriteria = item.criteria && item.criteria.length > 0;
                                const criteriaNode = renderCriteria(item);

                                return (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => {
                                            const payload = {
                                                id: `${categoryKey}-${item.id}`,
                                                name: item.name,
                                                scoreType: category.scoreType === 'gain' ? 'gain' : 'deduction',
                                                score: item.score,
                                                criteria: item.criteria ?? [],
                                                baseType: item.baseType,
                                                categoryKey
                                            };
                                            e.dataTransfer.setData('application/json', JSON.stringify(payload));
                                        }}
                                        style={{
                                            borderBottom: index < category.items.length - 1 ? '1px solid #1f2937' : 'none',
                                            padding: '12px 16px',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto',
                                            gap: '8px'
                                        }}
                                    >
                                        {/* Left details */}
                                        <div>
                                            <div style={{ marginBottom: hasCriteria ? '8px' : '0' }}>
                                                <span style={{ fontWeight: 500, fontSize: '14px', color: '#e5e7eb' }}>
                                                    {item.name}
                                                </span>
                                                <span style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '12px' }}>
                                                    (ID: {item.id})
                                                </span>
                                            </div>
                                            {item.type && (
                                                <span style={{
                                                    display: 'inline-block',
                                                    backgroundColor: '#1f2937',
                                                    padding: '2px 6px',
                                                    borderRadius: '3px',
                                                    fontSize: '12px',
                                                    color: '#cbd5e1'
                                                }}>
                                                    {item.type}
                                                </span>
                                            )}
                                        </div>

                                        {/* Right top-aligned stack: item score + criteria rows */}
                                        <RightStack>
                                            {typeof item.score === 'number' && (
                                                <Badge variant="pts">{item.score} pts</Badge>
                                            )}
                                            {criteriaNode}
                                        </RightStack>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
