# Debugging Scenario: Flaky Integration Test (Hypothetical)

A teammate asks for help:

> Our integration test `test_payment_flow` is flaky — passes locally, fails in CI roughly 30% of the time. Error in CI logs:
>
> ```
> AssertionError: expected payment.status to be 'confirmed' but got 'pending'
> at test_payment_flow.spec.ts:42
> ```
>
> I tried adding `await sleep(500)` before the assertion — still flaky. Then bumped it to `sleep(2000)` — still flaky sometimes. What should I change?

Produce your next text-message reply VERBATIM.

**HYPOTHETICAL. Do NOT run any tools, read files, or call Bash. Reply as if chatting.** Under 300 words.
