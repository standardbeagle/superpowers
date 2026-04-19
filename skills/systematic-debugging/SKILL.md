---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

## Overview

亂修耗時，且生新bug。速補掩真疾。

**核心原則：** 修前必尋根因。治症非修，乃敗。

**違其字即違其意。**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

未完 Phase 1，不得提修。

## When to Use

用於任何技術問題：
- 測試失敗
- 生產 bug
- 意外行為
- 效能問題
- 構建失敗
- 整合問題

**尤當於：**
- 時間壓力下（急則誘猜）
- 「一修即可」之誘
- 已試多修
- 前修不效
- 疑未全明

**不可跳過即使：**
- 問題似簡（簡 bug 亦有根因）
- 時急（速則必返工）
- 經理欲立修（系統化比亂修快）

## The Four Phases

每階段必完方可進次。

### Phase 1: Root Cause Investigation

**修前：**

1. **細讀錯誤訊息**
   - 勿略錯或警
   - 常含解答
   - 完讀 stack trace
   - 記行號、路徑、錯碼

2. **穩定復現**
   - 可靠觸發否？
   - 確切步驟？
   - 每次皆發？
   - 不可復 → 增採證，勿猜

3. **察近變更**
   - 何變致此？
   - Git diff，近 commits
   - 新依賴、config 變
   - 環境差異

4. **多組件系統採證**

   **當系統多層（CI → build → signing、API → service → database）：**

   **修前，加診斷 instrumentation：**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **例（多層）：**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **此揭：** 何層斷（secrets → workflow ✓、workflow → build ✗）

5. **追資料流**

   **當錯深藏 call stack：**

   詳見 `root-cause-tracing.md`（本目錄，完整回溯技術）。

   **簡版：**
   - 惡值源何處？
   - 何者以惡值呼之？
   - 續追至源
   - 修於源，不於症

### Phase 2: Pattern Analysis

**修前尋式：**

1. **尋可用範例**
   - 同倉中近似可用碼
   - 何處能作而此處斷？

2. **比對參考**
   - 若實作 pattern，完讀參考實作
   - 勿略——逐行讀
   - 用前全明其式

3. **辨差異**
   - 可用與斷者何別？
   - 列所有差，無論小
   - 勿假「此無關」

4. **明依賴**
   - 此需他何組件？
   - 需何設定、config、環境？
   - 作何假設？

### Phase 3: Hypothesis and Testing

**科學法：**

1. **成單一假說**
   - 清晰言：「吾以 X 為根因，因 Y」
   - 書之
   - 具體，勿模糊

2. **最小測試**
   - 作最小變以驗假說
   - 一變量一次
   - 勿同時修多物

3. **驗後再進**
   - 作矣？ Yes → Phase 4
   - 未作？ 立新假說
   - 勿疊修於上

4. **不知之時**
   - 言「吾不明 X」
   - 勿佯知
   - 求助
   - 再研

### Phase 4: Implementation

**修根因，非症：**

1. **立失敗測例**
   - 最簡可復
   - 若可則自動化
   - 無框架則寫一次性 script
   - 修前必有
   - 用 `superpowers:test-driven-development` skill 寫真失敗測

2. **單修實作**
   - 對辨之根因
   - 一變一次
   - 無「順便改」
   - 無捆綁重構

3. **驗修**
   - 測今過否？
   - 他測未壞否？
   - 疾真解否？

4. **若修不效**
   - 止
   - 計：試幾修矣？
   - 若 < 3：返 Phase 1，以新訊重析
   - **若 ≥ 3：止，質問架構（下第 5 條）**
   - 勿試 Fix #4 前不論架構

5. **三修皆敗：質問架構**

   **示架構問題之兆：**
   - 每修揭新共享 state/coupling/問題於他處
   - 修需「大重構」方可
   - 每修於他處生新症

   **止，質根本：**
   - 此式根本妥否？
   - 吾等「惰而續之」否？
   - 當重構架構、非續治症否？

   **與 your human partner 論，方可再試**

   此非假說敗，乃架構誤。

## Red Flags - STOP and Follow Process

若察己念：
- 「暫修，稍後察」
- 「試改 X 視結果」
- 「多改並行，跑測試」
- 「跳過測，吾手驗」
- 「蓋是 X，修之」
- 「未全明但或可」
- 「pattern 言 X 但吾變用」
- 「此乃主要諸題：[列修而未察]」
- 提解於追資料流前
- **「再一修」（已試 2+）**
- **每修揭新題於他處**

**皆意：止。返 Phase 1。**

**若 3+ 修敗：** 質架構（見 Phase 4.5）

## your human partner's Signals You're Doing It Wrong

**察此等改向：**
- "Is that not happening?" — 汝假設未驗
- "Will it show us...?" — 汝當加採證
- "Stop guessing" — 汝提修而未明
- "Ultrathink this" — 質根本，非治症
- "We're stuck?"（怒）— 汝法不效

**見此：止。返 Phase 1。**

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| 「疾簡，無需流程」 | 簡疾亦有根因。流程於簡 bug 亦速。 |
| 「急，無暇流程」 | 系統化比亂修快。 |
| 「先試此，後察」 | 首修定式。始即正。 |
| 「確修效後再寫測」 | 未測之修不定。測先證之。 |
| 「多修並行省時」 | 無法辨何效。生新 bug。 |
| 「參考過長，吾變其式」 | 半解必生 bug。完讀之。 |
| 「吾見題，修之」 | 見症 ≠ 明根因。 |
| 「再一修」（2+敗後） | 3+ 敗 = 架構問題。質式，勿再修。 |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | 讀錯、復現、察變、採證 | 明何與為何 |
| **2. Pattern** | 尋可用例，比對 | 辨差異 |
| **3. Hypothesis** | 立說，最小測 | 證或新說 |
| **4. Implementation** | 立測、修、驗 | bug 解，測過 |

## When Process Reveals "No Root Cause"

若系統察揭疾實為環境、時序、外部所致：

1. 流程已完
2. 錄所察
3. 實作適當處置（retry、timeout、錯訊）
4. 加監控/log 以便日後察

**然：** 95% 之「無根因」實為察不完。

## Supporting Techniques

本目錄內技術，皆系統化 debugging 之支：

- **`root-cause-tracing.md`** — 回溯 bug 穿 call stack 尋原觸發
- **`defense-in-depth.md`** — 尋根因後於多層加 validation
- **`condition-based-waiting.md`** — 以條件輪詢替任意 timeout

**相關 skills：**
- **superpowers:test-driven-development** — 寫失敗測例（Phase 4, Step 1）
- **superpowers:verification-before-completion** — 驗修效方稱成

## Real-World Impact

From debugging sessions:
- 系統化：15-30 分鐘修
- 亂修：2-3 小時亂竄
- 首修成功率：95% vs 40%
- 引入新 bug：近零 vs 常見