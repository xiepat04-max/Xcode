"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface Article {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral";
  tickers?: string[];
}

interface Feed {
  articles: Article[];
  sentiment_summary: { positive: number; negative: number; neutral: number; overall_score: string };
}

const TOPICS = [
  { label: "ASX Markets", q: "ASX stock market Australia" },
  { label: "RBA & Rates", q: "Reserve Bank Australia interest rates inflation" },
  { label: "Mining & Resources", q: "iron ore BHP Rio Tinto mining Australia" },
  { label: "Banking", q: "CBA Westpac ANZ NAB bank results Australia" },
  { label: "AUD / Forex", q: "Australian dollar AUD currency" },
  { label: "Economy", q: "Australian economy GDP CPI employment" },
  { label: "US Markets", q: "S&P 500 Federal Reserve earnings season" },
];

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "bg-green-900/50 text-green-400 border-green-800/50",
  negative: "bg-red-900/50 text-red-400 border-red-800/50",
  neutral: "bg-gray-800 text-gray-400 border-gray-700",
};

export default function NewsPage() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(TOPICS[0].q);
  const [activeTopic, setActiveTopic] = useState(TOPICS[0].label);
  const [tickers, setTickers] = useState("CBA,BHP,ANZ");

  useEffect(() => { fetchNews(); }, []);

  async function fetchNews(q?: string) {
    const searchQuery = q ?? query;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: searchQuery, tickers });
      const res = await fetch(`/api/news?${params}`);
      const json = await res.json();
      setFeed(json);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }

  function selectTopic(topic: typeof TOPICS[0]) {
    setActiveTopic(topic.label);
    setQuery(topic.q);
    fetchNews(topic.q);
  }

  const ss = feed?.sentiment_summary;
  const overallScore = parseFloat(ss?.overall_score ?? "0");

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
          <span>📰</span> AI Financial News Summarizer
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Australian market focus · AI sentiment analysis · ASX announcements + NewsAPI
        </p>

        {/* Topic tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TOPICS.map(t => (
            <button key={t.label} onClick={() => selectTopic(t)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                activeTopic === t.label
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Custom search */}
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Custom search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchNews()}
          />
          <input
            className="w-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Tickers (CBA,BHP)"
            value={tickers}
            onChange={e => setTickers(e.target.value.toUpperCase())}
          />
          <button onClick={() => fetchNews()}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-lg text-sm font-medium transition-colors">
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* Sentiment bar */}
        {ss && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Market Sentiment</span>
              <span className={`text-sm font-bold ${overallScore > 0 ? "text-green-400" : overallScore < 0 ? "text-red-400" : "text-gray-400"}`}>
                {overallScore > 0 ? "+" : ""}{overallScore}%
              </span>
            </div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden">
              <div className="bg-green-500" style={{ width: `${(ss.positive / (feed?.articles.length || 1)) * 100}%` }} />
              <div className="bg-gray-600" style={{ width: `${(ss.neutral / (feed?.articles.length || 1)) * 100}%` }} />
              <div className="bg-red-500" style={{ width: `${(ss.negative / (feed?.articles.length || 1)) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-400">
              <span className="text-green-400">● Positive: {ss.positive}</span>
              <span className="text-gray-400">● Neutral: {ss.neutral}</span>
              <span className="text-red-400">● Negative: {ss.negative}</span>
            </div>
          </div>
        )}

        {/* Articles */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-3">Fetching and analysing news...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(feed?.articles ?? []).map((a, i) => (
              <div key={i} className={`bg-gray-900 rounded-xl border p-4 transition-colors hover:border-gray-600 ${
                a.sentiment ? `border-l-2 ${a.sentiment === "positive" ? "border-l-green-500 border-gray-800" : a.sentiment === "negative" ? "border-l-red-500 border-gray-800" : "border-gray-800"}` : "border-gray-800"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="font-medium text-gray-100 hover:text-blue-400 transition-colors leading-snug block">
                      {a.title}
                    </a>
                    {a.summary && (
                      <p className="text-gray-400 text-sm mt-1">{a.summary}</p>
                    )}
                    {!a.summary && a.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{a.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-600">{a.source}</span>
                      <span className="text-xs text-gray-600">
                        {a.publishedAt ? formatDistanceToNow(parseISO(a.publishedAt), { addSuffix: true }) : ""}
                      </span>
                      {(a.tickers ?? []).length > 0 && (
                        <div className="flex gap-1">
                          {a.tickers!.slice(0, 3).map(t => (
                            <span key={t} className="text-xs bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {a.sentiment && (
                    <span className={`text-xs border px-2 py-0.5 rounded-full whitespace-nowrap ${SENTIMENT_COLOR[a.sentiment]}`}>
                      {a.sentiment}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-600 text-center mt-6">
          Sources: NewsAPI · ASX Announcements · Sentiment by GPT-4o-mini · Not financial advice
        </p>
      </div>
    </main>
  );
}
