import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const trade = await req.json();

  const isASX = trade.exchange === "ASX";
  const pnl = trade.grossPnl ?? (trade.exitPrice ? (trade.exitPrice - trade.entryPrice) * trade.quantity : null);
  const won = pnl != null && pnl > 0;

  const prompt = `You are a professional trading coach reviewing a trade made on the ${trade.exchange} exchange by an Australian retail investor.

Trade Details:
- Stock: ${trade.ticker} (${trade.exchange})
- Direction: ${trade.direction.toUpperCase()}
- Entry: A$${trade.entryPrice} | Exit: ${trade.exitPrice ? `A$${trade.exitPrice}` : "Still open"}
- Quantity: ${trade.quantity} shares
- Holding period: ${trade.holdingDays ? `${trade.holdingDays} days` : "open"}
- Gross P&L: ${pnl != null ? `A$${pnl.toFixed(2)} (${won ? "WIN" : "LOSS"})` : "Open"}
- Brokerage: A$${trade.brokerage ?? 9.50} (typical ASX rate)

Context:
- Setup type: ${trade.setupType ?? "Not specified"}
- Trade thesis: ${trade.tradeThesis ?? "Not specified"}
- Market condition: ${trade.marketCondition ?? "Not specified"}
- ASX sector: ${trade.asxSector ?? "Not specified"}
- RBA cash rate at time: ${trade.rbaRateContext ?? "Not specified"}

Psychology:
- Psychology notes: ${trade.psychologyNotes ?? "Not specified"}
- Followed trading rules: ${trade.ruleFollowed != null ? (trade.ruleFollowed ? "Yes" : "No") : "Not specified"}
- Mistakes noted: ${trade.mistakes ?? "None noted"}

${isASX ? `Australian market context to consider: dividends may carry franking credits (${trade.asxSector === "Financials" ? "Big 4 banks typically 100% franked" : "check company's franking status"}), ASX has T+2 settlement, reporting season is Feb/Aug.` : "This is an international stock accessed by an Australian investor — consider USD/AUD impact on returns."}

---

Provide coaching feedback in JSON with this structure:
{
  "execution_score": 1-10,
  "psychology_score": 1-10,
  "risk_management_score": 1-10,
  "overall_score": 1-10,
  "execution_feedback": "What did they do well / poorly on timing, sizing, and entry/exit execution?",
  "psychology_feedback": "Emotional discipline assessment. Flag FOMO, revenge trading, or overconfidence patterns.",
  "risk_management_feedback": "Position sizing, stop loss discipline, brokerage impact on small trades, etc.",
  "recurring_patterns": ["pattern 1", "pattern 2"],
  "key_lessons": ["lesson 1", "lesson 2", "lesson 3"],
  "australian_specific": "Any ASX-specific notes: franking, reporting season, sector rotation, RBA rate impact, CHESS settlement",
  "improvement_actions": ["action 1", "action 2", "action 3"],
  "quote": "One motivational sentence for continuous improvement"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const analysis = JSON.parse(completion.choices[0].message.content ?? "{}");
    return NextResponse.json({ analysis, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
