"use client";

import React, { useEffect, useState } from 'react';
import styles from './HistoryHeatmap.module.css';
import { listAllStates, PersistedEntry, PersistedState } from './dropStorage';
import { useSelectedDate } from './DateContext';
import { useDroppedItems } from './DroppedItemsContext';
import { getDeductionScore, type ScoringItem } from '@/lib/scoring';
import scoringData from '@/data/scoring.json';

interface DayTile {
    dateKey: string;
    score: number;
    isFuture: boolean;
}

interface HistoryHeatmapProps {
    onDateSelect?: (dateKey: string) => void;
}

function computeEntryScore(entry: PersistedEntry): number {
    // For custom expense
    if (entry.scoreType === 'deduction') {
        const deducItem = scoringData.deductions.items.find(d => d.name === entry.name);
        if (deducItem?.type === 'custom') {
            return -(entry.customScore ?? 0); // Negative because it's a deduction
        }
    }

    // For count-based deductions (fixed type)
    if (entry.scoreType === 'deduction' && entry.categoryKey !== 'targetGains') {
        const deducItem = scoringData.deductions.items.find(d => d.name === entry.name);
        if (deducItem?.type === 'fixed') {
            return (deducItem.score ?? 0) * (entry.count ?? 1);
        }
        // For timer-based deductions (duration type)
        if (deducItem?.type === 'tiered' && deducItem.baseType === 'duration') {
            return getDeductionScore(deducItem as ScoringItem, entry.timerSeconds ?? 0);
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

function computeTotal(state: PersistedState): number {
    const gains = (state.gains ?? []).reduce((acc, e) => acc + computeEntryScore(e), 0);
    const deductions = (state.deductions ?? []).reduce((acc, e) => acc + computeEntryScore(e), 0);
    return gains - deductions;
}

const TOTAL_WEEKS = 12; // 12 weeks display
const FUTURE_WEEKS = 2; // grey extension into future

export default function HistoryHeatmap({ onDateSelect }: HistoryHeatmapProps) {
    const [tiles, setTiles] = useState<DayTile[]>([]);
    const { setSelectedDate } = useSelectedDate();
    const { selectedIds } = useDroppedItems();

    // Convert Set to array to avoid React warning about dependency array size changes
    const selectedIdsArray = Array.from(selectedIds);

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

            // Find the starting point (Sunday of the first week to display)
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - (totalDays - futureDays - 1));
            const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
            startDate.setDate(startDate.getDate() - startDayOfWeek); // Move to Sunday

            // Calculate total weeks to display
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + futureDays);
            const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

            // Build tiles organized by week (column-major order: Sunday to Saturday)
            const days: DayTile[] = [];
            for (let week = 0; week < totalWeeks; week++) {
                for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + week * 7 + dayOfWeek);
                    const key = date.toISOString().slice(0, 10);
                    const isFuture = date > today;
                    days.push({
                        dateKey: key,
                        score: isFuture ? 0 : (scoreMap.get(key) ?? 0),
                        isFuture
                    });
                }
            }
            setTiles(days);
        });

        return () => {
            mounted = false;
        };
    }, [selectedIdsArray.length]);



    const getTileClass = (tile: DayTile) => {
        if (tile.isFuture) return `${styles.tile} ${styles.tileFuture}`;
        if (tile.score < 0) {
            if (tile.score <= -100) return `${styles.tile} ${styles.tileNegative3}`;
            if (tile.score <= -50) return `${styles.tile} ${styles.tileNegative2}`;
            if (tile.score <= -25) return `${styles.tile} ${styles.tileNegative1}`;
            return `${styles.tile} ${styles.tileNegativeLight}`;
        }
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
                    onClick={() => {
                        if (tile.isFuture) return;
                        if (onDateSelect) {
                            onDateSelect(tile.dateKey);
                        } else {
                            setSelectedDate(tile.dateKey);
                        }
                    }}
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
