'use client';

import React, { useRef, useState } from 'react';
import { exportAllData, importAllData, rebuildTotalScoreHistory } from './dropStorage';

export default function ImportExport() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showInitModal, setShowInitModal] = useState(false);
    const [initValue, setInitValue] = useState('788');
    const pressTimerRef = useRef<number | null>(null);

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const allData = await exportAllData();

            // Generate filename with current date
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
            const filename = `siphor-backup-${dateStr}-${timeStr}.json`;

            // Create download link
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert('✓ Data exported successfully');
        } catch (err) {
            console.error('Export failed:', err);
            alert('✗ Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                setIsImporting(true);
                const text = await file.text();
                const data = JSON.parse(text);

                // Validate data structure
                if (!data.version || !data.exportDate || !Array.isArray(data.data)) {
                    throw new Error('Invalid data format');
                }

                // Confirm before importing
                const confirmed = confirm(
                    `Import data from ${data.exportDate}?\n` +
                    `This contains ${data.data.length} day(s) of records.\n` +
                    `Existing data for those dates will be overwritten.`
                );

                if (!confirmed) {
                    setIsImporting(false);
                    return;
                }

                await importAllData(data);
                alert(`✓ Successfully imported ${data.data.length} day(s) of data.\nPlease refresh the page to see changes.`);

                // Reload page to refresh data
                window.location.reload();
            } catch (err) {
                console.error('Import failed:', err);
                alert('✗ Import failed. Please check the file format.');
            } finally {
                setIsImporting(false);
            }
        };

        input.click();
    };

    const startSecretPress = () => {
        if (pressTimerRef.current) return;
        pressTimerRef.current = window.setTimeout(() => {
            setShowInitModal(true);
            pressTimerRef.current = null;
        }, 10000); // 10 seconds long press
    };

    const cancelSecretPress = () => {
        if (pressTimerRef.current) {
            window.clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    };

    const handleSetInitial = async () => {
        const value = parseInt(initValue, 10);
        if (Number.isNaN(value)) {
            alert('Please enter a valid number');
            return;
        }
        try {
            await rebuildTotalScoreHistory(value);
            alert(`✓ Initial value set to ${value}. Totals recalculated.\nRefresh to see updated data.`);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert('Failed to set initial value. Please try again.');
        }
    };

    const buttonBase: React.CSSProperties = {
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        fontWeight: 600,
        border: 'none',
    };

    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
        }}>
            {/* Hidden trigger to set initial total score; long press 10s */}
            <button
                onMouseDown={startSecretPress}
                onMouseUp={cancelSecretPress}
                onMouseLeave={cancelSecretPress}
                title="Long press 10s to set initial total score"
                style={{
                    width: '10px',
                    height: '10px',
                    padding: 0,
                    borderRadius: '9999px',
                    border: '1px solid #0f172a',
                    background: '#0b1220',
                    opacity: 0.18,
                    cursor: 'pointer'
                }}
            />

            <button
                onClick={handleImport}
                disabled={isImporting}
                style={{
                    ...buttonBase,
                    background: isImporting ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    opacity: isImporting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                    if (!isImporting) {
                        e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
                        e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                }}
                title="Import data from JSON file"
            >
                {isImporting ? 'Importing...' : 'Import'}
            </button>

            <button
                onClick={handleExport}
                disabled={isExporting}
                style={{
                    ...buttonBase,
                    background: isExporting ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    opacity: isExporting ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                    if (!isExporting) {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                }}
                title="Export all data to JSON file"
            >
                {isExporting ? 'Exporting...' : 'Export'}
            </button>

            {showInitModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}
                    onClick={() => setShowInitModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#0f172a',
                            border: '1px solid #1f2937',
                            borderRadius: '10px',
                            padding: '20px',
                            width: '320px',
                            color: '#e5e7eb',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.45)'
                        }}
                    >
                        <h3 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 600 }}>Set Initial Total Score</h3>
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#cbd5e1' }}>
                            Set the initial value for 1970-01-01 and rebuild cumulative totals.
                        </p>
                        <input
                            type="number"
                            value={initValue}
                            onChange={(e) => setInitValue(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                background: '#0b1220',
                                color: '#e5e7eb',
                                fontSize: '14px',
                                marginBottom: '14px'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setShowInitModal(false)}
                                style={{
                                    ...buttonBase,
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    border: '1px solid #334155',
                                    padding: '8px 12px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSetInitial}
                                style={{
                                    ...buttonBase,
                                    background: '#10b981',
                                    color: '#ffffff',
                                    padding: '8px 12px'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
