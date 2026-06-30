import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ASXStockData, EarningsRecord, ResearchReport } from "@/lib/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function formatAUD(n: number | null): string {
  if (n == null) return "N/A";
  if (Math.abs(n) >= 1e9) return `A$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `A$${(n / 1e6).toFixed(1)}M`;
  return `A$${n.toFixed(2)}`;
}

function buildPrompt(stock: ASXStockData, earnings: EarningsRecord[]): string {
  const earningsSummary = earnings
    .slice(-4)
    .map(e => `${e.date}: EPS actual=${e.epsActual ?? "N/A"}, estimate=${e.epsEstimate ?? "N/A"}, surprise=${e.surprisePercent != null ? e.surprisePercent.toFixed(1) + "%" : "N/A"}`)
    .join("\n");

  return `You are a senior equity analyst at a top Australian investment bank. Analyse the following ${stock.exchange}-listed stock and produce a structured research note tailored to Australian retail and institutional investors.

## Stock: ${stock.ticker} — ${stock.name}
- Exchange: ${stock.exchange} | ASX 200 member: ${stock.asx200Member}
- Sector: ${stock.sector} / ${stock.industry}
- Price: ${stock.currency === "AUD" ? "A$" : "$"}${stock.price.toFixed(2)} (${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}% today)
- Market Cap: ${formatAUD(stock.marketCap)}
- P/E Ratio: ${stock.peRatio?.toFixed(1) ?? "N/A"}
- EPS (TTM): ${stock.eps?.toFixed(3) ?? "N/A"}
- Dividend Yield: ${stock.dividendYield?.toFixed(2) ?? "N/A"}%${stock.frankingPercent != null ? ` (${stock.frankingPercent}% franked)` : ""}
- Revenue: ${formatAUD(stock.revenue)}
- Net Income: ${formatAUD(stock.netIncome)}
- ROE: ${stock.roe?.toFixed(1) ?? "N/A"}%
- Debt/Equity: ${stock.debtToEquity?.toFixed(2) ?? "N/A"}
- 52-wk range: ${stock.currency === "AUD" ? "A$" : "$"}${stock.week52Low.toFixed(2)} – ${stock.currency === "AUD" ? "A$" : "$"}${stock.week52High.toFixed(2)}

## Recent Earnings (last 4 periods)
${earningsSummary || "No earnings history available."}

## Business Description
${stock.description.slice(0, 800)}

---

Respond in **valid JSON only** with this exact structure:
{
  "summary": "2–3 sentence executive summary for an Australian investor",
  "bullCase": "150–200 word bull case. For ASX stocks mention: franking credits, dividend sustainability, ASX 200 index inclusion benefit, commodity exposure if relevant, RBA rate outlook impact. For international stocks: USD/AUD tailwind/headwind, global growth exposure.",
  "bearCase": "150–200 word bear case. Mention sector-specific Australian risks: ASIC regulation, RBA rate risk, housing market sensitivity (for banks), commodity price risk (for miners), Chinese demand risk where relevant.",
  "keyRisks": ["risk 1", "risk 2", "risk 3", "risk 4"],
  "keyOpportunities": ["opp 1", "opp 2", "opp 3", "opp 4"],
  "analystConsensus": "Buy | Hold | Sell — with one sentence rationale"
}`;
}

export async function POST(req: NextRequest) {
  try {
    const { stock, earnings } = (await req.json()) as {
      stock: ASXStockData;
      earnings: EarningsRecord[];
    };

    if (!stock) return NextResponse.json({ error: "stock data required" }, { status: 400 });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildPrompt(stock, earnings) }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");

    const report: ResearchReport = {
      stock,
      earnings,
      bullCase: parsed.bullCase ?? "",
      bearCase: parsed.bearCase ?? "",
      summary: parsed.summary ?? "",
      keyRisks: parsed.keyRisks ?? [],
      keyOpportunities: parsed.keyOpportunities ?? [],
      analystConsensus: parsed.analystConsensus ?? "",
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(report);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
