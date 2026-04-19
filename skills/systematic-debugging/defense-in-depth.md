# Defense-in-Depth Validation

## Overview

修复由 invalid data 所致之 bug，於一处添 validation 似足。然单一之检可为异途 code paths、refactoring 或 mocks 所 bypass。

**Core principle：** 凡 data 所经之层，皆当 validate。使 bug 结构上为不可能。

## Why Multiple Layers

Single validation："We fixed the bug"
Multiple layers："We made the bug impossible"

异层捕异况：
- Entry validation 捕大多 bugs
- Business logic 捕 edge cases
- Environment guards 防 context-specific 之险
- Debug logging 助他层失效之时

## The Four Layers

### Layer 1: Entry Point Validation
**Purpose：** 於 API boundary 拒明显 invalid 之 input

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### Layer 2: Business Logic Validation
**Purpose：** 保 data 於此 operation 为合理

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### Layer 3: Environment Guards
**Purpose：** 於特定 context 禁危险操作

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### Layer 4: Debug Instrumentation
**Purpose：** 捕 context 以备 forensics

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## Applying the Pattern

得 bug 之时：

1. **Trace the data flow** —— bad value 起於何处？用於何处？
2. **Map all checkpoints** —— 列 data 所经之每一点
3. **Add validation at each layer** —— Entry、business、environment、debug
4. **Test each layer** —— 试 bypass layer 1，验 layer 2 能否捕之

## Example from Session

Bug：Empty `projectDir` 致 `git init` 於 source code

**Data flow：**
1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` 行於 `process.cwd()`

**Four layers added：**
- Layer 1：`Project.create()` validate 非 empty/exists/writable
- Layer 2：`WorkspaceManager` validate projectDir 非 empty
- Layer 3：`WorktreeManager` 於 tests 中拒 git init 出 tmpdir
- Layer 4：git init 前 log stack trace

**Result：** 1847 tests 皆过，bug 不可复现

## Key Insight

四层皆必要。测试之际，各层捕他层所漏：
- 异 code paths bypass entry validation
- Mocks bypass business logic checks
- 异平台之 edge cases 需 environment guards
- Debug logging 识 structural misuse

**勿止於单一 validation point。** 每层皆添 checks。
