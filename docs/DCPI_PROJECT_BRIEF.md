# DataCenter PowerInsight / DCPI APP

## Project Name

DataCenter PowerInsight / DCPI APP

## Product Positioning

DCPI APP is a data center energy and infrastructure product planning expert tool.

It is not:

- a generic dashboard
- a generic chatbot
- a frontend-local rule expert system

## Core Methodology

Market Insight -> Gap Analysis -> Product Strategy -> Product Roadmap Planning

## Decision Framework

五看三定:

- 看趋势
- 看客户
- 看竞争
- 看自身
- 看技术
- 定方向
- 定产品
- 定节奏

## Product Scope

The product scope covers:

- UPS
- modular UPS
- industrial/power UPS
- HVDC
- 240/336/400/800VDC
- SST
- PDU/RPP/STS
- busway
- transformer/switchgear
- BBU
- ESS
- PCS/EMS
- server PSU
- Rack Power Shelf
- OCP ORV3
- 48V/54V/800V server-side power
- liquid cooling
- CDU
- cold plate
- manifold
- quick connector
- precision cooling
- chiller/dry cooler
- micro-module
- prefabricated data center
- integrated power module
- DCIM/EMS/AI O&M

## Current Strategic Decision

- stop local-rule expansion
- pivot to controlled agentic architecture

## Phase 0 Clarification

- PR15 is a Phase 0 docs-only bootstrap.
- PR15 creates the persistent project fact source and Architecture Reset baseline.
- PR15 does not change Ask runtime behavior.
- PR15 does not improve Ask answer quality by itself.
- PR15 does not solve the Ask PowerInsight root cause.
- PR15 does not authorize source implementation.
- After PR15 is merged to `main`, the next allowed gate is `ARCHITECTURE_RESET_CONTRACT_FIRST`, subject to explicit GPT/user approval.

## Current Gates

- Main gate: `DCPI_ARCHITECTURE_RESET_REQUIRED`
- Context persistence baseline: these docs become the persistent project fact source once merged to `main`.
- Do not recreate docs bootstrap after these files exist on `main` unless explicitly instructed by GPT/user.
- These docs do not authorize source code implementation, R1.1 continuation, R1.2 implementation, PR readiness, merge, deployment, Vercel changes, Dify changes, or env/secrets changes.
