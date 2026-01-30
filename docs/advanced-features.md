# SiPhor 项目全面文档 - 第四部分

## 已知问题和技术债

### 1. 待完成的功能

#### 通用周任务计数模板 (优先级: 高)

**问题**:
- 当前每个需要计数的项目都需要单独实现逻辑
- 缺少统一的监听器和计数模板

**改进方向**:
```typescript
// 期望设计
interface CountBasedTask {
  id: string;
  name: string;
  baseScore: number;
  incrementsPerAction: number;
  weeklyTarget?: number;
  weeklyReward?: number;
}

// 自动处理计数、存储和奖励
function createCountBasedTaskHandler(task: CountBasedTask) {
  return {
    onAction: () => increment(task.id),
    getCount: () => getCount(task.id),
    checkReward: () => {...}
  };
}
```

#### 目标增益标签系统 (优先级: 中)

**问题**:
- 无法追踪目标项目的使用场景（如"编程"用于"学习"还是"工作"）
- 难以生成技能使用统计

**改进方向**:
```typescript
interface TagConfig {
  id: string;
  name: string;
  color: string;
}

// 在 entry 中添加
interface PersistedEntry {
  tags?: string[];  // 可关联多个标签
}

// 生成报告
function generateSkillStats(timeRange: DateRange): SkillUsageReport {
  // 按标签统计时间分布
}
```

#### 远程同步支持 (优先级: 低)

**问题**:
- 目前仅支持本地存储
- 跨设备同步不可行
- 数据丢失风险

**改进方向**:
```typescript
// 集成云存储 (如 Firebase, Supabase)
interface CloudSyncConfig {
  provider: 'firebase' | 'supabase';
  endpoint: string;
  authToken: string;
}

// 定期同步
async function syncToCloud() {
  const localData = await exportAllData();
  await uploadToCloud(localData);
}

// 冲突解决: 使用时间戳或向量时钟
```

#### 手机端适配 (优先级: 低)

**问题**:
- 当前 UI 为桌面优先
- 小屏幕上交互体验差
- 缺少触摸优化

**改进方向**:
```typescript
// 响应式设计增强
const isMobile = useMediaQuery('(max-width: 768px)');

// 触摸优化
const handleLongPress = (e: React.TouchEvent) => {
  // 替代右键菜单
};

// 移动友好的拖放 (考虑使用 react-beautiful-dnd)
```

### 2. 技术债清单

#### 问题 1: 浮点数精度

**症状**: 复杂计算后积分出现 0.000001 这样的精度误差

**原因**: JavaScript 浮点数运算

**解决方案**:
```typescript
// ✗ 避免
const score = criteria.score / criteria.time * entry.timerSeconds;

// ✓ 正确：使用整数运算或舍入
const score = Math.round((criteria.score / criteria.time) * entry.timerSeconds);

// ✓ 更稳健：使用 decimal 库
import Decimal from 'decimal.js';
const score = new Decimal(criteria.score)
  .dividedBy(criteria.time)
  .times(entry.timerSeconds)
  .toNumber();
```

#### 问题 2: 类型定义分散

**症状**: 接口定义在多个文件中，导入路径混乱

**改进方向**:
```typescript
// 创建统一的类型定义文件
// types/index.ts
export interface PersistedEntry { ... }
export interface DroppedEntry { ... }
export interface BankState { ... }
// ... 所有类型在这里集中定义

// 其他文件导入
import type { PersistedEntry } from '@/types';
```

#### 问题 3: dropStorage.ts 命名误导

**症状**: 该文件不是组件，但放在 components/ 文件夹中

**改进方向**:
```
components/
  └─ DragDropBox.tsx

lib/
  ├─ scoring.ts
  └─ storage.ts         // 从 components/dropStorage.ts 移到这里
```

#### 问题 4: 缺少错误边界

**症状**: 某个组件崩溃会导致整个应用白屏

