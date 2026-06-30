import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchAustralianFinanceNews, fetchASXAnnouncementNews, type NewsArticle } from "@/lib/news-sources";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyseArticles(articles: NewsArticle[]): Promise<NewsArticle[]> {
  if (!process.env.OPENAI_API_KEY || articles.length === 0) return articles;

  // Batch-analyse up to 10 articles in one call
  const batch = articles.slice(0, 10);
  const prompt = `You are an Australian financial analyst. For each news headline and description below, provide:
1. A one-sentence summary (Australian market context)
2. Sentiment: positive, negative, or neutral
3. ASX tickers likely affected (e.g. ["CBA","WBC"] or [])

Return a JSON array with objects: {idx, summary, sentiment, tickers}

Articles:
${batch.map((a, i) => `${i}: "${a.title}" — "${a.description}"`).join("\n")}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
    const analyses: any[] = parsed.articles ?? parsed.results ?? [];

    return articles.map((a, i) => {
      const analysis = analyses.find((x: any) => x.idx === i);
      if (!analysis) return a;
      return {
        ...a,
        summary: analysis.summary,
        sentiment: analysis.sentiment as any,
        tickers: analysis.tickers ?? a.tickers ?? [],
      };
    });
  } catch {
    return articles;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "ASX Australian market";
  const tickers = req.nextUrl.searchParams.get("tickers")?.split(",").filter(Boolean) ?? [];

  try {
    const [newsArticles, asxArticles] = await Promise.all([
      fetchAustralianFinanceNews(query),
      tickers.length > 0 ? fetchASXAnnouncementNews(tickers) : Promise.resolve([]),
    ]);

    const combined = [...asxArticles, ...newsArticles].slice(0, 25);
    const analysed = await analyseArticles(combined);

    const positive = analysed.filter(a => a.sentiment === "positive").length;
    const negative = analysed.filter(a => a.sentiment === "negative").length;
    const neutral = analysed.filter(a => a.sentiment === "neutral").length;

    return NextResponse.json({
      articles: analysed,
      total: analysed.length,
      sentiment_summary: {
        positive,
        negative,
        neutral,
        overall_score: analysed.length > 0
          ? ((positive - negative) / analysed.length * 100).toFixed(1)
          : "0",
      },
      market: "Australia (ASX, RBA, ASIC)",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
