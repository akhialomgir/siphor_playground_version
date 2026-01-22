'use client';

import React, { useState } from 'react';
import { exportAllData, importAllData } from './dropStorage';

export default function ImportExport() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

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
        </div>
    );
}
