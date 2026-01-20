import scoringData from '@/data/scoring.json';

export interface ScoringCriteria {
    time: number;
    score: number;
    comparison?: string;
}

export function getFocusCriteria(): ScoringCriteria[] {
    const focusItem = scoringData.regularGains.items.find(item => item.name === 'focus');
    return (focusItem?.criteria ?? []) as ScoringCriteria[];
}

export function getFocusScore(totalSeconds: number): number {
    const criteria = getFocusCriteria();
    for (let i = criteria.length - 1; i >= 0; i--) {
        if (totalSeconds >= criteria[i].time) {
            return criteria[i].score;
        }
    }
    return 0;
}
