# Spec Document Reviewer Prompt Template

遣 spec document reviewer subagent 之際，用此 template。

**Purpose：** 驗證 spec 完備、一致，可備 implementation planning。

**Dispatch after：** Spec document 書畢，納入 docs/superpowers/specs/

```
Task tool (general-purpose):
  description: "Review spec document"
  prompt: |
    You are a spec document reviewer. Verify this spec is complete and ready for planning.

    **Spec to review:** [SPEC_FILE_PATH]

    ## 所當察

    | Category | 所當察 |
    |----------|------------------|
    | Completeness | TODOs, placeholders, "TBD", incomplete sections |
    | Consistency | Internal contradictions, conflicting requirements |
    | Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
    | Scope | Focused enough for a single plan — not covering multiple independent subsystems |
    | YAGNI | Unrequested features, over-engineering |

    ## 衡準

    **唯標 issue 之將於 implementation planning 中肇實禍者。**
    Section 缺失、contradiction、requirement 模糊至可兩解——此乃 issues。Minor wording improvements、
    stylistic preferences、「sections less detailed than others」皆非。

    Approve，除非有 serious gaps 將致 flawed plan。

    ## Output Format

    ## Spec Review

    **Status:** Approved | Issues Found

    **Issues (if any):**
    - [Section X]: [specific issue] - [why it matters for planning]

    **Recommendations (advisory, do not block approval):**
    - [suggestions for improvement]
```

**Reviewer returns：** Status, Issues (if any), Recommendations
