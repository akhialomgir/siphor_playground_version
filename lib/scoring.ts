import scoringData from '@/data/scoring.json';

export interface ScoringCriteria {
    time: number;
    score: number;
    comparison?: string;
}

export interface LongTermGoalConfig {
    id: string;
    type: 'weekly' | 'monthly' | 'yearly' | 'custom';
    targetCount: number;
    rewardPoints: number;
}

export interface ScoringItem {
    id: string;
    name: string;
    score?: number;
    type: 'fixed' | 'tiered' | 'conditional';
    baseType?: string;
    criteria?: ScoringCriteria[];
    goals?: LongTermGoalConfig[];
}

export interface WeeklyGoal extends LongTermGoalConfig {
    name: string;
    segmentCount?: number;
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

export function getWeeklyGoals(): WeeklyGoal[] {
    const goals: WeeklyGoal[] = [];

    // Scan all categories for items with goals config
    Object.values(scoringData).forEach(category => {
        if (Array.isArray(category.items)) {
            category.items.forEach((item: any) => {
                if (item.goals && Array.isArray(item.goals)) {
                    item.goals.forEach((goal: any) => {
                        if (goal.type === 'weekly') {
                            goals.push({
                                id: goal.id,
                                name: item.name,
                                type: goal.type,
                                targetCount: goal.targetCount,
                                rewardPoints: goal.rewardPoints,
                                segmentCount: goal.targetCount
                            });
                        }
                    });
                }
            });
        }
    });

    return goals;
}

export function getWeeklyGoalById(goalId: string): WeeklyGoal | undefined {
    return getWeeklyGoals().find(g => g.id === goalId);
}

export function getWeeklyGoalForItem(name: string): WeeklyGoal | undefined {
    const goal = getWeeklyGoals().find(g => g.name === name);
    return goal;
}

export function getWeekKey(dateStr: string): string {
    const base = new Date(`${dateStr}T00:00:00`);
    // Use Monday as the start of the week
    const day = base.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = (day + 6) % 7; // days since Monday
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() - diff);
    const iso = weekStart.toISOString().slice(0, 10);
    return `week-${iso}`;
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
