"""
OpenAI-powered ASX/ASIC document analyzer.
Extracts key risks, growth opportunities, and financial insights from:
- ASX annual/half-year reports (PDF upload)
- ASX announcements (text)
"""
import re
from openai import OpenAI
import pdfplumber
import io

client = OpenAI()

SYSTEM_PROMPT = """You are a senior analyst at an Australian investment bank specialising in ASX-listed companies.
You analyse annual reports, half-year results, and ASX announcements and extract actionable insights for Australian investors.

When analysing documents, always consider:
- Australian regulatory environment (ASIC, ASX Listing Rules, APRA for financials)
- Franking credits and dividend sustainability
- Australian financial year (July–June) and reporting seasons (Feb H1, Aug FY)
- Commodity cycle exposure (iron ore, coal, copper, gold, LNG) where relevant
- Chinese demand risk for resource companies
- RBA interest rate sensitivity
- AUD/USD impact on earnings
- Housing market sensitivity for banks and REITs
- SMSF investor base implications for dividend policy
- Any mention of ESG/climate commitments under ASIC sustainability disclosure rules"""


def extract_text_from_pdf(pdf_bytes: bytes, max_chars: int = 30000) -> str:
    """Extract text from uploaded PDF filing."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages[:40]:  # Limit to first 40 pages
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
                if sum(len(p) for p in text_parts) > max_chars:
                    break
    return "\n".join(text_parts)[:max_chars]


def analyze_filing(text: str, ticker: str = "", filing_type: str = "Annual Report") -> dict:
    """Send filing text to OpenAI and get structured analysis."""
    prompt = f"""Analyse this ASX {filing_type} for {ticker or 'the company'}.

DOCUMENT CONTENT:
{text[:25000]}

---
Provide your analysis in JSON with this exact structure:
{{
  "company_overview": "2-3 sentence overview of the business and its position in the Australian market",
  "key_financial_highlights": ["highlight 1", "highlight 2", "highlight 3", "highlight 4", "highlight 5"],
  "key_risks": [
    {{"risk": "description", "severity": "High|Medium|Low", "australian_context": "why this matters for ASX investors"}}
  ],
  "growth_opportunities": [
    {{"opportunity": "description", "timeline": "Short|Medium|Long term", "commentary": "strategic rationale"}}
  ],
  "dividend_analysis": {{
    "yield_mentioned": "yes/no/not stated",
    "franking": "fully franked/partially franked/unfranked/not stated",
    "sustainability": "commentary on dividend sustainability"
  }},
  "asx_specific_insights": ["insight 1", "insight 2", "insight 3"],
  "international_exposure": "commentary on USD revenue, commodity prices, global markets exposure",
  "sentiment": "Positive|Neutral|Cautious|Negative",
  "one_page_summary": "150-word executive summary for an Australian retail investor"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
    )

    import json
    return json.loads(response.choices[0].message.content)


def analyze_announcement(text: str, ticker: str = "") -> dict:
    """Quick analysis of a single ASX market announcement."""
    prompt = f"""Analyse this ASX announcement for {ticker}:

{text[:8000]}

Return JSON:
{{
  "headline_summary": "one sentence",
  "market_impact": "Positive|Negative|Neutral|Mixed",
  "key_points": ["point 1", "point 2", "point 3"],
  "investor_action": "what should an ASX investor consider doing?",
  "regulatory_flags": "any ASIC/ASX Listing Rule compliance notes"
}}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    import json
    return json.loads(response.choices[0].message.content)
