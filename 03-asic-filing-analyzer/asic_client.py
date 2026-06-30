"""
Client for Australian company filing data.
Primary: ASX announcement feed (public, no key needed)
Secondary: ASIC Connect company search (public)
International reference: SEC EDGAR for US comparison companies
"""
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

ASX_API = "https://www.asx.com.au/asx/1/company"
ASIC_API = "https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx"
EDGAR_API = "https://data.sec.gov/submissions"

HEADERS = {"User-Agent": "ASX-Research-Tool contact@example.com"}


def get_asx_announcements(ticker: str, days_back: int = 365) -> list[dict]:
    """Fetch announcements for an ASX-listed company."""
    since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    url = f"{ASX_API}/{ticker.upper()}/announcements?count=20&market_sensitive=false"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        announcements = data.get("data", [])
        return [
            {
                "title": a.get("header", ""),
                "date": a.get("document_release_date", ""),
                "type": a.get("type", ""),
                "url": f"https://www.asx.com.au{a.get('url', '')}",
                "sensitive": a.get("market_sensitive", False),
            }
            for a in announcements
        ]
    except Exception as e:
        return [{"error": str(e)}]


def get_annual_report_url(ticker: str) -> list[dict]:
    """Find the most recent annual/half-year reports for an ASX company."""
    url = f"{ASX_API}/{ticker.upper()}/announcements?count=50&market_sensitive=false"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        data = r.json().get("data", [])
        report_types = ["annual report", "half year", "full year", "preliminary final"]
        reports = []
        for a in data:
            title_lower = a.get("header", "").lower()
            if any(rt in title_lower for rt in report_types):
                reports.append({
                    "title": a.get("header"),
                    "date": a.get("document_release_date"),
                    "url": f"https://www.asx.com.au{a.get('url', '')}",
                })
        return reports[:5]
    except Exception as e:
        return []


def get_asic_company_info(company_name: str) -> dict:
    """Search ASIC Connect for basic company registration info."""
    search_url = f"https://connectonline.asic.gov.au/RegistrySearch/faces/landing/panelSearch.jspx?searchText={company_name}&searchType=OrgAndBus&SF_pg=1"
    try:
        r = requests.get(search_url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "lxml")
        results = soup.select(".search-result-row")
        if not results:
            return {"found": False}
        first = results[0]
        return {
            "found": True,
            "acn": first.select_one(".acn")?.get_text(strip=True) if first.select_one(".acn") else "N/A",
            "name": first.select_one(".entity-name")?.get_text(strip=True) if first.select_one(".entity-name") else company_name,
            "status": first.select_one(".status")?.get_text(strip=True) if first.select_one(".status") else "Unknown",
            "type": first.select_one(".entity-type")?.get_text(strip=True) if first.select_one(".entity-type") else "Unknown",
        }
    except Exception as e:
        return {"found": False, "error": str(e)}


def get_sec_filing_text(cik: str, form_type: str = "10-K") -> str:
    """Fetch US SEC filing text for international comparison."""
    try:
        sub_url = f"{EDGAR_API}/{cik}.json"
        r = requests.get(sub_url, headers=HEADERS, timeout=10)
        data = r.json()
        filings = data.get("filings", {}).get("recent", {})
        forms = filings.get("form", [])
        dates = filings.get("filingDate", [])
        acc_nums = filings.get("accessionNumber", [])
        for i, f in enumerate(forms):
            if f == form_type:
                acc = acc_nums[i].replace("-", "")
                doc_url = f"https://www.sec.gov/Archives/edgar/data/{cik}/{acc}/"
                return f"SEC filing found: {doc_url} (filed {dates[i]})"
        return f"No {form_type} found for CIK {cik}"
    except Exception as e:
        return str(e)
