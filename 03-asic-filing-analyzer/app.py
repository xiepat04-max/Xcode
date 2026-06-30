"""
ASIC/ASX Filing Analyzer — Streamlit App
Accepts uploaded PDF annual reports or fetches ASX announcements directly.
"""
import streamlit as st
import os
from dotenv import load_dotenv
from asic_client import get_asx_announcements, get_annual_report_url, get_asic_company_info
from analyzer import extract_text_from_pdf, analyze_filing, analyze_announcement

load_dotenv()

st.set_page_config(
    page_title="ASIC/ASX Filing Analyzer",
    page_icon="🦘",
    layout="wide",
)

st.title("🦘 ASIC / ASX Filing Analyzer")
st.caption("Upload an ASX annual report or search by ticker — AI extracts risks, opportunities, and financial insights")

if not os.getenv("OPENAI_API_KEY"):
    st.error("Please set OPENAI_API_KEY in your .env file")
    st.stop()

tab1, tab2, tab3 = st.tabs(["📄 Upload Report (PDF)", "📡 Live ASX Announcements", "🌍 ASIC Company Search"])

# ── Tab 1: PDF Upload ─────────────────────────────────────────────────────────
with tab1:
    col1, col2 = st.columns([2, 1])
    with col1:
        uploaded = st.file_uploader(
            "Upload ASX Annual Report or Half-Year Results (PDF)",
            type=["pdf"],
            help="Upload the company's annual report PDF from the ASX website",
        )
    with col2:
        ticker_input = st.text_input("ASX Ticker (optional)", placeholder="e.g. CBA").upper()
        filing_type = st.selectbox("Filing Type", ["Annual Report", "Half-Year Results", "Appendix 4E", "Other"])

    if uploaded and st.button("🔍 Analyse Filing", type="primary"):
        with st.spinner("Reading PDF and generating AI analysis..."):
            pdf_bytes = uploaded.read()
            text = extract_text_from_pdf(pdf_bytes)
            st.info(f"Extracted {len(text):,} characters from {uploaded.name}")

            analysis = analyze_filing(text, ticker_input, filing_type)

        st.success("Analysis complete!")

        # Overview
        st.subheader("Executive Summary")
        st.info(analysis.get("one_page_summary", ""))
        st.markdown(f"**Sentiment:** `{analysis.get('sentiment', 'N/A')}`")

        col_a, col_b = st.columns(2)

        with col_a:
            st.subheader("🔑 Financial Highlights")
            for h in analysis.get("key_financial_highlights", []):
                st.markdown(f"- {h}")

            st.subheader("🌏 International Exposure")
            st.write(analysis.get("international_exposure", "N/A"))

            st.subheader("💰 Dividend Analysis")
            div = analysis.get("dividend_analysis", {})
            st.write(f"**Franking:** {div.get('franking', 'N/A')}")
            st.write(f"**Sustainability:** {div.get('sustainability', 'N/A')}")

        with col_b:
            st.subheader("⚠️ Key Risks")
            for r in analysis.get("key_risks", []):
                badge = {"High": "🔴", "Medium": "🟡", "Low": "🟢"}.get(r.get("severity", ""), "⚪")
                st.markdown(f"{badge} **{r.get('risk', '')}**")
                st.caption(r.get("australian_context", ""))

        st.subheader("🚀 Growth Opportunities")
        for o in analysis.get("growth_opportunities", []):
            st.markdown(f"**{o.get('opportunity', '')}** — _{o.get('timeline', '')}_")
            st.caption(o.get("commentary", ""))

        st.subheader("🦘 ASX-Specific Insights")
        for insight in analysis.get("asx_specific_insights", []):
            st.markdown(f"→ {insight}")

# ── Tab 2: Live ASX Announcements ─────────────────────────────────────────────
with tab2:
    col1, col2 = st.columns([2, 1])
    with col1:
        asx_ticker = st.text_input("ASX Ticker", placeholder="e.g. BHP", key="asx_tab2").upper()
    with col2:
        days_back = st.slider("Days of history", 30, 365, 90)

    if asx_ticker and st.button("📡 Fetch Announcements"):
        with st.spinner(f"Fetching ASX announcements for {asx_ticker}..."):
            announcements = get_asx_announcements(asx_ticker, days_back)
            reports = get_annual_report_url(asx_ticker)

        if reports:
            st.subheader("📋 Recent Reports")
            for rpt in reports:
                st.markdown(f"- [{rpt['title']}]({rpt['url']}) — {rpt['date']}")

        st.subheader(f"ASX Announcements ({len(announcements)} found)")
        for ann in announcements[:15]:
            if "error" in ann:
                st.error(ann["error"])
                break
            sensitive_badge = "🔴 Market Sensitive" if ann.get("sensitive") else ""
            with st.expander(f"{ann.get('date', '')[:10]} — {ann.get('title', '')} {sensitive_badge}"):
                st.write(f"**Type:** {ann.get('type', 'N/A')}")
                st.markdown(f"[View on ASX]({ann.get('url', '#')})")
                if st.button(f"AI Analyse", key=f"ann_{ann.get('date','')}"):
                    result = analyze_announcement(ann.get("title", "") + " " + ann.get("type", ""), asx_ticker)
                    st.json(result)

# ── Tab 3: ASIC Company Search ────────────────────────────────────────────────
with tab3:
    company_name = st.text_input("Company Name", placeholder="e.g. Commonwealth Bank of Australia")
    if company_name and st.button("🔍 Search ASIC"):
        with st.spinner("Searching ASIC Connect..."):
            info = get_asic_company_info(company_name)
        if info.get("found"):
            st.success("Company found in ASIC register")
            st.json(info)
        else:
            st.warning("Company not found or ASIC search unavailable. Try the ASIC Connect website directly.")
            st.markdown("[Open ASIC Connect](https://connectonline.asic.gov.au/)")

st.divider()
st.caption("Data sources: ASX Announcements API · ASIC Connect · OpenAI GPT-4o · Not financial advice")
