"use client";

import { useState } from "react";

interface TradeForm {
  ticker: string; exchange: string; direction: string;
  quantity: number; entryPrice: number; exitPrice: string;
  entryDate: string; exitDate: string; brokerage: number;
  marketCondition: string; tradeThesis: string; setupType: string;
  asxSector: string; rbaRateContext: string;
  psychologyNotes: string; ruleFollowed: string; mistakes: string;
}

interface AIAnalysis {
  execution_score: number; psychology_score: number;
  risk_management_score: number; overall_score: number;
  execution_feedback: string; psychology_feedback: string;
  risk_management_feedback: string; recurring_patterns: string[];
  key_lessons: string[]; australian_specific: string;
  improvement_actions: string[]; quote: string;
}

const ASX_SECTORS = ["Financials","Materials","Healthcare","Consumer Staples",
  "Consumer Discretionary","Communication","Real Estate","Energy","Industrials","Technology","Utilities"];

const DEFAULT_FORM: TradeForm = {
  ticker: "CBA", exchange: "ASX", direction: "long",
  quantity: 100, entryPrice: 130.00, exitPrice: "",
  entryDate: new Date().toISOString().split("T")[0], exitDate: "",
  brokerage: 9.50, marketCondition: "bull", tradeThesis: "",
  setupType: "value", asxSector: "Financials", rbaRateContext: "4.35%",
  psychologyNotes: "", ruleFollowed: "", mistakes: "",
};

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const color = score >= 8 ? "text-green-400 bg-green-900/40 border-green-800/50"
    : score >= 6 ? "text-yellow-400 bg-yellow-900/40 border-yellow-800/50"
    : "text-red-400 bg-red-900/40 border-red-800/50";
  return (
    <div className={`rounded-xl border p-4 text-center ${color}`}>
      <p className="text-3xl font-bold">{score}/10</p>
      <p className="text-xs mt-1 opacity-80">{label}</p>
    </div>
  );
}

