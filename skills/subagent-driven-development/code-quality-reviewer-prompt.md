# Code Quality Reviewer Prompt Template

遣 code quality reviewer subagent 之際，用此 template。

**Purpose：** 驗證 implementation 構建精良（clean、tested、maintainable）

**唯於 spec compliance review 通過後遣之。**

```
Task tool (superpowers:code-reviewer):
  Use template at requesting-code-review/code-reviewer.md

  WHAT_WAS_IMPLEMENTED: [from implementer's report]
  PLAN_OR_REQUIREMENTS: Task N from [plan-file]
  BASE_SHA: [commit before task]
  HEAD_SHA: [current commit]
  DESCRIPTION: [task summary]
```

**除 standard code quality concerns 外，reviewer 當察：**
- 各 file 是否具一 clear responsibility 及 well-defined interface？
- Units 是否分解至可獨立理解、測試？
- Implementation 是否遵行 plan 之 file structure？
- 此 implementation 是否創建既已龐大之新檔，或顯著增長既有檔？（勿標 pre-existing file sizes——當聚焦於此 change 之所貢獻。）

**Code reviewer returns：** Strengths、Issues（Critical/Important/Minor）、Assessment