**改进方向**:
```typescript
// 添加 Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo);
    // 显示降级 UI
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <DragDropBox />
</ErrorBoundary>
```

#### 问题 5: 没有单元测试

**症状**: 重构时难以确保功能完整性

**改进方向**:
```typescript
// 为核心逻辑添加测试
// __tests__/scoring.test.ts
import { computeScore, getFocusScore, getWeekKey } from '@/lib/scoring';

describe('computeScore', () => {
  it('should calculate fixed score correctly', () => {
    const entry = { scoreType: 'gain', fixedScore: 10 };
    expect(computeScore(entry)).toBe(10);
  });
});
```

---

## 扩展和优化建议

### 1. 可视化增强

#### A. 周期性报告

```typescript
// 生成周报/月报
interface PeriodicReport {
  period: 'weekly' | 'monthly';
  dateRange: [string, string];
  totalScore: number;
  topActivities: Array<{name: string; count: number}>;
  weeklyGoalsSummary: Array<{name: string; achieved: boolean}>;
  trends: 'improving' | 'stable' | 'declining';
}

function generateReport(period: 'weekly' | 'monthly'): PeriodicReport {
  // 实现报告生成逻辑
}
```

#### B. 趋势分析

```typescript
// 显示最近 4 周的平均分数趋势
function getTrendData(weeks: number = 4): TrendPoint[] {
  // 返回每周的平均分数
  return [
    { week: 'w1', avgScore: 450 },
    { week: 'w2', avgScore: 520 },
    { week: 'w3', avgScore: 480 },
    { week: 'w4', avgScore: 610 }
  ];
}

// 用图表展示 (考虑添加 recharts)
```

#### C. 对比视图

```typescript
// 对比两个时间段
function compareTimePeriods(period1: DateRange, period2: DateRange): Comparison {
  return {
    period1: aggregateData(period1),
    period2: aggregateData(period2),
    changes: {
      scoreChange: period2Total - period1Total,
      percentChange: ((period2Total - period1Total) / period1Total) * 100,
      topImprovement: '项目 A',
      topDecline: '项目 B'
    }
  };
}
```

### 2. 积分系统深化

#### A. 动态加权

```typescript
// 根据时间衰减调整权重
interface WeightedScore {
  baseScore: number;
  timeDecay: number;  // 0.8-1.0，越久越低
  finalScore: number;
}

function applyTimeDecay(entry: PersistedEntry, entryDate: string): WeightedScore {
  const daysAgo = daysBetween(entryDate, today());
  const decay = Math.exp(-daysAgo / 30);  // 30 天衰减到 1/e
  return {
    baseScore: computeScore(entry),
    timeDecay: decay,
    finalScore: computeScore(entry) * decay
  };
}
```

#### B. 连续性奖励

```typescript
// 连续完成任务的额外奖励
interface StreakBonus {
  consecutive: number;
  bonus: number;
}

function calculateStreakBonus(itemId: string, today: string): StreakBonus {
  let streak = 0;
  let date = new Date(today);
  
  while (hasEntry(itemId, formatDate(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  
  return {
    consecutive: streak,
    bonus: streak >= 7 ? 20 : streak >= 3 ? 10 : 0
  };
}
```

#### C. 能力值系统

```typescript
// 为每个目标项添加经验值和等级
interface SkillProgress {
  skillId: string;
  currentXP: number;
  level: number;
  nextLevelXP: number;
  progressPercent: number;
}

function gainXP(skillId: string, amount: number) {
  const skill = getSkill(skillId);
  skill.currentXP += amount;
  
  while (skill.currentXP >= skill.nextLevelXP) {
    skill.level++;
    skill.currentXP -= skill.nextLevelXP;
    skill.nextLevelXP = Math.round(skill.nextLevelXP * 1.1);  // 每级提高 10%
  }
}
```

### 3. 数据管理增强

#### A. 数据备份自动化

