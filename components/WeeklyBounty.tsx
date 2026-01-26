"use client";

import { useEffect, useMemo, useState } from 'react';
import { getWeekKey } from '@/lib/scoring';
import { useSelectedDate } from './DateContext';
import { useDroppedItems } from './DroppedItemsContext';
import { addWeeklyBounty, loadWeeklyBounties, toggleWeeklyBounty, type WeeklyBountyItem } from './dropStorage';

interface EditableDraft {
    title: string;
    points: string;
}

export default function WeeklyBounty() {
    const { selectedDate } = useSelectedDate();
    const { notifyBountyUpdate } = useDroppedItems();
    const [items, setItems] = useState<WeeklyBountyItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [draft, setDraft] = useState<EditableDraft>({ title: '', points: '' });

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const selectedWeekKey = useMemo(() => getWeekKey(selectedDate), [selectedDate]);
    const currentWeekKey = useMemo(() => getWeekKey(today), [today]);
    const isCurrentWeek = selectedWeekKey === currentWeekKey;

    useEffect(() => {
        let active = true;
        setLoading(true);
        loadWeeklyBounties(selectedWeekKey)
            .then(state => {
                if (!active) return;
                setItems(state.items ?? []);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [selectedWeekKey]);

    const handleToggle = async (id: string) => {
        if (!isCurrentWeek) return;
        const updated = await toggleWeeklyBounty(selectedWeekKey, id, selectedDate);
        setItems(updated.items);
        notifyBountyUpdate();
    };

    const handleAdd = async () => {
        if (!isCurrentWeek) return;
        const points = Number(draft.points);
        const updated = await addWeeklyBounty(selectedWeekKey, draft.title, points);
        setItems(updated.items);
        setDraft({ title: '', points: '' });
    };

    const highlightStyle: React.CSSProperties = {
        backgroundColor: 'rgba(110, 231, 183, 0.12)',
        outline: '1px solid rgba(110, 231, 183, 0.28)',
        borderRadius: '8px'
    };

    return (
        <div style={{ border: '2px solid #243046', borderRadius: '10px', backgroundColor: '#0f1625', overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.35)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f2937', backgroundColor: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 700, color: '#e5e7eb', fontSize: '15px' }}>Weekly Bounties</div>
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>Current week only. Check to claim once.</div>
                </div>
                {!isCurrentWeek && (
                    <span style={{ color: '#94a3b8', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px' }}>Locked</span>
                )}
            </div>

            <div style={{ padding: '12px 14px', display: 'grid', gap: '10px' }}>
                {loading ? (
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>Loading…</div>
                ) : items.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>No bounties yet. Add one below.</div>
                ) : (
                    items.map(item => {
                        const completed = !!item.completedDate;
                        return (
                            <div
                                key={item.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'auto 1fr auto',
                                    gap: '10px',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    border: '1px solid #1f2937',
                                    borderRadius: '8px',
                                    ...(completed ? highlightStyle : {})
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={completed}
                                    onChange={() => handleToggle(item.id)}
                                    disabled={!isCurrentWeek}
                                    style={{ width: '16px', height: '16px' }}
                                    aria-label="Complete bounty"
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '14px' }}>{item.title}</span>
                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                        {completed ? `Completed on ${item.completedDate}` : 'Incomplete'}
                                    </span>
                                </div>
                                <span style={{ backgroundColor: '#113227', color: '#6ee7b7', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                                    {item.points} pts
                                </span>
                            </div>
                        );
                    })
                )}

                <div style={{ borderTop: '1px solid #1f2937', paddingTop: '10px', display: 'grid', gap: '8px' }}>
                    <div style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '13px' }}>Add bounty</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Title"
                            value={draft.title}
                            onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
                            disabled={!isCurrentWeek}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#0b1220',
                                color: '#e5e7eb',
                                fontSize: '13px'
                            }}
                        />
                        <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            placeholder="Points"
                            value={draft.points}
                            onChange={(e) => setDraft(prev => ({ ...prev, points: e.target.value.replace(/[^0-9.]/g, '') }))}
                            disabled={!isCurrentWeek}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#0b1220',
                                color: '#e5e7eb',
                                fontSize: '13px',
                                textAlign: 'right'
                            }}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!isCurrentWeek || !draft.title.trim() || Number(draft.points) <= 0}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #334155',
                                backgroundColor: (!isCurrentWeek || !draft.title.trim() || Number(draft.points) <= 0) ? '#111827' : '#113227',
                                color: (!isCurrentWeek || !draft.title.trim() || Number(draft.points) <= 0) ? '#475569' : '#6ee7b7',
                                fontWeight: 700,
                                fontSize: '12px',
                                cursor: (!isCurrentWeek || !draft.title.trim() || Number(draft.points) <= 0) ? 'not-allowed' : 'pointer'
                            }}
                            aria-label="Add bounty"
                        >
                            Add
                        </button>
                    </div>
                    {!isCurrentWeek && (
                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>Editing is limited to the current week.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
