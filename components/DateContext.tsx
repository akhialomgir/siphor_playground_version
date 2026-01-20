'use client';

import React, { createContext, useContext, useState } from 'react';

interface DateContextType {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: React.ReactNode }) {
    const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

    return (
        <DateContext.Provider value={{ selectedDate, setSelectedDate }}>
            {children}
        </DateContext.Provider>
    );
}

export function useSelectedDate() {
    const context = useContext(DateContext);
    if (!context) {
        throw new Error('useSelectedDate must be used within DateProvider');
    }
    return context;
}