```typescript
// 定期自动备份到本地存储
function setupAutoBackup(intervalDays: number = 7) {
  let lastBackup = localStorage.getItem('lastBackupDate');
  
  if (!lastBackup || daysSince(lastBackup) >= intervalDays) {
    exportAllData().then(data => {
      const backup = {
        timestamp: new Date().toISOString(),
        data
      };
      saveToLocalStorage('auto-backup', backup);
      localStorage.setItem('lastBackupDate', new Date().toISOString());
    });
  }
}
```

#### B. 数据验证和修复

```typescript
// 检测和修复数据不一致
async function validateAndRepairData() {
  const issues: DataIssue[] = [];
  
  // 检查项 1: 缺失的总分数记录
  const allStates = await listAllStates();
  for (const {dateKey, state} of allStates) {
    const computed = computeTotal(state);
    const stored = await getTotalScore(dateKey);
    if (Math.abs(computed - stored) > 0.01) {
      issues.push({
        type: 'mismatch',
        dateKey,
        computed,
        stored
      });
    }
  }
  
  // 检查项 2: 孤立的周目标记录
  const allWeekKeys = extractUniqueWeeks(allStates);
  // ...
  
  return issues;
}
```

#### C. 数据导出格式优化

```typescript
// 导出为可读的 CSV 格式 (用于数据分析)
async function exportAsCSV(): Promise<string> {
  const lines = [
    'Date,Category,Item,Score,Time,Notes'
  ];
  
  const allStates = await listAllStates();
  for (const {dateKey, state} of allStates) {
    for (const entry of state.gains.concat(state.deductions)) {
      lines.push([
        dateKey,
        entry.categoryKey,
        entry.name,
        computeScore(entry),
        entry.timerSeconds ?? '',
        entry.customDescription ?? ''
      ].join(','));
    }
  }
  
  return lines.join('\n');
}
```

### 4. 用户体验改进

#### A. 快捷键支持

```typescript
// 常用操作的键盘快捷键
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: () => void;
}

const shortcuts: KeyboardShortcut[] = [
  { key: 'e', ctrl: true, action: handleExport },           // Ctrl+E: 导出
  { key: 'i', ctrl: true, action: handleImport },           // Ctrl+I: 导入
  { key: 'p', ctrl: true, action: toggleFocusTimer },       // Ctrl+P: 专注
  { key: 'ArrowLeft', action: goToPrevDay },                // ←: 前一天
  { key: 'ArrowRight', action: goToNextDay }                // →: 后一天
];

useEffect(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (e.key === shortcut.key &&
          e.ctrlKey === (shortcut.ctrl ?? false) &&
          e.shiftKey === (shortcut.shift ?? false)) {
        shortcut.action();
        e.preventDefault();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
}, []);
```

#### B. 撤销/重做支持

```typescript
// 维护操作历史栈
interface Action {
  type: string;
  data: any;
  timestamp: number;
}

const history: Action[] = [];
let historyIndex = -1;

function performAction(action: Action) {
  history.splice(historyIndex + 1);  // 清除重做历史
  history.push(action);
  historyIndex++;
  applyAction(action);
}

function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    rebuildState(history.slice(0, historyIndex + 1));
  }
}

function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    applyAction(history[historyIndex]);
  }
}
```

#### C. 主题/暗黑模式

```typescript
// 虽然已经是暗色主题，但可以增加浅色主题选项
interface ThemeConfig {
  name: 'dark' | 'light';
  colors: {
    bg: string;
    text: string;
    accent: string;
    ...
  };
}

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    // 应用主题变量
  }, [theme]);
  
  return { theme, setTheme };
}
```

---

## 总结

### 项目现状

#### ✅ 核心功能完整

SiPhor 已实现了一个完整的个人生产力管理系统，包括:
- 灵活的积分录入和计分系统
- 完整的数据持久化和备份
- 周期性目标管理和奖励
- 长期数据可视化和追踪

#### 🚀 架构设计合理

