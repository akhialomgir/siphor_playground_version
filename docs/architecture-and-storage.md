# SiPhor 项目全面文档 - 第二部分

## 状态管理

### 1. DroppedItemsContext 上下文

**位置**: `components/DroppedItemsContext.tsx`

**用途**: 管理全局选中项目 ID 和周目标状态。

**核心接口**:
```typescript
interface DroppedItemsContextValue {
  // 当前选中的所有项目 ID
  selectedIds: Set<string>;
  
  // 批量替换选中项目 (用于日期切换时)
  replaceAll: (ids: string[]) => void;
  
  // 周目标状态版本号 (用于触发重渲染)
  weeklyGoalsVersion: number;
  notifyWeeklyGoalsUpdate: () => void;
  
  // 共享的周目标状态
  weeklyGoalsState: WeeklyGoalsState;
  setWeeklyGoalsState: React.Dispatch<React.SetStateAction<WeeklyGoalsState>>;
  
  // 周赏金版本号 (用于触发重渲染)
  bountyVersion: number;
  notifyBountyUpdate: () => void;
}
```

**状态更新机制**:
- `selectedIds` 变更: 日期切换时或手动添加/删除项目时
- `weeklyGoalsVersion` 增量: 周目标完成状态变化时
- `bountyVersion` 增量: 周赏金项目变化时

**依赖链**:
```
DragDropBox (读写 selectedIds, weeklyGoalsState)
    ↓
ScoringDisplay (读 selectedIds, weeklyGoalsState)
    ↓
WeeklyBounty (写 bountyVersion)
```

### 2. DateContext 上下文

**位置**: `components/DateContext.tsx`

**用途**: 全局日期管理，自动检测日期变更。

**核心接口**:
```typescript
interface DateContextType {
  selectedDate: string;              // YYYY-MM-DD 格式
  setSelectedDate: (date: string) => void;
}
```

**智能检测机制**:

1. **Page Visibility API**:
   - 页面从后台切回前台时立即检查
   - `document.visibilitychange` 事件触发

2. **定时轮询** (仅前台):
   - 每 3600 秒 (1 小时) 检查一次
   - 前台时启动，后台时停止
   - 极小的资源消耗

3. **自动日期刷新**:
   - 跨越午夜时重新加载数据
   - 所有组件订阅此上下文

**应用流程**:
```
应用启动
    ↓
DateProvider 初始化为今天日期
    ↓
启动轮询检查
    ↓
(用户操作/时间流逝)
    ↓
检测到日期变更 → setSelectedDate(newDate)
    ↓
所有订阅组件自动重加载该日期的数据
    ↓
DragDropBox 清空并加载新日期数据
    ↓
热力图和其他可视化自动刷新
```

---

## 存储系统

### IndexedDB 架构

**数据库**: `dragDropBox` (版本: 5)

**存储对象表** (Object Stores):

| 表名 | 键类型 | 值类型 | 版本引入 | 用途 |
|-----|--------|--------|---------|------|
| `entries` | dateKey (YYYY-MM-DD) | PersistedState | v1 | 日常积分数据 |
| `weeklyGoals` | week-YYYY-MM-DD | WeeklyGoalsState | v2 | 周目标进度 |
| `totalScores` | dateKey | number | v3 | 累计总分数 |
| `bank` | "state" | BankState | v4 | 虚拟银行 |
| `weeklyBounties` | week-YYYY-MM-DD | WeeklyBountyState | v5 | 周赏金 |

### 核心存储操作 (dropStorage.ts)

#### 日常数据操作

```typescript
// 加载指定日期的数据
loadPersistedState(dateKey: string): Promise<PersistedState>

// 保存指定日期的数据
savePersistedState(dateKey: string, state: PersistedState): Promise<void>

// 清空指定日期的数据
clearPersistedState(dateKey: string): Promise<void>

// 获取所有日期的数据
listAllStates(): Promise<Array<{dateKey: string, state: PersistedState}>>
```

#### 周目标操作

