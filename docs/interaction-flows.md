# SiPhor 项目全面文档 - 第三部分

## 核心交互流程

### 1. 应用启动流程

```
浏览器加载 siphor.com
    ↓
Next.js 服务端渲染 app/layout.tsx
    ↓
客户端水合 (hydration)
    ↓
DateProvider 初始化
    ├─ 获取当前日期: new Date().toISOString().slice(0, 10)
    ├─ 启用 Page Visibility 监听
    └─ 启动 1 小时定时轮询
    ↓
DroppedItemsProvider 初始化
    ├─ selectedIds = new Set()
    ├─ weeklyGoalsState = { goals: {} }
    └─ bountyVersion = 0
    ↓
DragDropBox 挂载
    ├─ 调用 loadPersistedState(今天日期)
    ├─ 调用 loadBankState()
    ├─ 调用 loadWeeklyBounties(当前周)
    ├─ 调用 getTotalScoreUpToDate(今天日期)
    └─ 初始化各项本地状态
    ↓
ScoringDisplay 挂载
    ├─ 加载 scoring.json
    ├─ 计算周目标进度
    └─ 计算目标项最后记录日期
    ↓
HistoryHeatmap 挂载
    ├─ 调用 listAllStates() 获取全部历史
    ├─ 生成热力图数据
    └─ 渲染
    ↓
应用就绪 ✓
```

### 2. 新增积分项流程

**场景**: 用户从评分库拖放一个项目到得分区或扣分区

```
用户拖放 "focus" 项目到得分区
    ↓
DragDropBox.handleDrop() 触发
    ├─ 从 scoring.json 解析项目配置
    ├─ 生成唯一 ID (id = `${categoryKey}-${Date.now()}`)
    └─ 创建 DroppedEntry 对象
    ↓
评估项目类型
    ├─ focus (type=tiered, baseType=duration) → 启用计时器
    ├─ exercise (type=fixed) → 固定 10 分
    ├─ game (tiered, duration) → 时长扣分
    └─ expense (custom) → 需要用户输入金额
    ↓
检查周目标
    ├─ getWeeklyGoalForItem('exercise') → exercise-weekly
    ├─ 加载 loadWeeklyGoalsState(当前周)
    ├─ goals['exercise-weekly'].count += 1
    ├─ count === 5?
    │   ├─ YES → 授予 30 奖励分 (weeklyRewardBonus = 30)
    │   │         标记 rewarded = true
    │   │         保存到 weeklyGoalsState
    │   │
    │   └─ NO  → 继续等待
    │
    └─ 保存到 savePersistedState(今天日期)
    ↓
更新 UI
    ├─ 在得分区显示新项目
    ├─ 如果是计时器项，显示计时器控制
    └─ 实时计算并显示当日总分
    ↓
触发通知
    └─ DroppedItemsContext.replaceAll() 通知其他组件更新
```

### 3. 日期切换流程

**场景 1 - 自动切换** (午夜或页面恢复):

```
DateProvider 检测到日期变更
    ↓
setSelectedDate(newDate)
    ↓
所有订阅日期的组件收到通知
    ↓
DragDropBox 触发日期变化
    ├─ 清空本地 deductions 和 gains 数组
    ├─ 调用 loadPersistedState(newDate)
    ├─ 调用 getTotalScoreUpToDate(newDate)
    └─ 重新渲染得分和扣分区
    ↓
ScoringDisplay 重新计算周目标进度
    ↓
HistoryHeatmap 保持不变 (全历史视图)
    ↓
WeeklyBounty 检查是否跨周
    ├─ 当前周? → 允许编辑
    └─ 历史周? → 只读
```

**场景 2 - 用户手动点击日期** (通过 Calendar):

```
用户在热力图或日历中点击日期
    ↓
Calendar 弹出或 HistoryHeatmap 点击处理
    ↓
onDateSelect(dateKey) 回调
    ↓
setSelectedDate(dateKey)
    ↓
... (同上：DragDropBox 重新加载数据)
```

### 4. 周目标奖励流程

