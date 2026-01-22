# Weekly Goals

## Overview
Weekly goals track frequency-based targets (e.g., exercise 5 times per week) and award bonus points when the target is met. Progress is persisted per week and visible when browsing past weeks.

## Data Schema
Defined in `data/scoring.json` under `weeklyGoals`:

```json
"weeklyGoals": {
  "period": "week",
  "items": [
    {
      "id": "exercise-weekly",
      "name": "exercise",
      "targetCount": 5,
      "rewardPoints": 30,
      "segmentCount": 5,
      "description": "Exercise 5 times per week for a 30 pts bonus"
    }
  ]
}
```

Link from the corresponding scoring item (example):
```json
{
  "id": "1",
  "name": "exercise",
  "score": 10,
  "type": "fixed",
  "weeklyGoalId": "exercise-weekly"
}
```

### Required fields
- `period`: currently `"week"`
- `targetCount`: times to complete within the period
- `rewardPoints`: bonus awarded when reaching the target
- `segmentCount`: how many segments to render in the progress bar (use the same as `targetCount` to show one segment per completion)
- `weeklyGoalId` (on the linked scoring item): ties the item to the weekly goal definition

## Persistence
- Stored in IndexedDB store `weeklyGoals` (DB v2).
- Keyed by `weekKey` = `week-YYYY-MM-DD` where the date is the Monday of that week.
- Each entry stores counts and whether the reward was granted: `{ goals: { [goalId]: { count, rewarded } } }`.
- Export/import includes `weeklyGoals` alongside daily entries.

## UI Behavior
- **ScoringDisplay** and **DragDropBox** show:
  - A descriptive line under the score: `Weekly: 5x → 30 pts`
  - A five-segment progress bar across the bottom of the list item. Segments are green for completed counts, gray otherwise.
- Progress is drawn entirely from JSON (`targetCount`/`segmentCount`); no hard-coded numbers.

## Progress & Rewards
- Only the **current week** can be advanced (today is the only editable date).
- Dropping a linked item (e.g., exercise) increments the current week's count.
- When the count reaches the target and hasn't been rewarded yet, a bonus gain is added to the current day (`rewardPoints`).
- Switching to past weeks shows the stored progress without allowing edits.

## Week Boundaries
- Weeks start on **Monday**.
- Each week has its own persisted state. Moving to a new week automatically starts from that week's stored progress (empty by default) while previous weeks remain frozen.
