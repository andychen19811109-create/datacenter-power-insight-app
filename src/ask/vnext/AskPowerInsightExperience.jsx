import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { buildAnalysisContext } from "./buildAnalysisContext.js";
import { getClarificationQuestions, clarificationSelectionsToContext } from "./clarificationPolicy.js";
import { analyzeAskPowerInsight, createAskRequestId } from "./askPowerInsightClient.js";
import AskContextPanel from "./AskContextPanel.jsx";
import ClarificationPanel from "./ClarificationPanel.jsx";
import AskStandardReport from "./AskStandardReport.jsx";
import DegradedAnalysisPanel from "./DegradedAnalysisPanel.jsx";
import { createTestOnlyDraft } from "./fixtures/difyFixtures.js";
import { runDcpiAnalysisAdapter } from "./analysisAdapter.js";
import { composeAskStandardReport } from "./reportComposer.js";

const DEFAULT_QUESTION = "800VDC在AI数据中心供电架构中的机会和风险是什么？";
const CORE_QUESTIONS = [
  "Kstar是否需要花资源开发全新模块化UPS？",
  "800VDC在AI数据中心供电架构中的机会和风险是什么？",
  "从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
];

export default function AskPowerInsightExperience({ context, initialQuestion, onNavigate }) {
  const [question, setQuestion] = useState(initialQuestion || DEFAULT_QUESTION);
  const [phase, setPhase] = useState("input");
  const [analysisContext, setAnalysisContext] = useState(null);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [stageMessage, setStageMessage] = useState("");
  const [fixtureMode, setFixtureMode] = useState(false);
  const activeSubmissionRef = useRef(null);
  const contextVersionRef = useRef(0);
  const previousFilterSignatureRef = useRef(null);
  const filterSignature = useMemo(
    () => JSON.stringify(context?.normalizedFilters || context?.filters || {}),
    [context],
  );

  useEffect(() => {
    if (initialQuestion) setQuestion(initialQuestion);
  }, [initialQuestion]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const fixture = new URLSearchParams(window.location.search).get("vnext_fixture");
    if (!fixture) return;
    const fixtureQuestion = fixture === "gc01" ? CORE_QUESTIONS[0]
      : fixture === "gc03" ? CORE_QUESTIONS[2] : CORE_QUESTIONS[1];
    const clarification = fixture === "gc03"
      ? { decision_subject: "UNKNOWN", assumption: "用户选择暂不确定，按多情景比较。" } : {};
    const fixtureContext = buildAnalysisContext({ question: fixtureQuestion, pageContext: context, clarification });
    const overrides = fixture === "gc01" ? {
      candidate_conclusions: [
        "现有证据不足以支持立即启动全新平台；建议先进行平台差距和客户需求验证，再在“现有平台升级、全新平台、暂缓投入”三种路径中决策。",
        "先完成平台差距和客户需求验证，再在三种路径中决策。",
      ],
    } : {};
    const adapter = runDcpiAnalysisAdapter({ draft: createTestOnlyDraft(fixtureContext, `fixture_${fixture}`, overrides), analysisContext: fixtureContext });
    if (!adapter.draft) return;
    setQuestion(fixtureQuestion);
    setAnalysisContext(fixtureContext);
    setResult({ mode: "report", report: composeAskStandardReport({ adapterResult: adapter, analysisContext: fixtureContext }), analysisContext: fixtureContext });
    setFixtureMode(true);
    setPhase("report");
  }, [context]);

  useEffect(() => {
    if (previousFilterSignatureRef.current === null) {
      previousFilterSignatureRef.current = filterSignature;
      return;
    }
    if (previousFilterSignatureRef.current !== filterSignature && phase !== "input") {
      contextVersionRef.current += 1;
      setPhase("input");
      setResult(null);
      setAnalysisContext(null);
      setMessage("页面筛选条件已变化，旧结果已失效。请重新开始分析。 ");
    }
    previousFilterSignatureRef.current = filterSignature;
  }, [filterSignature, phase]);

  const execute = async (nextContext) => {
    const requestId = createAskRequestId();
    const submissionKey = `${nextContext.context_id}:${question.trim()}`;
    if (activeSubmissionRef.current?.key === submissionKey) return activeSubmissionRef.current.promise;
    setAnalysisContext(nextContext);
    setPhase("loading");
    setMessage("问题已提交，正在理解决策意图与分析边界。");
    setStageMessage("");
    const stageTimer = setTimeout(() => setStageMessage("正在执行专业校验、证据边界检查与报告重组。"), 8_000);
    const executionVersion = contextVersionRef.current;
    const promise = analyzeAskPowerInsight({ question: question.trim(), analysisContext: nextContext, requestId });
    activeSubmissionRef.current = { key: submissionKey, promise };
    try {
      const payload = await promise;
      if (executionVersion !== contextVersionRef.current) return;
      if (payload.mode === "clarification") {
        setAnalysisContext(payload.analysisContext || nextContext);
        setClarificationQuestions((payload.questions || []).slice(0, 3));
        setPhase("clarification");
      } else if (payload.mode === "report") {
        setResult(payload);
        setPhase("report");
      } else {
        setResult(payload);
        setPhase("degraded");
      }
    } finally {
      clearTimeout(stageTimer);
      activeSubmissionRef.current = null;
    }
  };

  const beginAnalysis = () => {
    const trimmed = question.trim();
    if (!trimmed) {
      setMessage("请输入需要分析的数据中心基础设施问题。");
      return;
    }
    const nextContext = buildAnalysisContext({ question: trimmed, pageContext: context });
    const questions = getClarificationQuestions(nextContext);
    setAnalysisContext(nextContext);
    if (questions.length) {
      setClarificationQuestions(questions);
      setPhase("clarification");
      return;
    }
    void execute(nextContext);
  };

  const continueAfterClarification = (selections) => {
    const clarification = clarificationSelectionsToContext(selections, clarificationQuestions);
    const nextContext = buildAnalysisContext({ question: question.trim(), pageContext: context, clarification });
    void execute(nextContext);
  };

  const modifyQuestion = () => {
    contextVersionRef.current += 1;
    setPhase("input");
    setResult(null);
    setStageMessage("");
    setFixtureMode(false);
  };

  if (phase === "clarification") {
    return <ClarificationPanel questions={clarificationQuestions} analysisContext={analysisContext} onContinue={continueAfterClarification} onBack={modifyQuestion} />;
  }

  if (phase === "report") {
    return (
      <div className="vnext-experience">
        {fixtureMode && <div className="vnext-fixture-banner">开发验证环境｜当前结果来自受控测试夹具，不代表Live分析</div>}
        <AskStandardReport report={result.report} analysisContext={result.analysisContext || analysisContext} onNavigate={onNavigate} />
        <div className="vnext-actions"><button type="button" className="btn" onClick={modifyQuestion}>修改问题</button></div>
      </div>
    );
  }

  if (phase === "degraded") {
    return <DegradedAnalysisPanel result={result} analysisContext={analysisContext} onRetry={() => void execute(analysisContext)} onModify={modifyQuestion} onNavigate={onNavigate} />;
  }

  return (
    <section className="vnext-experience" aria-label="Ask PowerInsight唯一入口">
      <div className="vnext-ask-hero">
        <div>
          <div className="vnext-eyebrow"><Sparkles size={14} /> DCPI专业决策分析</div>
          <h2>Ask PowerInsight</h2>
          <p>描述一个模糊、复杂或复合的数据中心基础设施问题。系统会继承适用页面条件，并将在线分析重组为可解释的专业决策简报。</p>
        </div>
        <span className="vnext-support">产品立项 · 技术路线 · 投资比较</span>
      </div>

      <div className="vnext-panel">
        <label className="vnext-input-label" htmlFor="ask-power-insight-question">你的问题</label>
        <textarea
          id="ask-power-insight-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="例如：800VDC在AI数据中心供电架构中的机会和风险是什么？"
        />
        <AskContextPanel
          question={question.trim() || DEFAULT_QUESTION}
          analysisContext={buildAnalysisContext({ question: question.trim() || DEFAULT_QUESTION, pageContext: context })}
          pageContext={context}
          compact
        />
        <button type="button" className="btn btn-primary vnext-submit" onClick={beginAnalysis} disabled={phase === "loading"}>
          <Send size={14} /> {phase === "loading" ? "分析处理中" : "开始分析"}
        </button>
        {message && <p className="vnext-progress" role="status">{message}</p>}
        {stageMessage && <p className="vnext-progress-stage">{stageMessage}</p>}
      </div>

      <section className="vnext-recommended">
        <h3>推荐问题</h3>
        <div className="vnext-question-list">
          {CORE_QUESTIONS.map((item) => (
            <button type="button" key={item} onClick={() => setQuestion(item)}>{item}</button>
          ))}
        </div>
      </section>

      <section className="vnext-scope-note">
        <strong>支持范围</strong>
        <p>UPS、HVDC、800VDC、BBU、液冷/CDU、精密空调、一体化电力模块、微模块、储能及 GaN/SiC 等数据中心供电与制冷主题。</p>
      </section>
    </section>
  );
}
