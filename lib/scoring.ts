import scoringData from '@/data/scoring.json';

export interface ScoringCriteria {
    time: number;
    score: number;
    comparison?: string;
}

export interface ScoringItem {
    id: string;
    name: string;
    score?: number;
    type: 'fixed' | 'tiered' | 'conditional';
    baseType?: string;
    criteria?: ScoringCriteria[];
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

export function getDeductionScore(item: any, countOrSeconds: number): number {
    if (item.type === 'fixed') {
        return (item.score ?? 0) * countOrSeconds;
    }
    if (item.type === 'tiered' && item.baseType === 'duration') {
        const criteria = item.criteria?.[0];
        if (!criteria) return 0;
        const scorePerSecond = criteria.score / criteria.time;
        return Math.ceil(scorePerSecond * countOrSeconds);
    }
    return 0;
}
