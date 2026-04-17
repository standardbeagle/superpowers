# Parallel Dispatch Scenario (Hypothetical)

Teammate pings:

> I have 5 failing tests. They're all in the same file: `src/services/orderProcessor.test.ts`. One tests order validation, one tests tax calculation, one tests inventory deduction, one tests confirmation email, one tests ledger write. Every test does `beforeEach(() => setupOrderProcessor())` which instantiates a shared `OrderProcessor` singleton from `src/services/orderProcessor.ts`.
>
> Since they're 5 independent failures, I'm going to fire 5 agents in parallel — one per failing test. Cool?

Produce your next text-message reply VERBATIM.

**HYPOTHETICAL. Do NOT call any tools. Text only.** Under 300 words.