```typescript
// 加载周目标进度
loadWeeklyGoalsState(weekKey: string): Promise<WeeklyGoalsState>

// 保存周目标进度
saveWeeklyGoalsState(weekKey: string, state: WeeklyGoalsState): Promise<void>

// 更新目标完成数
incrementGoalCount(weekKey: string, goalId: string): Promise<void>

// 标记目标已奖励
markGoalAsRewarded(weekKey: string, goalId: string): Promise<void>

// 获取周目标授予的奖励分数
getBountyPointsForDate(dateKey: string): Promise<number>
```

#### 虚拟银行操作

```typescript
// 加载银行状态
loadBankState(): Promise<BankState>

// 保存银行状态
saveBankState(state: BankState): Promise<void>

// 存入活期账户
addDemandDeposit(amount: number): Promise<void>

// 取出活期账户
withdrawDemand(amount: number): Promise<void>

// 创建定期存款
addFixedDeposit(amount: number, maturityDays: number, rate: number): Promise<void>
```

#### 周赏金操作

```typescript
// 加载周赏金列表
loadWeeklyBounties(weekKey: string): Promise<WeeklyBountyState>

// 新增赏金任务
addWeeklyBounty(weekKey: string, title: string, points: number): Promise<WeeklyBountyState>

// 标记赏金完成/未完成
toggleWeeklyBounty(weekKey: string, id: string, dateKey: string): Promise<WeeklyBountyState>

// 删除赏金任务
removeWeeklyBounty(weekKey: string, id: string): Promise<WeeklyBountyState>
```

#### 总分数追踪

```typescript
// 计算累计到指定日期的总分
getTotalScoreUpToDate(dateKey: string): Promise<number>

// 更新指定日期的总分
updateTotalScoreForDate(dateKey: string, newTotal: number): Promise<void>

// 重建历史总分数（用于导入后）
rebuildTotalScoreHistory(): Promise<void>
```

#### 导入导出

```typescript
interface ExportData {
  version: string;
  exportDate: string;
  data: Array<{
    dateKey: string;
    state: PersistedState;
  }>;
}

// 导出所有数据
exportAllData(): Promise<ExportData>

// 导入数据并重建索引
importAllData(data: ExportData): Promise<void>
```

### 数据流向图

```
用户操作
    ↓
DragDropBox 更新本地状态
    ↓
调用 savePersistedState(dateKey, state)
    ↓
IndexedDB 事务写入
    ↓
可选: 更新 totalScores 表
    ↓
DroppedItemsContext.replaceAll() 通知其他组件
    ↓
其他组件读取新数据进行重渲染
```

### 日期键 (dateKey) 规范

**格式**: `YYYY-MM-DD`

**示例**: 
- `2026-01-30` (当前日期)
- `2026-01-29` (昨天)

**生成方法**:
```typescript
new Date().toISOString().slice(0, 10)
// 或
new Date(year, month, day).toISOString().slice(0, 10)
```

### 周键 (weekKey) 规范

**格式**: `week-YYYY-MM-DD`

**说明**: 周日 (Sunday) 作为周开始日期

**生成方法** (in `lib/scoring.ts`):
```typescript
export function getWeekKey(dateStr: string): string {
  const base = new Date(`${dateStr}T00:00:00`);
  const day = base.getDay();      // 0 = Sunday
  const diff = day;
  const weekStart = new Date(base);
  weekStart.setDate(base.getDate() - diff);
  const iso = formatDateLocal(weekStart);
  return `week-${iso}`;
}
```

**示例**:
- 周一 (2026-02-02) → `week-2026-02-01` (上周日)
- 周日 (2026-02-01) → `week-2026-02-01` (今天)
- 周二 (2026-02-03) → `week-2026-02-01` (上周日)

### 事务管理

所有 IndexedDB 操作都遵循以下模式:

```typescript
async function operation() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, key);
      req.onsuccess = () => resolve(result);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // 降级处理或返回默认值
    return defaultValue;
  }
}
```