```
用户第 5 次添加 exercise 项
    ↓
DragDropBox 添加新 entry
    ↓
检查：getWeeklyGoalForItem('exercise') → WeeklyGoal
    ↓
加载当周进度：loadWeeklyGoalsState(weekKey)
    ├─ 当前 count = 4
    └─ rewarded = false
    ↓
更新进度：count = 5
    ↓
条件判断：count (5) >= targetCount (5)?
    ├─ YES → 进入奖励流程
    │   ├─ weeklyRewardBonus = 30
    │   ├─ 计算新积分 = 10 + 30 = 40
    │   ├─ 标记 entry.weeklyRewardBonus = 30
    │   ├─ 标记 rewarded = true
    │   ├─ 保存 entry 到数据库
    │   ├─ 保存周目标状态
    │   ├─ 更新 UI 展示奖励
    │   └─ 显示 "🎉 周目标达成！+30 奖励分"
    │
    └─ NO → 显示进度 "4/5 完成"
```

### 5. 导出数据流程

```
用户点击 "Export" 按钮
    ↓
exportAllData() 开始
    ├─ 调用 listAllStates() 获取所有日期数据
    ├─ 遍历所有 WeeklyGoalsState
    ├─ 遍历所有 WeeklyBountyState
    ├─ 获取 BankState
    └─ 组装 ExportData 对象
    ↓
生成文件
    ├─ 文件名: siphor-backup-2026-01-30-1845.json
    ├─ 内容: JSON 字符串（格式化）
    ├─ 创建 Blob
    └─ 生成下载链接
    ↓
触发浏览器下载
    ├─ 创建 <a> 元素
    ├─ 设置 href 和 download 属性
    ├─ 模拟点击
    └─ 清理资源
    ↓
下载完成
    └─ 显示 ✓ 成功提示
```

### 6. 导入数据流程

```
用户选择备份文件
    ↓
读取文件: file.text()
    ↓
解析 JSON
    ├─ 验证 version 字段存在
    ├─ 验证 exportDate 字段存在
    ├─ 验证 data 是数组
    └─ 格式错误? → 抛出异常，提示用户
    ↓
显示确认对话框
    ├─ 导出时间: 2026-01-25 18:00
    ├─ 包含日期: 45 天
    └─ 警告: 重复日期数据将被覆盖
    ↓
用户确认
    ↓
importAllData(data) 开始
    ├─ 遍历 data 中的每个日期
    ├─ 对于每个日期调用 savePersistedState(dateKey, state)
    ├─ 遍历周目标状态
    ├─ 遍历周赏金状态
    ├─ 保存虚拟银行状态
    └─ 调用 rebuildTotalScoreHistory() 重建累计分数
    ↓
重建总分历史
    ├─ 获取所有日期 (排序)
    ├─ 从第一天开始迭代
    ├─ 累加每日分数
    └─ 保存到 totalScores 表
    ↓
提示用户 "✓ 导入成功，45 天数据"
    ↓
用户手动刷新页面
    ↓
页面重新加载，显示导入的数据
```

### 7. 计时器操作流程

**场景**: 用户对 focus 项启动计时器

```
用户点击 focus 项目旁的 "Start" 按钮
    ↓
entry.timerRunning = true
    ├─ timerStartTs = Date.now()
    ├─ timerPaused = false
    └─ timerSeconds = 0 (初始)
    ↓
定时更新循环 (useEffect)
    ├─ 每 100ms 运行一次
    ├─ 计算 elapsed = (Date.now() - timerStartTs) / 1000
    ├─ 如果未暂停: timerSeconds += elapsed
    └─ 重新渲染计时显示
    ↓
用户点击 "Pause"
    ├─ timerRunning = false
    ├─ timerPaused = true
    └─ 保存当前 timerSeconds
    ↓
用户点击 "Resume"
    ├─ timerRunning = true
    ├─ timerStartTs = Date.now() (重置开始时间)
    ├─ timerPaused = false
    └─ 继续累计
    ↓
用户点击 "Stop"
    ├─ timerRunning = false
    ├─ 最终 timerSeconds 已确定
    ├─ 计算积分:
    │   └─ 根据 criteria 查表 → 5分/小时 等
    ├─ 显示 "Focus: 1h15m → +5 pts"
    └─ 保存到数据库
    ↓
从计时栏移除或标记完成
```

---

## 最佳实践

### 代码组织

#### 文件结构规范

