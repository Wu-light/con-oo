# DESIGN.md - Sudoku 领域对象设计与 Svelte 接入说明

## 一、整体架构

```
┌─────────────────────────────────────────────────┐
│                  Svelte 组件层                    │
│  Board / Keyboard / Actions / Header / Modal     │
│       通过 $store 读取状态，调用 store 方法        │
└────────────────────┬────────────────────────────┘
                     │ subscribe / 方法调用
┌────────────────────▼────────────────────────────┐
│              Store Adapter 层                    │
│         src/node_modules/@sudoku/stores/grid.js  │
│   持有 Game 领域对象，暴露 Svelte writable store   │
│   grid / userGrid / canUndo / canRedo            │
│   方法: guess(set) / undo / redo / applyHint     │
└────────────────────┬────────────────────────────┘
                     │ 调用领域对象方法
┌────────────────────▼────────────────────────────┐
│               领域对象层                          │
│         src/domain/Game.js + Sudoku.js           │
│   Game: 管理历史、undo/redo、guess 入口           │
│   Sudoku: 持有 grid、guess、clone、序列化         │
└─────────────────────────────────────────────────┘
```

---

## 二、领域对象设计

### 1. Sudoku (`src/domain/Sudoku.js`)

**职责：**
- 持有当前 9x9 棋盘数据（grid）
- 提供 `guess({ row, col, value })` 接口修改某个格子
- 提供 `getGrid()` 返回防御性拷贝（避免外部直接修改内部状态）
- 提供 `clone()` 创建独立深拷贝（用于 Game 的历史快照）
- 提供 `toJSON()` / `toString()` 实现序列化与外表化

**设计要点：**
- 构造时对输入 grid 做防御性深拷贝，外部修改原数组不会影响 Sudoku 内部状态
- `getGrid()` 每次返回新的深拷贝，防止外部通过返回值直接 mutate 内部数据
- `clone()` 基于当前 grid 创建全新 Sudoku，实现完全独立

### 2. Game (`src/domain/Game.js`)

**职责：**
- 持有当前 Sudoku 实例
- 管理操作历史（基于快照的 history 数组 + historyIndex）
- 提供 `guess({ row, col, value })` 作为面向 UI 的统一操作入口
- 提供 `undo()` / `redo()` 实现撤销/重做
- 提供 `canUndo()` / `canRedo()` 查询当前状态
- 提供 `toJSON()` 实现完整游戏状态序列化（包括历史）

**历史管理策略（快照模式）：**
```
history = [snapshot0, snapshot1, snapshot2, ...]
                                    ↑
                              historyIndex
```

- 初始状态：`history = [initialSudoku.clone()]`，`historyIndex = 0`
- 每次 `guess()`：mutate 当前 Sudoku → 截断 redo 历史 → push 新快照 → index++
- `undo()`：index-- → 从 `history[index]` clone 恢复当前 Sudoku
- `redo()`：index++ → 从 `history[index]` clone 恢复当前 Sudoku
- 在 undo 之后执行新 guess 会丢弃 redo 分支（标准行为）

---

## 三、领域对象如何被 View 层消费

### A. View 层直接消费的是什么？

View 层消费的是 **Store Adapter**（`src/node_modules/@sudoku/stores/grid.js`），而不是直接消费 `Game` 或 `Sudoku`。

Store Adapter 内部持有 `Game` 领域对象，对外暴露：

| 暴露内容 | 类型 | 说明 |
|---------|------|------|
| `grid` | store (subscribe) | 原始谜题棋盘（只读） |
| `userGrid` | store + 方法 | 当前用户棋盘 + `set()` / `applyHint()` |
| `canUndo` | store (subscribe) | 是否可以撤销 |
| `canRedo` | store (subscribe) | 是否可以重做 |
| `undo()` | function | 执行撤销 |
| `redo()` | function | 执行重做 |
| `invalidCells` | derived store | 冲突单元格列表（从 userGrid 自动派生） |

### B. View 层拿到的数据是什么？

