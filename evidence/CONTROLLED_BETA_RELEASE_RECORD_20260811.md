# Controlled Beta Release Record — 2026-08-11

## Release Target

Controlled MVP Beta / Demo

## Core

DCPI R2 Core R2-1.3 MVP FROZEN-V1

## Runtime Identity Verification

- Verdict: PASS
- Marker: `IDENTITY_CHECK_20260811_042259`
- Conversation ID: `b410a633-7d1e-4c18-bd97-a170e2db0ed7`
- Status: `SUCCESS`

## Frozen Requirement Status

The frozen requirement status is recorded by the existing Final Acceptance evidence in [`mvp-final-acceptance-20260810/`](mvp-final-acceptance-20260810/), including its acceptance matrix, checksum manifest, and final professional review. This release preparation does not repeat the Q1-Q10 acceptance run.

## P21 Boundary

- P21 Closed: NO
- Status: Known P1 Architectural Limitation
- Known Limitation: 当前MVP在来源主体不明、混合主体或内部竞对材料场景存在误归属风险；现以证据边界和语义治理降险，不具备确定性主张—证据主体验证；根治纳入Post-MVP证据归属架构。
- Root Fix: Post-MVP Evidence Attribution Architecture

## RC-P21

Diagnostic only / not promoted. RC-P21 is not part of the production path or this Controlled Beta release commit.

## Release Authorization

- Production Release: Not approved
- Controlled Beta Release: `RELEASE_PREP_READY`; Push, PR #37 Draft → Ready, Preview / Controlled Beta deployment, and cloud runtime identity verification still require explicit Cyril / GPT approval.

## External Trial Requirement

中国大陆同行须可通过手机浏览器、微信内置浏览器或PC浏览器直接访问Controlled Beta；发布阶段需支持指定人员受控访问或限时公开访问，并在正式开放前完成China Trial Access Gate。该 Gate 属于下一阶段 Preview / Controlled Beta Deployment Gate，不是本地 Release Package blocker。

## Recommended Next Action

等待 Cyril / GPT 明确批准后，才可进入：

1. push
2. PR #37 Draft → Ready
3. Preview / Controlled Beta deployment
4. Cloud runtime identity verification
5. China Trial Access Gate（正式对外开放前）
