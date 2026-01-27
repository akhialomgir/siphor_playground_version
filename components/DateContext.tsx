'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DateContextType {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: React.ReactNode }) {
    const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

    useEffect(() => {
        // 检查日期是否改变的函数
        const checkDateChange = () => {
            const today = new Date().toISOString().slice(0, 10);
            if (today !== selectedDate) {
                setSelectedDate(today);
            }
        };

        // 1. Page Visibility API：页面从后台回到前台时立即检查
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkDateChange();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // 2. 页面在前台时，每小时检查一次（消耗极低）
        let intervalId: NodeJS.Timeout | null = null;
        const startPolling = () => {
            if (document.visibilityState === 'visible' && !intervalId) {
                intervalId = setInterval(checkDateChange, 3600000); // 3600秒（1小时）检查一次
            }
        };
        const stopPolling = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        // 初始检查
        startPolling();

        // 监听页面可见性变化来启动/停止轮询
        const handleVisibilityForPolling = () => {
            if (document.visibilityState === 'visible') {
                startPolling();
            } else {
                stopPolling();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityForPolling);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('visibilitychange', handleVisibilityForPolling);
            stopPolling();
        };
    }, [selectedDate]);

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