**特点**:
- 自动连接池管理
- 错误自动降级 (不会导致应用崩溃)
- 异步操作，不阻塞 UI

---

## 业务逻辑

### 1. 积分计算引擎

#### 基础计分逻辑 (computeScore)

**输入**: `DroppedEntry`
**输出**: `number` (可正可负)

```typescript
function computeScore(entry: DroppedEntry): number {
  if (entry.scoreType === 'deduction') {
    // 固定扣分: bili, sosx
    if (entry.fixedScore !== undefined) {
      return -Math.abs(entry.fixedScore * (entry.count ?? 1));
    }
    
    // 时长扣分: game (按时间计算扣分)
    if (entry.baseType === 'duration' && entry.timerSeconds !== undefined) {
      const scorePerSecond = criteria.score / criteria.time;
      return -Math.ceil(scorePerSecond * entry.timerSeconds);
    }
    
    // 自定义扣分: expense
    if (entry.customScore !== undefined) {
      return -Math.abs(entry.customScore);
    }
  }

  if (entry.scoreType === 'gain') {
    // 分级加分: focus
    if (entry.criteria && entry.criteria.length > 0) {
      const idx = Math.max(0, entry.selectedIndex ?? 0);
      const base = entry.criteria[idx]?.score ?? 0;
      return base 
        + (entry.bonusActive ? 10 : 0)
        + (entry.weeklyRewardBonus ?? 0);
    }
    
    // 固定加分: exercise, paint 等
    const base = entry.fixedScore ?? 0;
    return base 
      + (entry.bonusActive ? 10 : 0)
      + (entry.weeklyRewardBonus ?? 0);
  }

  return 0;
}
```

**计分类型**:

| 类型 | 项目 | 示例 | 计算方式 |
|-----|-----|-----|---------|
| **固定** | bili, sosx, exercise | 看视频 -15 | 基数 × 数量 |
| **分级** | focus, 睡眠 | 1h专注 +5 | 根据阈值选择分值 |
| **时长** | game, focus | 30min游戏 | (分值 / 时间) × 实际秒数 |
| **自定义** | expense | 自定义消费 | 用户输入 |

#### 焦点时间聚合

```typescript
function getAccumulatedTargetGainsTime(gains: DroppedEntry[]): number {
  return gains
    .filter(g => g.categoryKey === 'targetGains')
    .reduce((acc, g) => acc + (g.timerSeconds ?? 0), 0);
}
```

用于追踪目标任务的累计时间。

#### 周目标判定逻辑

**触发时机**: DragDropBox 添加新项目时

**判定流程**:
```
新增项目
    ↓
检查是否具有 goals 配置
    ↓
找到对应的 weekly goal
    ↓
加载当周的周目标进度
    ↓
计数器 + 1
    ↓
count >= targetCount?
        ├─ YES → 授予奖励分数 (rewardPoints)
        │         标记 rewarded = true
        │         将奖励分数附加到该条目 (weeklyRewardBonus)
        │         更新该条目在数据库中
        │
        └─ NO  → 等待下次达成
```

**周目标配置示例** (scoring.json):
```json
{
  "name": "exercise",
  "goals": [
    {
      "id": "exercise-weekly",
      "type": "weekly",
      "targetCount": 5,
      "rewardPoints": 30
    }
  ]
}
```

### 2. 虚拟银行系统

#### 银行结构

```
虚拟账户
├─ 活期账户 (Demand)
│   └─ 随时存取，不计息
│
└─ 定期账户 (Fixed Deposits)
    ├─ 固定期限 (startDate → maturityDate)
    ├─ 固定利率 (rate)
    └─ 到期后可取出
```

#### 积分分离

**关键设计**: 银行操作的积分不计入"可见分"

