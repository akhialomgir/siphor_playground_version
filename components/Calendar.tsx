'use client';

import React, { useState, useEffect } from 'react';
import styles from './Calendar.module.css';
import { listAllStates, PersistedState, PersistedEntry } from './dropStorage';

interface CalendarProps {
    selectedDate: string; // YYYY-MM-DD
    onDateSelect: (dateKey: string) => void;
    onClose: () => void;
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

export default function Calendar({ selectedDate, onDateSelect, onClose }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    });
    const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());

    useEffect(() => {
        listAllStates().then(all => {
            const dates = new Set<string>();
            all.forEach(({ dateKey, state }) => {
                const total = computeTotal(state);
                if (total !== 0) {
                    dates.add(dateKey);
                }
            });
            setDatesWithData(dates);
        });
    }, []);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(year, month + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onDateSelect(dateStr);
        onClose();
    };

    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(currentMonth);

    const isDateSelected = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return dateStr === selectedDate;
    };

    const isDateWithData = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return datesWithData.has(dateStr);
    };

    const isFutureDate = (day: number) => {
        const dateToCheck = new Date(year, month, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dateToCheck > today;
    };

    return (
        <div className={styles.calendarOverlay} onClick={onClose}>
            <div className={styles.calendarContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.calendarHeader}>
                    <button onClick={handlePrevMonth} className={styles.navButton} aria-label="Previous month">
                        ‹
                    </button>
                    <div className={styles.monthYear}>
                        {monthName} {year}
                    </div>
                    <button onClick={handleNextMonth} className={styles.navButton} aria-label="Next month">
                        ›
                    </button>
                </div>

                <div className={styles.weekdays}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className={styles.weekday}>
                            {day}
                        </div>
                    ))}
                </div>

                <div className={styles.days}>
                    {days.map((day, index) => (
                        <div
                            key={index}
                            className={`${styles.day} ${day === null ? styles.empty : ''
                                } ${day && isDateSelected(day) ? styles.selected : ''
                                } ${day && isDateWithData(day) ? styles.hasData : ''
                                } ${day && isFutureDate(day) ? styles.future : ''
                                } ${day && !isDateWithData(day) && !isFutureDate(day) ? styles.noData : ''
                                }`}
                            onClick={() => day !== null && handleDayClick(day)}
                            role={day !== null ? 'button' : undefined}
                            tabIndex={day !== null ? 0 : undefined}
                        >
                            {day}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
