import json
import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = os.getenv("DB_PATH", str(Path(__file__).resolve().parent / "hostel.db"))
SEED_FILE = BASE_DIR / "frontend" / "data" / "announcements.json"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # row["email"] jaise access ke liye
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student'
                CHECK(role IN ('student', 'warden', 'admin'))
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            team TEXT NOT NULL,
            body TEXT NOT NULL,
            details TEXT NOT NULL DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS issues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT,
            student_id TEXT,
            student_name TEXT,
            room_number TEXT,
            hostel TEXT,
            phone TEXT,
            title TEXT,
            description TEXT,
            category TEXT DEFAULT 'General',
            priority TEXT DEFAULT 'Medium',
            summary TEXT,
            status TEXT DEFAULT 'Pending',
            remarks TEXT DEFAULT '',
            raised_on TEXT,
            resolved_on TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    """)

    # Ensure all columns exist in issues table if table already existed
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(issues)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    for col, col_def in [
        ("email", "TEXT"),
        ("title", "TEXT"),
        ("remarks", "TEXT DEFAULT ''"),
        ("raised_on", "TEXT"),
        ("resolved_on", "TEXT DEFAULT ''"),
    ]:
        if col not in existing_cols:
            cursor.execute(f"ALTER TABLE issues ADD COLUMN {col} {col_def}")

    # Seed initial announcements if the table is empty
    count = conn.execute("SELECT COUNT(*) FROM announcements").fetchone()[0]
    if count == 0 and os.path.exists(SEED_FILE):
        try:
            with open(SEED_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                notices = data.get("announcements", []) if isinstance(data, dict) else data

                for item in notices:
                    # Combine greeting, description, extraMessage, closing into single body
                    parts = [
                        item.get("greeting"),
                        item.get("description"),
                        item.get("extraMessage"),
                        item.get("closing")
                    ]
                    body = "\n\n".join([p.strip() for p in parts if p and p.strip()])

                    details_val = item.get("details", {})
                    details_json = json.dumps(details_val) if isinstance(details_val, dict) else str(details_val)

                    conn.execute("""
                        INSERT INTO announcements (category, date, title, summary, team, body, details)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        item.get("category", "General"),
                        item.get("date", ""),
                        item.get("title", ""),
                        item.get("summary", ""),
                        item.get("team", "Hostel Administration"),
                        body,
                        details_json
                    ))
        except Exception as e:
            print(f"Warning: Failed to seed announcements: {e}")

    conn.commit()
    conn.close()
