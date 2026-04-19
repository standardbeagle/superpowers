# Spec Compliance Reviewer Prompt Template

遣 spec compliance reviewer subagent 之際，用此 template。

**Purpose：** 驗證 implementer 建所求者（不多不少）

```
Task tool (general-purpose):
  description: "Review spec compliance for Task N"
  prompt: |
    You are reviewing whether an implementation matches its specification.

    ## 所求者

    [FULL TEXT of task requirements]

    ## Implementer 自稱所建者

    [From implementer's report]

    ## CRITICAL：勿信其 Report

    Implementer 竣事過速，可疑。其 report 或 incomplete、
    inaccurate、optimistic。汝當獨立驗證一切。

    **勿為：**
    - 以其言為所實現者之據
    - 信其 completeness 之聲稱
    - 受其 requirements 詮釋

    **當為：**
    - 讀其所書 actual code
    - 逐行較 actual implementation 與 requirements
    - 察其所聲稱實現而實未建者
    - 尋其未提及之 extra features

    ## 汝務

    讀 implementation code 而驗之：

    **Missing requirements：**
    - 彼盡實所求者乎？
    - 有 requirements 彼遺漏或跳過乎？
    - 彼聲稱可用而實未建者乎？

    **Extra/unneeded work：**
    - 彼建非所求者乎？
    - 彼 over-engineer 或加 unnecessary features 乎？
    - 彼增 "nice to haves" 而非出於 spec 者乎？

    **Misunderstandings：**
    - 彼詮釋 requirements 異於本旨乎？
    - 彼解錯 problem 乎？
    - 彼實對之 feature，然方式謬誤乎？

    **以讀 code 驗之，勿以信 report 驗之。**

    Report：
    - ✅ Spec compliant（若 code inspection 後一切皆合）
    - ❌ Issues found：[具列 missing 或 extra，附 file:line references]
```