- 使用 IndexedDB 实现高效的本地存储
- 基于 React Context 的全局状态管理
- 组件化设计，易于维护和扩展
- 清晰的数据流向和依赖关系

#### 📚 代码组织良好

- 工具函数集中在 `lib/` 中
- 配置数据分离到 `data/` 中
- 组件职责明确，单一责任原则

### 未来发展方向

#### 短期 (1-2 个月)

1. ✅ 完善周任务计数通用模板
2. ✅ 添加基础单元测试
3. ✅ 优化浮点数精度处理
4. ✅ 改进错误处理和降级方案

#### 中期 (2-6 个月)

1. 🔧 实现远程同步功能
2. 🔧 添加周期性报告和趋势分析
3. 🔧 目标增益标签系统
4. 🔧 能力值系统和连续性奖励

#### 长期 (6+ 个月)

1. 📱 完整的移动应用版本
2. 📱 跨平台数据同步
3. 📱 社区分享和对标功能
4. 🤖 基于 AI 的个性化建议

### 重构优先级

如果需要重构，建议按以下顺序:

1. **高优先级** (阻塞其他功能):
   - 完成周任务计数模板
   - 修复浮点数精度问题

2. **中优先级** (改进代码质量):
   - 添加单元测试框架
   - 统一类型定义位置
   - 添加 Error Boundary

3. **低优先级** (优化和新功能):
   - 目标标签系统
   - 数据分析和报告
   - 主题和快捷键

### 文件导航速查表

| 需要修改 | 位置 | 文件 |
|---------|------|------|
| 评分项配置 | 数据 | `data/scoring.json` |
| 积分计算逻辑 | 工具 | `lib/scoring.ts` |
| 每日数据持久化 | 存储 | `components/dropStorage.ts` |
| 日期管理 | 上下文 | `components/DateContext.tsx` |
| 状态同步 | 上下文 | `components/DroppedItemsContext.tsx` |
| 日常数据录入 | 组件 | `components/DragDropBox.tsx` |
| 评分规则展示 | 组件 | `components/ScoringDisplay.tsx` |
| 历史数据可视化 | 组件 | `components/HistoryHeatmap.tsx` |
| 周目标管理 | 组件 | `components/WeeklyBounty.tsx` |
| 数据导入导出 | 组件 | `components/ImportExport.tsx` |

### 重要约定

**总是记住**:

1. 🔑 **单一真理源**: 共享状态只在一个地方维护（通常是 Context）
2. 📅 **日期格式一致**: 全部使用 `YYYY-MM-DD` 格式
3. 💾 **及时持久化**: 用户操作后立即保存到 IndexedDB
4. 🔄 **通知其他组件**: 数据变化时通过 Context 通知订阅者
5. 🧪 **测试关键路径**: 重构时重点测试数据导入导出、日期切换、周目标流程

---

**文档完成日期**: 2026年1月30日
**文档版本**: 1.0
**维护者**: 项目团队

---

## 快速参考

### 常见操作速查

```bash
# 开发服务器
npm run dev

# 构建产物
npm run build

# 生产环境运行
npm start

# 代码检查
npm run lint
```

### 关键代码片段

**获取今天日期**:
```typescript
const today = new Date().toISOString().slice(0, 10);
```

**获取当前周键**:
```typescript
import { getWeekKey } from '@/lib/scoring';
const weekKey = getWeekKey(today);
```

**加载今天数据**:
```typescript
import { loadPersistedState } from '@/components/dropStorage';
const state = await loadPersistedState(today);
```

**计算积分**:
```typescript
import { computeScore } from '@/components/DragDropBox';
const points = computeScore(entry);
```

**列出所有历史**:
```typescript
import { listAllStates } from '@/components/dropStorage';
const allData = await listAllStates();
```

---

**版本说明**:

- 本文档基于 SiPhor v0.1.0
- 涵盖所有已实现功能
- 包含扩展和重构建议
- 定期更新以反映项目进展

---

END OF DOCUMENTATION