export default function TradingJournal() {
  const [form, setForm] = useState<TradeForm>(DEFAULT_FORM);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof TradeForm, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function submit() {
    setLoading(true); setError(""); setAnalysis(null);
    try {
      const exitPrice = form.exitPrice ? parseFloat(form.exitPrice) : null;
      const holdingDays = form.exitDate
        ? Math.round((new Date(form.exitDate).getTime() - new Date(form.entryDate).getTime()) / 86400000)
        : null;
      const grossPnl = exitPrice != null
        ? (form.direction === "long" ? exitPrice - form.entryPrice : form.entryPrice - exitPrice) * form.quantity
        : null;

      const payload = { ...form, exitPrice, holdingDays, grossPnl };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAnalysis(json.analysis);
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  const pnl = form.exitPrice
    ? (form.direction === "long"
        ? parseFloat(form.exitPrice) - form.entryPrice
        : form.entryPrice - parseFloat(form.exitPrice)
      ) * form.quantity - form.brokerage * 2
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
          <span>📒</span> AI Trading Journal
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Log ASX & international trades · Receive AI coaching on execution, psychology & risk management
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            {/* Trade basics */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Trade Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ticker</label>
                  <input className="input" value={form.ticker} onChange={e => set("ticker", e.target.value.toUpperCase())} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Exchange</label>
                  <select className="input" value={form.exchange} onChange={e => set("exchange", e.target.value)}>
                    {["ASX","NYSE","NASDAQ","LSE"].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Direction</label>
                  <select className="input" value={form.direction} onChange={e => set("direction", e.target.value)}>
                    <option value="long">Long (Buy)</option>
                    <option value="short">Short (Sell)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Quantity</label>
                  <input type="number" className="input" value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Entry Price (A$)</label>
                  <input type="number" step="0.001" className="input" value={form.entryPrice} onChange={e => set("entryPrice", Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Exit Price (A$)</label>
                  <input type="number" step="0.001" className="input" placeholder="Leave blank if open"
                    value={form.exitPrice} onChange={e => set("exitPrice", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Entry Date</label>
                  <input type="date" className="input" value={form.entryDate} onChange={e => set("entryDate", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Exit Date</label>
                  <input type="date" className="input" value={form.exitDate} onChange={e => set("exitDate", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Brokerage (A$)</label>
                  <input type="number" step="0.5" className="input" value={form.brokerage} onChange={e => set("brokerage", Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">RBA Cash Rate</label>
                  <input className="input" value={form.rbaRateContext} onChange={e => set("rbaRateContext", e.target.value)} />
                </div>
              </div>

              {pnl != null && (
                <div className={`mt-3 p-3 rounded-lg text-center font-bold ${pnl >= 0 ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                  Net P&L: A${pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({((pnl / (form.entryPrice * form.quantity)) * 100).toFixed(2)}%)
                </div>
              )}
            </div>

            {/* Context */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Trade Context</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Setup Type</label>
                  <select className="input" value={form.setupType} onChange={e => set("setupType", e.target.value)}>
                    {["value","momentum","breakout","dividend","earnings","swing","pair trade","other"].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Market Condition</label>
                  <select className="input" value={form.marketCondition} onChange={e => set("marketCondition", e.target.value)}>
                    {["bull","bear","sideways","volatile","reporting season"].map(m => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {form.exchange === "ASX" && (
                <div className="mb-3">
                  <label className="text-xs text-gray-400 block mb-1">ASX Sector</label>
                  <select className="input" value={form.asxSector} onChange={e => set("asxSector", e.target.value)}>
                    {ASX_SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 block mb-1">Trade Thesis</label>
                <textarea className="input resize-none h-16 w-full" placeholder="Why did you take this trade?"
                  value={form.tradeThesis} onChange={e => set("tradeThesis", e.target.value)} />
              </div>
            </div>

            {/* Psychology */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Psychology & Reflection</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Psychology notes (FOMO? Disciplined?)</label>
                  <textarea className="input resize-none h-16 w-full"
                    value={form.psychologyNotes} onChange={e => set("psychologyNotes", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mistakes / what you'd do differently</label>
                  <textarea className="input resize-none h-16 w-full"
                    value={form.mistakes} onChange={e => set("mistakes", e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Followed your trading rules?</label>
                  <select className="input" value={form.ruleFollowed} onChange={e => set("ruleFollowed", e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="yes">Yes — stayed disciplined</option>
                    <option value="no">No — broke my rules</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={submit} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 rounded-xl font-semibold transition-colors">
              {loading ? "Generating AI Coaching..." : "Get AI Feedback"}
            </button>

            {error && <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-300 text-sm">{error}</div>}
          </div>

          {/* AI Analysis */}
          <div>
            {loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <div className="inline-block w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400">GPT-4o is analysing your trade...</p>
              </div>
            )}

            {analysis && !loading && (
              <div className="space-y-4">
                {/* Scores */}
                <div className="grid grid-cols-2 gap-3">
                  <ScoreBadge score={analysis.overall_score} label="Overall" />
                  <ScoreBadge score={analysis.execution_score} label="Execution" />
                  <ScoreBadge score={analysis.psychology_score} label="Psychology" />
                  <ScoreBadge score={analysis.risk_management_score} label="Risk Management" />
                </div>

                {/* Quote */}
                <div className="bg-blue-900/20 border border-blue-800/40 rounded-xl p-4 text-center">
                  <p className="text-blue-300 italic text-sm">"{analysis.quote}"</p>
                </div>

                {/* Feedback sections */}
                {[
                  { title: "🎯 Execution", content: analysis.execution_feedback },
                  { title: "🧠 Psychology", content: analysis.psychology_feedback },
                  { title: "⚠️ Risk Management", content: analysis.risk_management_feedback },
                  { title: "🦘 Australian Market Notes", content: analysis.australian_specific },
                ].map(({ title, content }) => (
                  <div key={title} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <h3 className="font-medium mb-2 text-sm">{title}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{content}</p>
                  </div>
                ))}

                {/* Lessons & Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <h3 className="font-medium mb-2 text-sm text-yellow-400">📚 Key Lessons</h3>
                    <ul className="space-y-1">
                      {analysis.key_lessons.map((l, i) => (
                        <li key={i} className="text-xs text-gray-300">• {l}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <h3 className="font-medium mb-2 text-sm text-green-400">✅ Action Items</h3>
                    <ul className="space-y-1">
                      {analysis.improvement_actions.map((a, i) => (
                        <li key={i} className="text-xs text-gray-300">• {a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.recurring_patterns.length > 0 && (
                  <div className="bg-orange-900/20 border border-orange-800/40 rounded-xl p-4">
                    <h3 className="font-medium mb-2 text-sm text-orange-400">🔄 Recurring Patterns</h3>
                    {analysis.recurring_patterns.map((p, i) => (
                      <p key={i} className="text-xs text-gray-300">• {p}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!analysis && !loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
                <p className="text-4xl mb-4">📒</p>
                <p>Fill in a trade on the left and click Get AI Feedback.</p>
                <p className="text-xs mt-2">GPT-4o will coach you on execution, psychology, and risk management with Australian market context.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: rgb(31 41 55);
          border: 1px solid rgb(55 65 81);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          color: white;
        }
        .input:focus { border-color: rgb(59 130 246); }
      `}</style>
    </main>
  );
}
