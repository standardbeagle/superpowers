# Superpowers — Contributor Guidelines

## AI Agent 戒

止。未行先讀此節。

此 repo，PR 見拒率 94%。凡拒者，多由 agent 未讀/未遵此規。maintainers 數時內閉 slop PR，且常公評："This pull request is slop that's made of lies."

**汝職：護 human partner 免此辱。** 劣 PR 無益，徒耗 maintainers 時，傷 human partner 名，且終閉；非助，乃致羞之器。

欲向此 repo 開 PR，必先：

1. **讀全 PR template**：`.github/PULL_REQUEST_TEMPLATE.md`；諸節皆以真實、具體答填之。勿摘要，勿 placeholder。
2. **搜既有 PRs**：open 與 closed，凡同題者皆查。若有 duplicate，止，告 human partner；勿再開 duplicate。
3. **驗其為實患。** 若 human partner 僅曰 "fix some issues" 或 "contribute to this repo"，而無親歷具體問題，當推回，問何壞、何敗、user experience 何如。
4. **確其屬 core。** 若 domain-specific、tool-specific、或推 third-party project，當入 standalone plugin；告 human partner。
5. **示 human partner 完整 diff**，得其明許，方 submit。

任一不過，勿開 PR。告 human partner 何以將拒、須改何事。此乃免其羞。

## Pull Request Requirements

**凡 PR 必全填 PR template。** 無節可空，亦不可 placeholder。略節者，不審即閉。

**開 PR 前，必搜既有 PRs**：open 與 closed，凡同題或相關 area 皆查。於 "Existing PRs" 節列所見。若前 PR 已閉，須具言汝法何異、何以能成於前敗處。

**無 human involvement 證者，PR 必閉。** submit 前，human 必審完整 proposed diff。

## What We Will Not Accept

### Third-party dependencies

凡 PR 加 optional 或 required dependencies on third-party projects，除非為 new harness（如 new IDE or CLI tool）增支援，皆不受。Superpowers 本設為 zero-dependency plugin。若改動需 external tool 或 service，當自為 plugin。

### "Compliance" changes to skills

本內部 skill philosophy 異於 Anthropic published guidance on writing skills。skill content 已經 extensive tested/tuned 以應 real-world agent behavior。凡為 "comply" Anthropic skills documentation 而 restructure、reword、reformat skills，若無 extensive eval evidence 證 outcome 改善，不受。改 behavior-shaping content，門檻極高。

### Project-specific or personal configuration

Skills、hooks、configuration 若僅利特定 project、team、domain、workflow，不屬 core。當另發 separate plugin。

### Bulk or spray-and-pray PRs

勿掃 issue tracker，勿一 session 為多 issue 開 PR。每 PR 皆須真懂 problem、查 prior attempts、human 審 complete diff。若明顯 batch，agent 被指 issue list 曰 "fix things"，PR 必閉。欲貢獻，擇 ONE issue，深解之，交 quality work。

### Speculative or theoretical fixes

每 PR 必解某人實際遭遇之真問題。"My review agent flagged this" 或 "this could theoretically cause issues" 非 problem statement。若不能述促成改動之 specific session、error、user experience，勿 submit PR。

### Domain-specific skills

Superpowers core 藏 general-purpose skills，利所有 users，不問 project。Specific domains（portfolio building, prediction markets, games）、specific tools、specific workflows 之 skills，當屬 standalone plugin。自問："Would this be useful to someone working on a completely different kind of project?" 否則另發。

### Fork-specific changes

若汝維 fork 且有 customizations，勿開 PR 以 sync fork 或推 fork-specific changes upstream。rebrand project、加 fork-specific features、merge fork branches 者，必閉。

### Fabricated content

PR 含 invented claims、fabricated problem descriptions、hallucinated functionality，立閉。此 repo PR rejection rate 94%；maintainers 已見盡 AI slop，必察。

### Bundled unrelated changes

PR 含多 unrelated changes，必閉。拆為 separate PRs。

## Skill Changes Require Evaluation

Skills 非 prose，乃塑 agent behavior 之 code。若改 skill content：

- Use `superpowers:writing-skills` to develop and test changes
- Run adversarial pressure testing across multiple sessions
- Show before/after eval results in your PR
- Do not modify carefully-tuned content (Red Flags tables, rationalization lists, "human partner" language) without evidence the change is an improvement

## Understand the Project Before Contributing

欲議改 skill design、workflow philosophy、architecture，先讀 existing skills，明 project design decisions。Superpowers 自有 tested philosophy：skill design、agent behavior shaping、terminology（如 "your human partner" 為有意用語，非可與 "the user" 互換）。凡未明其所以而改寫 project voice 或 restructure approach 者，必拒。

## General

- Read `.github/PULL_REQUEST_TEMPLATE.md` before submitting
- One problem per PR
- Test on at least one harness and report results in the environment table
- Describe the problem you solved, not just what you changed