```
siphor/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 主页 (仅作为容器)
│   └── layout.tsx                # 根布局
│
├── components/                   # React 组件
│   ├── *Context.tsx              # 上下文定义
│   ├── *.tsx                     # 功能组件
│   ├── *.module.css              # 组件样式
│   └── dropStorage.ts            # 存储业务逻辑 ⚠️ 注意：不是真正的"组件"，但放在这里便于导入
│
├── lib/                          # 工具库
│   └── scoring.ts                # 评分计算工具
│
├── data/                         # 配置数据
│   └── scoring.json              # 项目/扣分配置
│
└── docs/                         # 文档
    ├── project-overview.md       # 项目总览
    ├── architecture-and-storage.md # 架构和存储
    ├── interaction-flows.md      # 交互流程 (本文件)
    ├── scoring-structure.md      # 评分结构 (已有)
    ├── weekly-goals.md           # 周目标 (已有)
    └── import-export.md          # 导入导出 (已有)
```

#### 类型定义位置

- **接口定义**: 在使用该接口的第一个文件顶部定义，或在 lib/ 中
- **大型接口**: 在对应的模块文件中集中定义
- **共享接口**: 在 lib/ 或同一个上下文文件中

**示例**:
```typescript
// 好 ✓
// components/DragDropBox.tsx
interface DroppedEntry { ... }
export default function DragDropBox() { ... }

// 好 ✓
// lib/scoring.ts
export interface ScoringCriteria { ... }

// 避免 ✗
// 分散定义接口，导致导入混乱
```

### 状态管理最佳实践

#### 选择合适的状态存储位置

| 状态 | 存储位置 | 原因 |
|-----|---------|------|
| `selectedDate` | DateContext | 全局，所有组件需要订阅 |
| `selectedIds` | DroppedItemsContext | 跨组件通信（DragDropBox ↔ ScoringDisplay） |
| `deductions[]` | DragDropBox local | 仅该组件使用，频繁更新 |
| `weeklyGoalsState` | DroppedItemsContext | 多个组件需要读取（ScoringDisplay, WeeklyBounty） |
| 每日数据 | IndexedDB | 持久化，跨会话 |

#### 避免状态同步问题

**问题**: 两个来源修改同一个状态

```typescript
// ✗ 避免：状态分散
// DragDropBox
const [goals, setGoals] = useState<WeeklyGoalsState>(...);

// ScoringDisplay
const [goals, setGoals] = useState<WeeklyGoalsState>(...);
// 问题：两个副本可能不同步

// ✓ 正确：单一真理源
// DroppedItemsContext
const [weeklyGoalsState, setWeeklyGoalsState] = useState<WeeklyGoalsState>(...);

// DragDropBox (读写)
const { weeklyGoalsState, setWeeklyGoalsState } = useDroppedItems();

// ScoringDisplay (仅读)
const { weeklyGoalsState } = useDroppedItems();
```

#### 触发更新的通知机制

```typescript
// 当 IndexedDB 中的数据改变时，需要通知其他组件

// 方案 1: 版本号增量 (当前使用)
const notifyWeeklyGoalsUpdate = useCallback(
  () => setWeeklyGoalsVersion(v => v + 1),
  []
);

// 依赖这个版本号的 useEffect 会重新执行
useEffect(() => {
  // 重新加载数据
  loadWeeklyGoalsState(...);
}, [weeklyGoalsVersion]);

// 方案 2: 直接更新共享状态 (可选)
setWeeklyGoalsState(newState);
```

### 性能优化建议

#### 避免不必要的重渲染

```typescript
// ✗ 避免：Set 在每次渲染时创建新引用
const selectedIds = new Set([...selectedIds, newId]);

// ✓ 正确：比对后才更新
const replaceAll = useCallback((nextIds: string[]) => {
  setIds(prev => {
    if (prev.size !== nextIds.length) {
      return new Set(nextIds);
    }
    for (const id of nextIds) {
      if (!prev.has(id)) {
        return new Set(nextIds);
      }
    }
    return prev;  // 无变化，返回同一个对象
  });
}, []);
```

#### 异步操作优化

```typescript
// ✓ 好：有清理逻辑，避免内存泄漏
useEffect(() => {
  let mounted = true;
  
  loadData().then(data => {
    if (mounted) {  // 组件已卸载时不更新状态
      setData(data);
    }
  });
  
  return () => {
    mounted = false;  // 组件卸载时标记
  };
}, []);
```

#### 列表渲染优化

```typescript
// ✓ 正确：使用稳定的 key
{items.map(item => (
  <div key={item.id}>  // 使用唯一 ID，不用 index
    {item.name}
  </div>
))}
```

### 测试建议

#### 单元测试

