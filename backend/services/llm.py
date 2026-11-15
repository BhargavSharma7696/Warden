import os
from pathlib import Path
from typing import Dict, Any, Optional
from google import genai
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
services_dir = Path(__file__).resolve().parent
backend_dir = services_dir.parent
root_dir = backend_dir.parent

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
client = None
if api_key and api_key.strip():
    try:
        client = genai.Client(api_key=api_key.strip())
    except Exception as e:
        print("Warning: Could not initialize Gemini client:", e)
        client = None

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")


class Detail(BaseModel):
    key: str
    value: str


class Extraction(BaseModel):
    summary: str
    details: list[Detail]


class IssueAnalysis(BaseModel):
    category: str
    priority: str
    summary: str


def extract_summary_and_details(body: str) -> Dict[str, Any]:
    clean_body = body.strip() if body else ""
    fallback = {"summary": clean_body[:50], "details": {}}

    if not client:
        return fallback

    prompt = (
        "Analyze the hostel announcement inside <announcement> tags.\n"
        "Return a 1-2 sentence summary and key-value details.\n"
        f"<announcement>{body or ''}</announcement>"
    )
    try:
        resp = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": Extraction,
            },
        )
        data = getattr(resp, "parsed", None)
        if data and hasattr(data, "summary"):
            details_dict = {d.key: d.value for d in (data.details or [])}
            return {
                "summary": data.summary or fallback["summary"],
                "details": details_dict,
            }
        return fallback
    except Exception as e:
        print("LLM extraction failed, using fallback:", e)
        return fallback


def analyze_issue(description: str) -> Dict[str, str]:
    clean_desc = description.strip() if description else ""
    fallback = {
        "category": "Not Defined",
        "priority": "Medium",
        "summary": clean_desc[:50] if clean_desc else "No description",
    }

    if not client:
        return fallback

    prompt = (
        "Analyze the hostel issue inside <issue> tags.\n"
        "Provide category, priority (Low, Medium, High, Urgent), and a 1-sentence title(5-8 words)(where summary is required).\n"
        f"<issue>{description or ''}</issue>"
    )
    try:
        resp = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": IssueAnalysis,
            },
        )
        data = getattr(resp, "parsed", None)
        if data:
            return {
                "category": getattr(data, "category", fallback["category"]) or fallback["category"],
                "priority": getattr(data, "priority", fallback["priority"]) or fallback["priority"],
                "summary": getattr(data, "summary", fallback["summary"]) or fallback["summary"],
            }
        return fallback
    except Exception as e:
        print("LLM issue analysis failed, using fallback:", e)
        return fallback