- `$grid`：原始谜题的 9x9 数字数组（用于判断哪些格子是预填的）
- `$userGrid`：用户当前填写状态的 9x9 数字数组（渲染棋盘）
- `$invalidCells`：冲突格子坐标列表（高亮错误）
- `$canUndo` / `$canRedo`：布尔值（控制按钮禁用状态）
- `$gameWon`：布尔值（从 userGrid + invalidCells 派生，判断是否完成）

### C. 用户操作如何进入领域对象？

1. **用户输入数字**：`Keyboard.svelte` → `userGrid.set($cursor, num)` → Store Adapter 调用 `currentGame.guess(...)` → 领域对象更新 → `syncFromDomain()` 重新赋值 store
2. **Undo**：`Actions.svelte` → `undo()` → `currentGame.undo()` → `syncFromDomain()`
3. **Redo**：`Actions.svelte` → `redo()` → `currentGame.redo()` → `syncFromDomain()`
4. **Hint**：`Actions.svelte` → `userGrid.applyHint($cursor)` → 求解 → `currentGame.guess(...)` → `syncFromDomain()`
5. **新游戏**：`Welcome.svelte` → `game.startNew(diff)` → `grid.generate(diff)` → `initGame()` 创建新的 Sudoku + Game

### D. 领域对象变化后，Svelte 为什么会更新？

关键机制是 **Store Adapter 的 `syncFromDomain()` 函数**：

```javascript
function syncFromDomain() {
    _userGrid.set(currentGame.getSudoku().getGrid());  // 新数组引用
    _canUndo.set(currentGame.canUndo());
    _canRedo.set(currentGame.canRedo());
}
```

每次领域对象发生变化后，`syncFromDomain()` 会：
1. 从领域对象获取最新状态（`getGrid()` 返回深拷贝 = 新数组）
2. 调用 Svelte writable store 的 `.set()` 方法赋予新值
3. Svelte 检测到 store 值变化，自动通知所有订阅者
4. 组件中的 `$userGrid` 自动更新，触发重新渲染

---

## 四、响应式机制说明

### 1. 依赖的 Svelte 响应式机制

本方案依赖以下 Svelte 3 机制：

- **`writable` store**：内部使用 `writable()` 创建响应式状态容器
- **`derived` store**：`invalidCells` 和 `gameWon` 从 `_userGrid` 派生
- **`$store` 语法**：组件中通过 `$userGrid`、`$canUndo` 等自动订阅
- **自定义 store 协议**：对外暴露的 `grid`、`userGrid`、`canUndo`、`canRedo` 都实现了 `{ subscribe }` 接口，因此可以在组件中用 `$` 前缀消费

### 2. 哪些数据是响应式暴露给 UI 的？

| 数据 | 响应式 | 说明 |
|------|--------|------|
| 当前棋盘 (`userGrid`) | 是 | writable store，UI 直接渲染 |
| 原始谜题 (`grid`) | 是 | writable store，判断预填格子 |
| 冲突格子 (`invalidCells`) | 是 | derived store，自动派生 |
| 可撤销/重做 (`canUndo/canRedo`) | 是 | writable store，控制按钮状态 |

### 3. 哪些状态留在领域对象内部？

| 数据 | 在 UI 中可见 | 说明 |
|------|-------------|------|
| Game.history（快照数组） | 否 | UI 不需要知道历史细节 |
| Game.historyIndex | 否 | 通过 canUndo/canRedo 间接暴露 |
| Sudoku 内部 grid 引用 | 否 | 通过 getGrid() 返回拷贝 |

### 4. 如果直接 mutate 内部对象，会出什么问题？

**问题：Svelte 不会检测到变化，界面不会更新。**

例如：
```javascript
// 错误做法 - 直接修改二维数组内部元素
$userGrid[row][col] = 5;
// Svelte 不会触发更新，因为 $userGrid 的引用没有变化
```

Svelte 3 的响应式机制基于**赋值检测**（assignment-based reactivity）：
- `store.set(newValue)` → 触发更新（新引用）
- `array[i] = x` → **不触发更新**（同一引用，内部变化）
- `obj.prop = x` → **不触发更新**（同一引用）

