"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

interface DroppedItemsContextValue {
    selectedIds: Set<string>;
    replaceAll: (ids: string[]) => void;
}

const DroppedItemsContext = createContext<DroppedItemsContextValue | undefined>(undefined);

export function DroppedItemsProvider({ children }: { children: React.ReactNode }) {
    const [ids, setIds] = useState<Set<string>>(new Set());
    const replaceAll = useCallback((nextIds: string[]) => setIds(new Set(nextIds)), []);

    const value = useMemo(() => ({
        selectedIds: ids,
        replaceAll
    }), [ids, replaceAll]);

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
