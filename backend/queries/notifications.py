from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple

from db import get_connection

import os
import smtplib
import ssl
from email.message import EmailMessage

# ============================================================
# Trimmed monitored meters (MVP)
# ============================================================
# IMPORTANT:
# - Shark/building meters detect heartbeat by LAST NON-NULL timestamp
# - Weather station also uses LAST NON-NULL timestamp (not table heartbeat only)
METER_DEFS: Dict[str, List[Dict[str, Any]]] = {
    "inverter": [
        {
            "meter_key": "pv_1086",
            "meter_name": "Inverter A (1086)",
            "source_table": "sigimicrogrid.sharks_demand_kw",
            "source_column": "InverterA_1086",
        },
        {
            "meter_key": "pv_1200",
            "meter_name": "Inverter B (1200)",
            "source_table": "sigimicrogrid.sharks_demand_kw",
            "source_column": "InverterB_1200",
        },
        {
            "meter_key": "pv_1084",
            "meter_name": "Inverter C (1084)",
            "source_table": "sigimicrogrid.sharks_demand_kw",
            "source_column": "InverterC_1084",
        },
    ],
    "building": [
        {
            "meter_key": "admin_net",
            "meter_name": "Building 1084 (Admin)",
            "source_table": "sigimicrogrid.sharks_demand_kw",
            "source_column": "Admin_Net",
        },
        {
            "meter_key": "b1086_net",
            "meter_name": "Building 1086",
            "source_table": "sigimicrogrid.sharks_demand_kw",
            "source_column": "B1086_Net",
        },
        {
            "meter_key": "b1200_net",
            "meter_name": "Building 1200",
            "source_table": "sigimicrogrid.sharks_demand_kw",
            "source_column": "B1200_Net",
        },
    ],
    "weather": [
        {
            "meter_key": "weather_station_main",
            "meter_name": "Weather Station",
            "source_table": "sigimicrogrid.weather_station_processed",
            # Use a null-aware weather heartbeat (at least one useful field exists)
            "source_column": None,
            "weather_non_null_any": [
                "ambient_temp_f",
                "cell_temp_f",
                "global_horizontal_radiation_wm2",
                "irradiance_wm2",
            ],
        }
    ],
}

ALL_TYPES = ("inverter", "building", "weather")


# ============================================================
# Data models
# ============================================================


@dataclass
class Rule:
    id: int
    rule_name: str
    meter_type: str
    meter_key: Optional[str]
    threshold_minutes: int
    send_recovery: bool
    enabled: bool


@dataclass
class AlarmState:
    rule_id: int
    meter_key: str
    meter_type: str
    violating: bool
    last_seen_at: Optional[datetime]
    disconnected_at: Optional[datetime]
    restored_at: Optional[datetime]
    last_message: Optional[str]


# ============================================================
# DB helpers
# ============================================================


def _conn():
    conn = get_connection()
    if not conn:
        raise RuntimeError("Failed to connect to MySQL")
    return conn


def query_all(sql: str, params: tuple = ()) -> List[dict]:
    conn = _conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


def query_one(sql: str, params: tuple = ()) -> Optional[dict]:
    conn = _conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def execute(sql: str, params: tuple = ()) -> int:
    conn = _conn()
    cur = conn.cursor()
    try:
        cur.execute(sql, params)
        conn.commit()
        return cur.rowcount
    finally:
        cur.close()
        conn.close()


def get_active_recipient_emails() -> list[str]:
    rows = query_all(
        """
        SELECT email
        FROM sigimicrogrid.notification_recipients
        WHERE is_active = TRUE
        ORDER BY id ASC
        """
    )
    return [r["email"] for r in rows if r.get("email")]


def send_email_smtp(subject: str, body: str, recipients: list[str]) -> None:
    """
    Minimal SMTP sender.
    Configure via env vars:
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
      SMTP_TLS = 'ssl' (default) or 'starttls'
    """
    if not recipients:
        return

    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "465"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASS", "")
    from_addr = os.getenv("SMTP_FROM", user)

    tls_mode = os.getenv("SMTP_TLS", "ssl").lower()  # 'ssl' or 'starttls'

    if not host or not from_addr:
        raise RuntimeError("SMTP not configured: set SMTP_HOST and SMTP_FROM (and usually SMTP_USER/SMTP_PASS)")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)

    context = ssl.create_default_context()

    if tls_mode == "starttls":
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            if user and password:
                server.login(user, password)
            server.send_message(msg)
    else:
        # default SSL (port 465 typical)
        with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as server:
            if user and password:
                server.login(user, password)
            server.send_message(msg)


