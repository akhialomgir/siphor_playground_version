# Import/Export Functionality

## Overview

The Import/Export feature allows you to backup and restore all your daily records data. This ensures you can:
- Create periodic backups of your data
- Transfer data between devices
- Restore data after clearing browser data
- Archive historical records

## Location

The Import and Export buttons are located at the **bottom-right corner** of the application in a transparent footer overlay.

## Export Function

### What It Does
The Export function exports **all** your daily records from IndexedDB to a JSON file.

### How to Use
1. Click the **"↑ Export"** button in the bottom-right corner
2. A JSON file will automatically download to your Downloads folder
3. The filename format is: `siphor-backup-YYYY-MM-DD-HHMM.json`
   - Example: `siphor-backup-2026-01-22-1430.json`

### Export Data Structure

```json
{
  "version": "1.0",
  "exportDate": "2026-01-22T14:30:00.000Z",
  "data": [
    {
      "dateKey": "2026-01-22",
      "state": {
        "deductions": [
          {
            "id": "unique-id-1",
            "name": "bili",
            "scoreType": "deduction",
            "count": 3,
            "categoryKey": "...",
            "fixedScore": -5
          }
        ],
        "gains": [
          {
            "id": "unique-id-2",
            "name": "focus",
            "scoreType": "gain",
            "categoryKey": "targetGains",
            "timerSeconds": 3600,
            "timerRunning": false,
            "timerStartTs": null,
            "criteria": [...],
            "selectedIndex": 0,
            "bonusActive": true
          }
        ]
      }
    }
  ]
}
```

### Data Structure Explanation

#### Top Level
- `version` (string): Export format version for future compatibility
- `exportDate` (string): ISO timestamp of when the export was created
- `data` (array): Array of daily records

#### Each Daily Record
- `dateKey` (string): Date in YYYY-MM-DD format
- `state` (object): Contains deductions and gains for that day
  - `deductions` (array): All deduction items for that day
  - `gains` (array): All gain items for that day

#### Entry Fields (Deductions/Gains)
Common fields:
- `id` (string): Unique identifier for the entry
- `name` (string): Name of the item (e.g., "bili", "focus", "sleep")
- `scoreType` (string): Either "gain" or "deduction"
- `categoryKey` (string): Category identifier (e.g., "targetGains")

Type-specific fields:
- **Fixed score items:**
  - `fixedScore` (number): Fixed point value
  
- **Count-based items (like bili, sosx):**
  - `count` (number): Number of occurrences
  
- **Timer-based items (like targetGains):**
  - `timerSeconds` (number): Total accumulated seconds
  - `timerRunning` (boolean): Whether timer is currently running
  - `timerStartTs` (number|null): Timestamp when timer started
  - `timerPaused` (boolean): Whether timer is paused
  
- **Criteria-based items:**
  - `criteria` (array): Available scoring criteria
  - `selectedIndex` (number): Index of selected criterion
  - `bonusActive` (boolean): Whether bonus is active
  
- **Custom expense:**
  - `customDescription` (string): User-provided description
  - `customScore` (number): User-provided score value

## Import Function

### What It Does
The Import function reads a previously exported JSON file and restores the data to IndexedDB.

### How to Use
1. Click the **"↓ Import"** button in the bottom-right corner
2. Select a JSON backup file from your file system
3. A confirmation dialog will show:
   - Export date
   - Number of days to be imported
   - Warning that existing data will be overwritten
4. Click "OK" to confirm or "Cancel" to abort
5. After successful import, the page will automatically reload

### Important Notes

⚠️ **Data Overwrite Warning:**
- If you import a backup that contains dates already in your current database, the imported data will **overwrite** the existing data for those dates
- Other dates not in the backup file will remain unchanged

✓ **Validation:**
- The import function validates the file format before importing
- Invalid files will be rejected with an error message

✓ **Page Reload:**
- After successful import, the page automatically reloads to reflect the imported data

## Backup Strategy Recommendations

1. **Regular Backups:**
   - Export your data weekly or after significant changes
   - Keep multiple backup versions

2. **Naming Convention:**
   - The automatic filename includes date and time
   - Consider organizing backups by month in folders

3. **Storage:**
   - Store backups in multiple locations (local disk, cloud storage)
   - Consider version control for important milestones

4. **Before Major Changes:**
   - Always export before:
     - Clearing browser data
     - Testing new features
     - Manually editing data

## Error Handling

### Export Errors
- If export fails, an alert will show: "✗ Export failed. Please try again."
- Check browser console for detailed error messages

### Import Errors
- Invalid file format: "✗ Import failed. Please check the file format."
- Validation checks:
  - File must be valid JSON
  - Must contain `version` field
  - Must contain `exportDate` field
  - Must contain `data` array

## Browser Compatibility

The Import/Export feature uses:
- IndexedDB API (for data storage)
- Blob API (for file creation)
- File API (for file reading)

These are supported in all modern browsers (Chrome, Firefox, Safari, Edge).
