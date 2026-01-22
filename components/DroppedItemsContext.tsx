"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

interface DroppedItemsContextValue {
    selectedIds: Set<string>;
    replaceAll: (ids: string[]) => void;
    weeklyGoalsVersion: number;
    notifyWeeklyGoalsUpdate: () => void;
}

const DroppedItemsContext = createContext<DroppedItemsContextValue | undefined>(undefined);

export function DroppedItemsProvider({ children }: { children: React.ReactNode }) {
    const [ids, setIds] = useState<Set<string>>(new Set());
    const [weeklyGoalsVersion, setWeeklyGoalsVersion] = useState(0);

    const replaceAll = useCallback((nextIds: string[]) => {
        setIds(prev => {
            // Check if the ids are actually different
            if (prev.size !== nextIds.length) {
                return new Set(nextIds);
            }
            for (const id of nextIds) {
                if (!prev.has(id)) {
                    return new Set(nextIds);
                }
            }
            // No change, return previous state
            return prev;
        });
    }, []);

    const notifyWeeklyGoalsUpdate = useCallback(() => setWeeklyGoalsVersion(v => v + 1), []);

    const value = useMemo(() => ({
        selectedIds: ids,
        replaceAll,
        weeklyGoalsVersion,
        notifyWeeklyGoalsUpdate
    }), [ids, replaceAll, weeklyGoalsVersion, notifyWeeklyGoalsUpdate]);

    return (
        <DroppedItemsContext.Provider value={value}>
            {children}
        </DroppedItemsContext.Provider>
    );
}

export function useDroppedItems() {
    const ctx = useContext(DroppedItemsContext);
    if (!ctx) throw new Error('useDroppedItems must be used within DroppedItemsProvider');
    return ctx;
}