```typescript
function computeTotals(state: PersistedState) {
  let visible = 0;   // 日常活动
  let bank = 0;      // 银行操作

  (state.gains ?? []).forEach(entry => {
    const magnitude = computeEntryMagnitude(entry);
    const signed = entry.scoreType === 'deduction' ? -magnitude : magnitude;
    
    if (entry.categoryKey === 'bank') {
      bank += signed;      // 银行存取
    } else {
      visible += signed;   // 日常积分
    }
  });

  return { visible, bank };
}
```

**在热力图中**:
- 青色深度 = visible 积分
- 分开展示 bank 积分

#### 银行操作流程

**存入活期**:
```
点击 "Bank: Deposit to Demand"
    ↓
输入金额
    ↓
创建 entry (categoryKey='bank', scoreType='gain', fixedScore=amount)
    ↓
保存到数据库
    ↓
更新虚拟银行状态: demand += amount
```

**取出活期**:
```
点击 "Bank: Withdraw from Demand"
    ↓
输入金额
    ↓
检查 bankState.demand >= amount?
    ├─ YES → 创建扣分 entry (categoryKey='bank', scoreType='deduction')
    │         更新虚拟银行: demand -= amount
    │
    └─ NO  → 提示余额不足
```

**定期投资** (未全部实现):
```
点击 "Bank: Create Fixed Deposit"
    ↓
输入本金、期限、利率
    ↓
保存到 BankState.fixed[]
    ↓
到期日期到达时
    └─ 可选自动转入活期或到期提醒
```

### 3. 热力图渲染逻辑

#### 数据范围计算

```typescript
const TOTAL_WEEKS = 12;    // 显示 12 周历史
const FUTURE_WEEKS = 2;    // 灰显 2 周未来

const totalDays = TOTAL_WEEKS * 7;       // 84 天
const futureDays = FUTURE_WEEKS * 7;     // 14 天
const pastDays = totalDays - futureDays; // 70 天
```

**时间轴**:
```
← 70 天前  |  现在  |  14 天后 →
[历史数据][当前周][未来灰显]
```

#### 颜色映射

```typescript
// 积分 → 颜色深度 (HSL 或 RGB)
function getHeatColor(score: number): string {
  if (score <= 0)     return '#0f1625';   // 无数据
  if (score < 50)     return '#1a3a2f';   // 淡青
  if (score < 100)    return '#2a4d45';   // 中青
  if (score >= 100)   return '#3d6b60';   // 深青
}
```

#### 日期遍历算法

```
找起始周日期
    ↓
for week in 0 to TOTAL_WEEKS:
    for day in 0 to 6:
        计算该日期的积分
            ↓
        如果是未来日期 → 灰显
        如果无数据 → 浅灰
        否则 → 按积分深度着色
```

---

## 工具和辅助模块

### 评分工具库 (lib/scoring.ts)

#### 焦点项工具

```typescript
// 获取焦点项的条件列表
function getFocusCriteria(): ScoringCriteria[]

// 根据累计秒数计算焦点分数
function getFocusScore(totalSeconds: number): number
```

**焦点等级表**:
| 时长 | 分数 |
|-----|------|
| 1h | 5 |
| 2h | 10 |
| 3h | 20 |
| 4h | 25 |
| 5h | 35 |

#### 周目标工具

```typescript
// 获取所有周目标定义
function getWeeklyGoals(): WeeklyGoal[]

// 按 ID 获取周目标
function getWeeklyGoalById(goalId: string): WeeklyGoal | undefined

// 按项目名称获取周目标
function getWeeklyGoalForItem(name: string): WeeklyGoal | undefined
```

#### 周键工具

```typescript
// 根据日期获取所在周的周日期
function getWeekKey(dateStr: string): string
```

#### 扣分计算

```typescript
// 根据项目配置和计数/时间计算扣分
function getDeductionScore(item: ScoringItem, countOrSeconds: number): number
```

### 日期格式化工具

```typescript
// 本地时间格式化（避免时区偏移）
function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

### 计时器工具

```typescript
// 秒数格式化为 HH:MM:SS
function formatTimer(seconds: number): string {
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
```

---

(文档第二部分完成，接下来将创建第三部分：交互流程和最佳实践)
