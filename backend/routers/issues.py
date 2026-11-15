from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from database import get_db
from security import get_current_user
from services.llm import analyze_issue

router = APIRouter(prefix="/issues", tags=["issues"])


class IssueCreate(BaseModel):
    student_id: str
    student_name: str
    room_number: str
    hostel: str
    phone: str
    description: str


def _format_date(date_str: Optional[str]) -> str:
    if not date_str:
        return ""
    try:
        clean = str(date_str).strip().split()[0].split("T")[0]
        dt = datetime.strptime(clean, "%Y-%m-%d")
        return dt.strftime("%d %b %Y")
    except Exception:
        return str(date_str)


def _format_issue(row: Any) -> Dict[str, Any]:
    item = dict(row)
    raised_on_raw = item.get("raised_on")
    if not raised_on_raw:
        created_at = item.get("created_at")
        raised_on_raw = str(created_at).split()[0].split("T")[0] if created_at else ""

    raised_on = _format_date(raised_on_raw)
    resolved_on = _format_date(item.get("resolved_on"))

    title = item.get("title") or item.get("summary") or f"{item.get('category', 'General')} Issue"
    status_val = item.get("status") or "Pending"
    if status_val in ("Open", "In Progress"):
        status_val = "Pending"
    elif status_val == "Closed":
        status_val = "Resolved"

    return {
        "id": item["id"],
        "title": title,
        "description": item.get("description", ""),
        "category": item.get("category", "General"),
        "hostel": item.get("hostel", ""),
        "room": item.get("room_number", ""),
        "studentId": item.get("student_id", ""),
        "studentName": item.get("student_name", ""),
        "phone": item.get("phone", ""),
        "raisedOn": raised_on or datetime.now().strftime("%d %b %Y"),
        "status": status_val,
        "priority": item.get("priority", "Medium"),
        "remarks": item.get("remarks", ""),
        "resolvedOn": resolved_on,
        "summary": item.get("summary", title),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_issue(
    data: IssueCreate,
    user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    fields_to_check = {
        "student_id": data.student_id,
        "student_name": data.student_name,
        "room_number": data.room_number,
        "hostel": data.hostel,
        "phone": data.phone,
        "description": data.description,
    }
    for field_name, value in fields_to_check.items():
        if not value or not str(value).strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Field '{field_name}' cannot be empty",
            )

    analysis = analyze_issue(data.description) or {}
    category = analysis.get("category") or "General"
    priority = analysis.get("priority") or "Medium"
    if priority not in ("Low", "Medium", "High", "Urgent"):
        priority = "Medium"
    summary = analysis.get("summary") or (data.description[:100] if data.description else "")

    status_val = "Pending"
    raised_on_val = datetime.now().strftime("%Y-%m-%d")
    title_val = summary

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO issues (user_id, student_id, student_name, room_number, hostel, phone, title, description, category, priority, summary, status, raised_on)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user["id"],
            data.student_id.strip(),
            data.student_name.strip(),
            data.room_number.strip(),
            data.hostel.strip(),
            data.phone.strip(),
            title_val,
            data.description.strip(),
            category,
            priority,
            summary,
            status_val,
            raised_on_val,
        ),
    )
    new_id = cursor.lastrowid
    conn.commit()

    row = conn.execute("SELECT * FROM issues WHERE id = ?", (new_id,)).fetchone()
    conn.close()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve created issue",
        )

    return _format_issue(row)


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]], include_in_schema=False)
def get_issues(user: dict = Depends(get_current_user)) -> List[Dict[str, Any]]:
    conn = get_db()
    role = user.get("role")
    if role in ("warden", "admin"):
        rows = conn.execute("SELECT * FROM issues ORDER BY id DESC").fetchall()
    elif role == "student":
        rows = conn.execute(
            "SELECT * FROM issues WHERE user_id = ? OR user_id IS NULL ORDER BY id DESC",
            (user["id"],),
        ).fetchall()
    else:
        rows = []
    conn.close()

    return [_format_issue(r) for r in rows]
