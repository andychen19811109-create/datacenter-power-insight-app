# Final Acceptance Matrices

## Requirements

| ID | Requirement | Evidence | Status | Blocking? |
|---|---|---|---|---|
| R01 | Ask PowerInsight is the single professional analysis entry | Browser home navigation and `uiContract.test.js` | PASS | NO |
| R02 | No ordinary-user M1 Demo navigation | `browser/00-home-annotated.png`; browser text audit | PASS | NO |
| R03 | Page filters enter Canonical Input and Ask requests | `browser/context-linkage-before-run.png`; snapshot/API tests | PASS | NO |
| R04 | MANUAL > QUESTION > PAGE > INFERENCE > UNSPECIFIED | Canonical tests; Q1/Q5/Q6 live snapshots | PASS | NO |
| R05 | PAGE `全部` is not a business restriction | Canonical tests; Q1/Q2/Q10 live snapshots | PASS | NO |
| R06 | PAGE year does not become `time_horizon` | Context-linkage browser evidence; canonical tests | PASS | NO |
| R07 | Subject entity is not a competitor | Q1/Q2 live snapshots; entity-role tests | PASS | NO |
| R08 | Competitors require explicit comparison/role | Q5 live snapshot; entity-role tests | PASS | NO |
| R09 | `extra_context` contains business context only | Q1 live snapshot; forbidden-metadata tests and UI error path | PASS | NO |
| R10 | Canonical run snapshot is immutable | `runSnapshot.js`; snapshot lifecycle tests | PASS | NO |
| R11 | Later page changes do not reinterpret old reports | `browser/Q1-snapshot-changed.png` | PASS | NO |
| R12 | Changed-page warning is explicit Chinese | Q1 changed-snapshot browser evidence | PASS | NO |
| R13 | Core identity has a server-side single source of truth | `api/_r2-core-identity.js`; API tests | PASS | NO |
| R14 | Runtime identity is FROZEN-V1 | All ten live records; drift audit | PASS | NO |
| R15 | Renderer performs structural Markdown rendering only | Parser/RAW/UI tests; direct RAW-to-React browser evidence | PASS | NO |
| R16 | Status badge is separate from core conclusion | Q1 browser and renderer tests | PASS | NO |
| R17 | First report content is the real R2 core conclusion | Q1-Q10 screenshots and parsed-vs-RAW records | PASS | NO |
| R18 | Ordinary-user UI labels are Chinese | Browser navigation/report/degraded audits | PASS | NO |
| R19 | No schema/JSON/trace/O1-O7/internal Provider exposure | Browser text audit; degraded-path tests | PASS | NO |
| R20 | `本次分析条件` reflects Canonical Input | Q1/Q5/Q6/Q9 live snapshots and screenshots | PASS | NO |
| R21 | Ask and Dashboard share context logic | Context-linkage browser evidence; snapshot tests | PASS | NO |
| R22 | Related modules inherit the frozen run context | Browser presence; `related modules inherit the run filters` test | PASS | NO |
| R23 | Final Gate uses real FROZEN-V1 results | `runs/Q1.json` through `runs/Q10.json` | PASS | NO |
| R24 | Provider failure is controlled and truthful | `legacy-120s/Q2.json` and degraded UI screenshot | PASS | NO |

## Historical issues

| Issue | Original problem | Fix | Final evidence | Status |
|---|---|---|---|---|
| P01 | M1 Demo competed with Ask | Removed ordinary-user entry | Home browser navigation | CLOSED |
| P02 | M1 Demo had no real relation to Ask | Ordinary users now have one Ask path | Home browser navigation | CLOSED |
| P03 | Reports were hard to read | Structural headings, lists, tables, citations, collapsible sections | Q1-Q10 screenshots | CLOSED |
| P04 | UI exposed English/engineering labels | Chinese labels and internal-field removal | Browser text audit | CLOSED |
| P05 | Ask disconnected from page filters | Shared page context builder | Context-linkage screenshot | CLOSED |
| P06 | Filters were display-only | Canonical/API payload binding | Snapshot/API tests | CLOSED |
| P07 | Canonical precedence incomplete | Five-level precedence and conflict records | Canonical tests/live snapshots | CLOSED |
| P08 | PAGE `全部` became a constraint | Neutral PAGE normalization | Canonical tests | CLOSED |
| P09 | PAGE year became time horizon | Page time retained only in `page_ctx` | Context screenshot/tests | CLOSED |
| P10 | Subject became competitor | Generic entity-role separation | Q1/Q2 snapshots/entity tests | CLOSED |
| P11 | Extra Context contained engineering metadata | Contract validation and Chinese UI rejection | Canonical tests | CLOSED |
| P12 | Filters rewrote existing reports | Frozen run snapshot and changed-page warning | Q1 snapshot browser evidence | CLOSED |
| P13 | Core identity drift | Server-side SSoT and runtime evidence binding | Ten live records/API tests | CLOSED |
| P14 | Renderer added business reasoning | Removed semantic section classification and synthetic decision fields | Parser/RAW/UI tests | CLOSED |
| P15 | Status became business conclusion | Badge-only status extraction | Q1 screenshot/renderer tests | CLOSED |
| P16 | Q1 subject attribution was wrong | Kstar remains subject, not competitor | Q1 live RAW/snapshot | CLOSED |
| P17 | RM/`我司` evidence bound to Kstar | Evidence boundary retained as verification item | Q1 live RAW | CLOSED |
| P18 | Vertiv/Huawei evidence crossed subjects | Two-company evidence discipline and explicit gaps | Q5 live RAW | CLOSED |
| P19 | Roadmap/planning became production fact | Planning/POC/production boundaries preserved | Q6 live RAW | CLOSED |
| P20 | Prior entity leaked into a new session | Every request uses an empty Dify conversation | Distinct IDs; Q6 contains no Kstar/Q1 constraint | CLOSED |

## Six release gates

| Gate | Result | Evidence / limitation |
|---|---|---|
| G1 Core | PASS | Ten real HTTP 200, non-degraded FROZEN-V1 reports |
| G2 Input / Context | PASS | Canonical, entity-role, context-linkage and snapshot evidence |
| G3 Q1-Q10 Professional Output | PASS for preliminary Codex review | No FAIL and at most one MINOR per question; GPT/Cyril final review remains required |
| G4 UI / Product Experience | PASS | Real browser navigation, report, degraded, Markdown and snapshot evidence |
| G5 Engineering | PASS with documented legacy-test exception | vNext 110/110 and build PASS; frozen M1 old exact-path allowlist rejects the new closeout file set |
| G6 Live Functional Chain | PASS under revised acceptance rule | Ten real outputs within 300 seconds; production 120-second mismatch remains a runtime limitation |