from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo  # Python 3.9+

SITE_TZ = ZoneInfo("America/Los_Angeles")


def _fmt_site_time(dt: datetime) -> str:
    # If dt is naive, assume it is site time already
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SITE_TZ)
    else:
        dt = dt.astimezone(SITE_TZ)
    return dt.strftime("%Y-%m-%d %H:%M:%S") + " America/Los_Angeles"


def build_email(
    event_type: str,  # "disconnected" | "restored"
    meter_name: str,
    threshold_minutes: int,
    minutes_since_last_valid: Optional[int],
    event_time: datetime,
) -> tuple[str, str]:
    subject = f"[SIGI] {event_type.upper()}: {meter_name}"

    gap_str = str(minutes_since_last_valid) if minutes_since_last_valid is not None else "N/A"

    lines = [
        f"Event: {event_type.upper()}",
        f"Meter: {meter_name}",
        "",
        f"Minutes since last valid reading: {gap_str}",
        f"Alert if no data for at least: {threshold_minutes} minutes",
        "",
        f"Site time: {_fmt_site_time(event_time)}",
    ]
    return subject, "\n".join(lines)


# ============================================================
# Notification table operations
# ============================================================


def get_enabled_disconnect_rules() -> List[Rule]:
    rows = query_all(
        """
        SELECT id, rule_name, meter_type, meter_key, threshold_minutes, send_recovery, enabled
        FROM sigimicrogrid.notification_rules
        WHERE enabled = TRUE
          AND rule_type = 'disconnect'
        ORDER BY id ASC
        """
    )
    return [
        Rule(
            id=int(r["id"]),
            rule_name=str(r["rule_name"]),
            meter_type=str(r["meter_type"]),
            meter_key=r["meter_key"],
            threshold_minutes=int(r["threshold_minutes"]),
            send_recovery=bool(r["send_recovery"]),
            enabled=bool(r["enabled"]),
        )
        for r in rows
    ]


def get_alarm_state(rule_id: int, meter_key: str) -> Optional[AlarmState]:
    row = query_one(
        """
        SELECT rule_id, meter_key, meter_type, violating, last_seen_at,
               disconnected_at, restored_at, last_message
        FROM sigimicrogrid.notification_alarm_state
        WHERE rule_id = %s AND meter_key = %s
        LIMIT 1
        """,
        (rule_id, meter_key),
    )
    if not row:
        return None

    return AlarmState(
        rule_id=int(row["rule_id"]),
        meter_key=str(row["meter_key"]),
        meter_type=str(row["meter_type"]),
        violating=bool(row["violating"]),
        last_seen_at=row["last_seen_at"],
        disconnected_at=row["disconnected_at"],
        restored_at=row["restored_at"],
        last_message=row["last_message"],
    )