本方案通过 Store Adapter 解决了这个问题：
- 所有状态变更都通过领域对象的方法（`guess`, `undo`, `redo`）
- 每次变更后 `syncFromDomain()` 调用 `_userGrid.set(newGrid)`
- `getGrid()` 返回全新数组（深拷贝），保证引用不同
- Svelte 检测到引用变化，正确触发 UI 更新

---

## 五、相比 HW1 的改进说明

### 1. 改进了什么？

| 方面 | HW1 | HW1.1 |
|------|-----|-------|
| 领域对象位置 | 仅存在于独立模块/测试中 | 真正接入 Svelte 游戏流程 |
| UI 数据来源 | 直接操作 Svelte writable 数组 | 通过领域对象 → Store Adapter → Svelte store |
| Undo/Redo | 按钮存在但未实现 | 通过 Game 领域对象的历史管理完整实现 |
| 职责边界 | 模糊，逻辑散落在组件和 store 中 | 清晰分层：Domain → Adapter → View |
| 状态一致性 | 直接 mutate 数组可能导致不一致 | 所有变更经过领域对象，通过 syncFromDomain 保证一致 |

### 2. 为什么 HW1 的做法不足以支撑真实接入？

HW1 中的主要问题：

1. **领域对象只在测试中可用**：`Sudoku` / `Game` 类虽然存在，但 UI 没有使用它们，仍然直接操作原始的 writable store 数组
2. **Undo/Redo 未实现**：Action 按钮存在于 UI 中，但没有 `on:click` handler，没有连接到任何逻辑
3. **直接 mutate 数组**：原始代码中 `userGrid.update($g => { $g[y][x] = val; return $g; })` 虽然因为 `update` 回调返回值而能触发 Svelte 更新，但逻辑散落在组件中，没有经过领域对象

### 3. 新设计的 Trade-off

**优势：**
- 清晰的分层：Domain 层完全不依赖 Svelte，可独立测试
- 所有游戏逻辑（guess、undo、redo）集中在领域对象中
- Store Adapter 作为唯一桥接点，降低了耦合
- 快照模式的历史管理简单可靠

**代价：**
- `getGrid()` 每次返回深拷贝，有一定性能开销（对 9x9 数组可忽略）
- 每次操作都重新创建整个 grid 数组（而非局部更新），但这正是 Svelte 响应式所需要的
- 历史以完整快照存储，空间开销 O(n * 81)，对数独规模完全可接受

---

## 六、文件修改清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/domain/Sudoku.js` | 新建 | Sudoku 领域对象 |
| `src/domain/Game.js` | 新建 | Game 领域对象（含 undo/redo） |
| `src/domain/index.js` | 新建 | 统一导出 |
| `src/node_modules/@sudoku/stores/grid.js` | 重写 | Store Adapter，接入领域对象 |
| `src/components/Controls/ActionBar/Actions.svelte` | 修改 | 接入 undo/redo 按钮 |
| `DESIGN.md` | 新建 | 本文档 |

---

## 七、课堂讨论准备

1. **View 层直接消费的是谁？**
   → Store Adapter（`stores/grid.js`），它内部持有 `Game` 领域对象并暴露 Svelte store。

2. **为什么 UI 在领域对象变化后会刷新？**
   → 每次领域操作后调用 `syncFromDomain()`，通过 `_userGrid.set(newGrid)` 赋值新数组引用，触发 Svelte 的响应式更新。

3. **响应式边界在哪里？**
   → 在 Store Adapter 层。领域对象本身不具备响应式能力，Store Adapter 负责在领域操作后将状态"推"到 Svelte store 中。

4. **哪些状态对 UI 可见，哪些不可见？**
   → 可见：grid、userGrid、canUndo、canRedo、invalidCells、gameWon。不可见：Game 的 history 数组和 historyIndex。

5. **迁移到 Svelte 5 时，哪层最稳定？**
   → Domain 层（Sudoku / Game）最稳定，完全不依赖 Svelte。Store Adapter 层最可能改动，需要从 writable/derived 迁移到 runes（`$state`、`$derived`）。组件层的 `$store` 语法也需要适配。