应该测试的函数:
- `computeScore(entry)` - 积分计算逻辑
- `getWeekKey(dateStr)` - 周键生成
- `getFocusScore(seconds)` - 焦点分数
- `getDeductionScore(item, count)` - 扣分计算

```typescript
// 示例测试
test('computeScore should calculate focus points correctly', () => {
  const entry = {
    id: '1',
    name: 'focus',
    scoreType: 'gain',
    fixedScore: 5,
    bonusActive: false
  };
  expect(computeScore(entry)).toBe(5);
});
```

#### 集成测试

应该测试的流程:
- 添加项目 → 计分 → 保存
- 日期切换 → 加载不同日期数据
- 周目标达成 → 授予奖励
- 导出 → 导入 → 数据完整性

#### 手动测试清单

- [ ] 添加各种类型项目（固定、分级、自定义）
- [ ] 计时器暂停/恢复/停止
- [ ] 跨午夜日期检测
- [ ] 热力图颜色准确性
- [ ] 导出文件可以正常导入
- [ ] 虚拟银行存取操作
- [ ] 周目标完成奖励授予
- [ ] 历史周数据只读
- [ ] 浮点数计算精度

### 调试技巧

#### 检查 IndexedDB 状态

```javascript
// 在浏览器控制台运行
// 打开 DevTools → Application → IndexedDB → dragDropBox → entries
// 查看每个日期的数据
```

#### 监听日期变更

```typescript
// 在 DateContext 中添加日志
useEffect(() => {
  console.log('[DateProvider] Date changed to:', selectedDate);
}, [selectedDate]);
```

#### 验证计分逻辑

```typescript
// 在 DragDropBox 中打印积分计算过程
console.log('Entry:', entry);
console.log('Computed score:', computeScore(entry));
console.log('Total today:', totalScore);
```

---

## 重构指南

### 大规模重构时的考虑事项

#### 1. 数据迁移

如果修改了 `PersistedEntry` 或 `PersistedState` 结构:

```typescript
// 需要在 DB_VERSION 中增加版本号
const DB_VERSION = 6;  // 从 5 升级到 6

// 在 onupgradeneeded 中添加迁移逻辑
request.onupgradeneeded = (event) => {
  const db = request.result;
  const oldVersion = event.oldVersion ?? 0;
  
  if (oldVersion < 6) {
    // 执行迁移：从 v5 → v6
    const tx = event.target?.transaction;
    const store = tx?.objectStore(STORE_NAME);
    // 迭代并转换数据
  }
};
```

#### 2. 评分配置变更

如果修改了 `scoring.json`:

```json
// 添加新项目
{
  "name": "meditation",
  "score": 15,
  "type": "fixed"
}

// 修改现有项目的分值
// ⚠️ 注意：已有的数据中的积分不会自动重计算
// 需要考虑是否要运行修复脚本
```

#### 3. 上下文 API 变更

如果修改 DroppedItemsContext 或 DateContext:

```typescript
// ✓ 向后兼容方案：添加新字段
interface DroppedItemsContextValue {
  // ... 现有字段
  newFeature?: string;  // 新增
}

// ✗ 破坏性变更：删除字段
interface DroppedItemsContextValue {
  // selectedIds 被删除 → 所有使用该字段的组件都会崩溃
}
```

### 常见重构场景

#### 场景 1: 添加新评分项

```
1. 编辑 scoring.json，添加新项
2. 根据类型决定是否需要新建或修改组件
3. 如果是新的 baseType，需要修改 DragDropBox 中的类型检查
4. 更新测试用例
5. 手动测试添加该项的流程
```

#### 场景 2: 改进周目标系统

```
1. 修改 WeeklyGoal 接口定义
2. 更新 lib/scoring.ts 中的 getWeeklyGoals() 逻辑
3. 修改 DragDropBox 中的周目标判定逻辑
4. 迁移现有数据（可能需要重建）
5. 测试周目标的触发、奖励、存储
```

#### 场景 3: 拆分大组件

如果 DragDropBox 太大（1755 行），可以考虑拆分:

```
components/
├── DragDropBox.tsx           (主容器)
├── DragDropBox/
│   ├── GainsList.tsx         (加分区)
│   ├── DeductionsList.tsx    (扣分区)
│   ├── TimerPanel.tsx        (计时面板)
│   └── BankPanel.tsx         (虚拟银行)
```

**注意**: 需要保证状态管理方式一致，避免状态分散。

---

(文档第三部分完成，接下来将创建第四部分：已知问题和扩展点)