def upsert_alarm_state(
    *,
    rule_id: int,
    meter_key: str,
    meter_type: str,
    violating: bool,
    last_seen_at: Optional[datetime],
    disconnected_at: Optional[datetime],
    restored_at: Optional[datetime],
    last_message: Optional[str],
) -> None:
    execute(
        """
        INSERT INTO sigimicrogrid.notification_alarm_state
            (rule_id, meter_key, meter_type, violating, last_seen_at, disconnected_at, restored_at, last_message)
        VALUES
            (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            meter_type = VALUES(meter_type),
            violating = VALUES(violating),
            last_seen_at = VALUES(last_seen_at),
            disconnected_at = VALUES(disconnected_at),
            restored_at = VALUES(restored_at),
            last_message = VALUES(last_message),
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            rule_id,
            meter_key,
            meter_type,
            bool(violating),
            last_seen_at,
            disconnected_at,
            restored_at,
            last_message,
        ),
    )


def insert_log(
    *,
    rule_id: Optional[int],
    meter_key: str,
    meter_type: str,
    event_type: str,  # disconnected | restored | info | error
    message: str,
    observed_at: datetime,
    last_seen_at: Optional[datetime],
    threshold_minutes: Optional[int],
    stale_minutes: Optional[int],
    email_sent: bool = False,
    email_recipient_count: int = 0,
) -> None:
    execute(
        """
        INSERT INTO sigimicrogrid.notification_logs
            (rule_id, meter_key, meter_type, event_type, message, observed_at,
             last_seen_at, threshold_minutes, stale_minutes, email_sent, email_recipient_count)
        VALUES
            (%s, %s, %s, %s, %s, %s,
             %s, %s, %s, %s, %s)
        """,
        (
            rule_id,
            meter_key,
            meter_type,
            event_type,
            message,
            observed_at,
            last_seen_at,
            threshold_minutes,
            stale_minutes,
            bool(email_sent),
            int(email_recipient_count),
        ),
    )


# ============================================================
# Heartbeat queries (core)
# ============================================================


def get_last_seen_non_null(table_name: str, column_name: str) -> Optional[datetime]:
    # table_name / column_name are hardcoded in METER_DEFS, not user input
    row = query_one(
        f"""
        SELECT MAX(timestamp) AS last_seen
        FROM {table_name}
        WHERE {column_name} IS NOT NULL
        """
    )
    return row["last_seen"] if row and row.get("last_seen") else None


def get_last_seen_weather_non_null_any(table_name: str, columns: List[str]) -> Optional[datetime]:
    if not columns:
        return None

    condition = " OR ".join([f"{c} IS NOT NULL" for c in columns])  # hardcoded columns
    row = query_one(
        f"""
        SELECT MAX(timestamp) AS last_seen
        FROM {table_name}
        WHERE {condition}
        """
    )
    return row["last_seen"] if row and row.get("last_seen") else None


def get_meter_last_seen(meter_def: Dict[str, Any]) -> Optional[datetime]:
    table_name = meter_def["source_table"]

    if meter_def.get("source_column"):
        return get_last_seen_non_null(table_name, meter_def["source_column"])

    if meter_def.get("weather_non_null_any"):
        return get_last_seen_weather_non_null_any(table_name, meter_def["weather_non_null_any"])

    # Fallback (not used in this trimmed config)
    row = query_one(f"SELECT MAX(timestamp) AS last_seen FROM {table_name}")
    return row["last_seen"] if row and row.get("last_seen") else None


# ============================================================
# Rule expansion
# ============================================================


def find_meter_def(meter_key: str) -> Optional[Tuple[str, Dict[str, Any]]]:
    for meter_type in ALL_TYPES:
        for m in METER_DEFS[meter_type]:
            if m["meter_key"] == meter_key:
                return meter_type, m
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


# ============================================================
# Detector logic (edge-triggered, no repeat alerts)
# ============================================================


def stale_minutes(now: datetime, last_seen_at: Optional[datetime]) -> Optional[int]:
    if last_seen_at is None:
        return None
    diff = now - last_seen_at
    return max(0, int(diff.total_seconds() // 60))


def evaluate_meter(rule: Rule, meter_type: str, meter_def: Dict[str, Any], now: datetime) -> None:
    meter_key = meter_def["meter_key"]
    meter_name = meter_def["meter_name"]
    threshold = int(rule.threshold_minutes)

    try:
        last_seen = get_meter_last_seen(meter_def)
    except Exception as e:
        msg = f"Heartbeat query failed for {meter_key}: {e}"
        print(f"❌ {msg}")
        insert_log(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            event_type="error",
            message=msg,
            observed_at=now,
            last_seen_at=None,
            threshold_minutes=threshold,
            stale_minutes=None,
        )
        return

    # If no valid heartbeat exists at all, treat as disconnected candidate
    staleness = stale_minutes(now, last_seen)
    is_disconnected = (last_seen is None) or (staleness is not None and staleness >= threshold)

    prev = get_alarm_state(rule.id, meter_key)
    was_disconnected = bool(prev.violating) if prev else False

    # 1) DISCONNECTED edge (one-shot)
    if is_disconnected and not was_disconnected:
        if last_seen is None:
            msg = f"{meter_name} ({meter_key}) disconnected: no valid data heartbeat found"
        else:
            msg = (
                f"{meter_name} ({meter_key}) disconnected: "
                f"last valid data at {last_seen} ({staleness} min stale, threshold {threshold} min)"
            )

        print(f"🚨 {msg}")

        recipients = get_active_recipient_emails()
        email_sent = False
        try:
            subject, body = build_email(
                event_type="disconnected",
                meter_name=meter_name,
                threshold_minutes=threshold,
                minutes_since_last_valid=staleness,
                event_time=now,
            )
            send_email_smtp(subject, body, recipients)
            email_sent = True
        except Exception as e:
            # log email failure but still mark state as disconnected
            err_msg = f"Email send failed for {meter_key}: {e}"
            print(f"❌ {err_msg}")
            insert_log(
                rule_id=rule.id,
                meter_key=meter_key,
                meter_type=meter_type,
                event_type="error",
                message=err_msg,
                observed_at=now,
                last_seen_at=last_seen,
                threshold_minutes=threshold,
                stale_minutes=staleness,
            )

        insert_log(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            event_type="disconnected",
            message=msg,
            observed_at=now,
            last_seen_at=last_seen,
            threshold_minutes=threshold,
            stale_minutes=staleness,
            email_sent=email_sent,
            email_recipient_count=len(recipients),
        )

        upsert_alarm_state(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            violating=True,
            last_seen_at=last_seen,
            disconnected_at=now,
            restored_at=prev.restored_at if prev else None,
            last_message=msg,
        )
        return

    # 2) RESTORED edge (one-shot)
    if (not is_disconnected) and was_disconnected:
        msg = f"{meter_name} ({meter_key}) restored: valid data heartbeat resumed at {last_seen}"
        print(f"✅ {msg}")

        recipients = get_active_recipient_emails()
        email_sent = False
        try:
            subject, body = build_email(
                event_type="restored",
                meter_name=meter_name,
                threshold_minutes=threshold,
                minutes_since_last_valid=staleness,
                event_time=now,
            )
            send_email_smtp(subject, body, recipients)
            email_sent = True
        except Exception as e:
            err_msg = f"Email send failed for {meter_key}: {e}"
            print(f"❌ {err_msg}")
            insert_log(
                rule_id=rule.id,
                meter_key=meter_key,
                meter_type=meter_type,
                event_type="error",
                message=err_msg,
                observed_at=now,
                last_seen_at=last_seen,
                threshold_minutes=threshold,
                stale_minutes=staleness,
            )

        insert_log(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            event_type="restored",
            message=msg,
            observed_at=now,
            last_seen_at=last_seen,
            threshold_minutes=threshold,
            stale_minutes=staleness,
            email_sent=email_sent,
            email_recipient_count=len(recipients),
        )

        upsert_alarm_state(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            violating=False,
            last_seen_at=last_seen,
            disconnected_at=prev.disconnected_at if prev else None,
            restored_at=now,
            last_message=msg,
        )
        return

    # 3) No edge -> always persist current state (including first healthy run)
    current_violating = was_disconnected  # unchanged if no edge
    current_disconnected_at = prev.disconnected_at if prev else None
    current_restored_at = prev.restored_at if prev else None
    current_last_message = prev.last_message if prev else None

    upsert_alarm_state(
        rule_id=rule.id,
        meter_key=meter_key,
        meter_type=meter_type,
        violating=current_violating,
        last_seen_at=last_seen,
        disconnected_at=current_disconnected_at,
        restored_at=current_restored_at,
        last_message=current_last_message,
    )


def run_detector() -> None:
    now = datetime.now()
    print(f"\n=== Notification detector run @ {now:%Y-%m-%d %H:%M:%S} ===")

    rules = get_enabled_disconnect_rules()
    if not rules:
        print("ℹ️ No enabled disconnect rules found.")
        return

    print(f"Loaded {len(rules)} rule(s).")

    for rule in rules:
        meters = expand_rule_meters(rule)
        if not meters:
            print(
                f"⚠️ Rule {rule.id} '{rule.rule_name}' matched no meters "
                f"(meter_type={rule.meter_type}, meter_key={rule.meter_key})"
            )
            continue

        print(
            f"Rule {rule.id}: {rule.rule_name} | "
            f"meter_type={rule.meter_type} | threshold={rule.threshold_minutes}m | "
            f"targets={len(meters)}"
        )

        for meter_type, meter_def in meters:
            evaluate_meter(rule, meter_type, meter_def, now)


if __name__ == "__main__":
    try:
        run_detector()
    except Exception as e:
        now = datetime.now()
        msg = f"Notification detector crashed: {e}"
        print(f"❌ {msg}")
        try:
            # meter_type enum requires one of building/inverter/weather; use weather as placeholder
            insert_log(
                rule_id=None,
                meter_key="system",
                meter_type="weather",
                event_type="error",
                message=msg,
                observed_at=now,
                last_seen_at=None,
                threshold_minutes=None,
                stale_minutes=None,
            )
        except Exception:
            pass
        raise
