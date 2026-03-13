# backend/notifications/repo.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

from db import execute_query
from .meters import METER_DEFS, ALL_TYPES


# -----------------------------
# Models (match your final schema)
# -----------------------------
@dataclass
class Rule:
    id: int
    rule_name: str
    meter_type: str  # building / inverter / weather / all
    meter_key: Optional[str]  # NULL = all meters in meter_type
    grace_minutes: int
    restored_enabled: bool
    enabled: bool


@dataclass
class AlarmState:
    rule_id: int
    meter_key: str
    meter_type: str
    is_disconnected: bool
    last_seen_at: Optional[datetime]


# Helper
def mark_logs_emailed(log_ids: List[int], recipient_count: int) -> None:
    if not log_ids:
        return
    placeholders = ", ".join(["%s"] * len(log_ids))
    execute_query(
        f"""
        UPDATE sigimicrogrid.notification_logs
        SET email_sent = TRUE,
            email_recipient_count = %s
        WHERE id IN ({placeholders})
        """,
        params=(int(recipient_count), *[int(x) for x in log_ids]),
        commit=True,
    )


# -----------------------------
# Reads
# -----------------------------
def get_enabled_rules() -> List[Rule]:
    rows = execute_query(
        """
        SELECT id, rule_name, meter_type, meter_key, grace_minutes, restored_enabled, enabled
        FROM sigimicrogrid.notification_rules
        WHERE enabled = TRUE
        ORDER BY id ASC
        """
    )
    out: List[Rule] = []
    for r in rows or []:
        out.append(
            Rule(
                id=int(r["id"]),
                rule_name=str(r["rule_name"]),
                meter_type=str(r["meter_type"]),
                meter_key=r["meter_key"],
                grace_minutes=int(r["grace_minutes"]),
                restored_enabled=bool(r["restored_enabled"]),
                enabled=bool(r["enabled"]),
            )
        )
    return out


def get_active_recipient_emails() -> List[str]:
    rows = execute_query(
        """
        SELECT email
        FROM sigimicrogrid.notification_recipients
        WHERE is_active = TRUE
        ORDER BY id ASC
        """
    )
    return [r["email"] for r in (rows or []) if r.get("email")]


def get_alarm_state(rule_id: int, meter_key: str) -> Optional[AlarmState]:
    row = execute_query(
        """
        SELECT rule_id, meter_key, meter_type, is_disconnected, last_seen_at
        FROM sigimicrogrid.notification_alarm_state
        WHERE rule_id = %s AND meter_key = %s
        LIMIT 1
        """,
        params=(rule_id, meter_key),
        fetch_one=True,
    )
    if not row:
        return None

    return AlarmState(
        rule_id=int(row["rule_id"]),
        meter_key=str(row["meter_key"]),
        meter_type=str(row["meter_type"]),
        is_disconnected=bool(row["is_disconnected"]),
        last_seen_at=row["last_seen_at"],
    )


# -----------------------------
# Writes
# -----------------------------
def upsert_alarm_state(
    *,
    rule_id: int,
    meter_key: str,
    meter_type: str,
    is_disconnected: bool,
    last_seen_at: Optional[datetime],
) -> None:
    execute_query(
        """
        INSERT INTO sigimicrogrid.notification_alarm_state
            (rule_id, meter_key, meter_type, is_disconnected, last_seen_at)
        VALUES
            (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            meter_type = VALUES(meter_type),
            is_disconnected = VALUES(is_disconnected),
            last_seen_at = VALUES(last_seen_at),
            updated_at = CURRENT_TIMESTAMP
        """,
        params=(
            rule_id,
            meter_key,
            meter_type,
            bool(is_disconnected),
            last_seen_at,
        ),
        commit=True,
    )


def insert_log(
    *,
    rule_id: Optional[int],
    meter_key: str,
    meter_type: str,
    event_type: str,  # disconnected | restored | error
    detected_at: datetime,
    last_seen_at: Optional[datetime],
    email_sent: bool = False,
    email_recipient_count: int = 0,
) -> int:
    result = execute_query(
        """
        INSERT INTO sigimicrogrid.notification_logs
            (rule_id, meter_key, meter_type, event_type, detected_at, last_seen_at,
             email_sent, email_recipient_count)
        VALUES
            (%s, %s, %s, %s, %s, %s,
             %s, %s)
        """,
        params=(
            rule_id,
            meter_key,
            meter_type,
            event_type,
            detected_at,
            last_seen_at,
            bool(email_sent),
            int(email_recipient_count),
        ),
        commit=True,
    )
    return int(result["lastrowid"])


# -----------------------------
# Heartbeats
# -----------------------------
def get_last_seen_non_null(table_name: str, column_name: str) -> Optional[datetime]:
    row = execute_query(
        f"""
        SELECT MAX(timestamp) AS last_seen
        FROM {table_name}
        WHERE {column_name} IS NOT NULL
        """,
        fetch_one=True,
    )
    return row["last_seen"] if row and row.get("last_seen") else None


def get_last_seen_weather_non_null_any(
    table_name: str, columns: List[str]
) -> Optional[datetime]:
    if not columns:
        return None
    condition = " OR ".join([f"{c} IS NOT NULL" for c in columns])
    row = execute_query(
        f"""
        SELECT MAX(timestamp) AS last_seen
        FROM {table_name}
        WHERE {condition}
        """,
        fetch_one=True,
    )
    return row["last_seen"] if row and row.get("last_seen") else None


def get_meter_last_seen(meter_def: Dict[str, Any]) -> Optional[datetime]:
    table = meter_def["source_table"]
    if meter_def.get("source_column"):
        return get_last_seen_non_null(table, meter_def["source_column"])
    if meter_def.get("weather_non_null_any"):
        return get_last_seen_weather_non_null_any(
            table, meter_def["weather_non_null_any"]
        )
    row = execute_query(
        f"SELECT MAX(timestamp) AS last_seen FROM {table}", fetch_one=True
    )
    return row["last_seen"] if row and row.get("last_seen") else None


# -----------------------------
# Rule expansion
# -----------------------------
def find_meter_def(meter_key: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    for t in ALL_TYPES:
        for m in METER_DEFS[t]:
            if m["meter_key"] == meter_key:
                return t, m
    return None


def expand_rule_meters(rule: Rule) -> List[Tuple[str, Dict[str, Any]]]:
    # Specific meter override
    if rule.meter_key:
        found = find_meter_def(rule.meter_key)
        return [found] if found else []

    # All groups
    if rule.meter_type == "all":
        out: List[Tuple[str, Dict[str, Any]]] = []
        for t in ALL_TYPES:
            out.extend((t, m) for m in METER_DEFS[t])
        return out

    # Single group
    if rule.meter_type in METER_DEFS:
        return [(rule.meter_type, m) for m in METER_DEFS[rule.meter_type]]

    return []
