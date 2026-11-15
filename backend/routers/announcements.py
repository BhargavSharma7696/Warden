import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import get_db
from security import get_current_user, require_role
from services.llm import extract_summary_and_details

router = APIRouter(prefix="/announcements", tags=["announcements"])


class AnnouncementCreate(BaseModel):
    category: str
    title: str
    body: str
    team: Optional[str] = "Hostel Administration"
    date: Optional[str] = None
    summary: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    hostel: Optional[str] = None


def _format_announcement(row: Any) -> Dict[str, Any]:
    item = dict(row)
    details_raw = item.get("details", "{}")
    if isinstance(details_raw, str):
        try:
            item["details"] = json.loads(details_raw)
        except Exception:
            item["details"] = {}
    elif not isinstance(details_raw, dict):
        item["details"] = {}

    item["id"] = str(item["id"]).zfill(3)
    return item


@router.get("", response_model=List[Dict[str, Any]])
def get_announcements(user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute(
        "SELECT id, category, date, title, summary, team, body, details, created_at "
        "FROM announcements ORDER BY id DESC"
    ).fetchall()
    conn.close()

    return [_format_announcement(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_announcement(
    data: AnnouncementCreate,
    user: dict = Depends(require_role("warden", "admin")),
):
    if user.get("role") not in ("warden", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")

    date_val = data.date or datetime.now().strftime("%d %b %Y")
    summary_val = data.summary.strip() if data.summary else None
    details_val = data.details

    # If summary or details are missing, use LLM extraction skeleton
    if not summary_val or not details_val:
        extracted = extract_summary_and_details(data.body) or {}
        if not summary_val:
            summary_val = extracted.get("summary") or (data.body[:150] if data.body else "")
        if not details_val:
            details_val = extracted.get("details", {})

    if not summary_val or not str(summary_val).strip():
        summary_val = (data.body[:150] if data.body else "") or data.title or "Announcement"

    if details_val is None or not isinstance(details_val, dict):
        details_val = {}

    if data.hostel and "Hostels" not in details_val:
        details_val["Hostels"] = data.hostel

    details_json = json.dumps(details_val)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO announcements (category, date, title, summary, team, body, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.category,
            date_val,
            data.title,
            summary_val,
            data.team or "Hostel Administration",
            data.body,
            details_json,
        ),
    )
    new_id = cursor.lastrowid
    conn.commit()

    row = conn.execute(
        "SELECT id, category, date, title, summary, team, body, details, created_at "
        "FROM announcements WHERE id = ?",
        (new_id,),
    ).fetchone()
    conn.close()

    return _format_announcement(row)
