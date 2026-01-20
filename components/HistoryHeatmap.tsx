"use client";

import React, { useEffect, useState } from 'react';
import styles from './HistoryHeatmap.module.css';
import { listAllStates, PersistedEntry, PersistedState } from './dropStorage';

interface DayTile {
    dateKey: string;
    score: number;
    isFuture: boolean;
}

interface HistoryHeatmapProps {
    onDateSelect?: (dateKey: string) => void;
}

function computeEntryScore(entry: PersistedEntry): number {
    if (entry.criteria && entry.criteria.length > 0) {
        const idx = Math.max(0, entry.selectedIndex ?? 0);
        const base = entry.criteria[idx]?.score ?? 0;
        return base + (entry.bonusActive ? 10 : 0);
    }
    const base = entry.fixedScore ?? 0;
    return base + (entry.bonusActive ? 10 : 0);
}

function computeTotal(state: PersistedState): number {
    const gains = (state.gains ?? []).reduce((acc, e) => acc + computeEntryScore(e), 0);
    const deductions = (state.deductions ?? []).reduce((acc, e) => acc + computeEntryScore(e), 0);
    return gains - deductions;
}

const TOTAL_WEEKS = 12; // 12 weeks display
const FUTURE_WEEKS = 2; // grey extension into future

export default function HistoryHeatmap({ onDateSelect }: HistoryHeatmapProps) {
    const [tiles, setTiles] = useState<DayTile[]>([]);

    useEffect(() => {
        let mounted = true;
        const today = new Date();
        const totalDays = TOTAL_WEEKS * 7;
        const futureDays = FUTURE_WEEKS * 7;

        listAllStates().then(all => {
            if (!mounted) return;
            const scoreMap = new Map<string, number>();
            all.forEach(({ dateKey, state }) => {
                scoreMap.set(dateKey, computeTotal(state));
            });

            const days: DayTile[] = [];
            for (let i = totalDays - futureDays - 1; i >= 0; i -= 1) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const key = date.toISOString().slice(0, 10);
                days.push({ dateKey: key, score: scoreMap.get(key) ?? 0, isFuture: false });
            }
            for (let i = 1; i <= futureDays; i += 1) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const key = date.toISOString().slice(0, 10);
                days.push({ dateKey: key, score: 0, isFuture: true });
            }
            setTiles(days);
        });

        return () => {
            mounted = false;
        };
    }, []);



    const getTileClass = (tile: DayTile) => {
        if (tile.isFuture) return `${styles.tile} ${styles.tileFuture}`;
        if (tile.score >= 100) return `${styles.tile} ${styles.tileLevel3}`;
        if (tile.score >= 50) return `${styles.tile} ${styles.tileLevel2}`;
        if (tile.score >= 25) return `${styles.tile} ${styles.tileLevel1}`;
        return styles.tile;
    };

    return (
        <div className={styles.heatmap}>
            {tiles.map(tile => (
                <div
                    key={tile.dateKey}
                    className={getTileClass(tile)}
                    title={`${tile.dateKey} · ${tile.score} pts${tile.isFuture ? ' · upcoming' : ''}`}
                    onClick={() => !tile.isFuture && onDateSelect?.(tile.dateKey)}
                    role={tile.isFuture ? undefined : "button"}
                    tabIndex={tile.isFuture ? undefined : 0}
                    style={{
                        cursor: tile.isFuture ? 'default' : 'pointer',
                        transition: 'all 120ms ease'
                    }}
                />
            ))}
        </div>
    );
}
