# backend/notifications/emailer.py
import os
import smtplib
import ssl
from datetime import datetime
from email.message import EmailMessage
from typing import Optional, List
from zoneinfo import ZoneInfo

SITE_TZ = ZoneInfo("America/Los_Angeles")


def _fmt_site_time(dt: datetime) -> str:
    # If dt is naive, assume it is site time already
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=SITE_TZ)
    else:
        dt = dt.astimezone(SITE_TZ)
    return dt.strftime("%Y-%m-%d %H:%M:%S") + " America/Los_Angeles"


def build_email(
    *,
    event_type: str,  # disconnected | restored
    meter_name: str,
    grace_minutes: int,
    last_seen_at: Optional[datetime],
    event_time: datetime,
) -> tuple[str, str]:
    subject = f"[SIGI] {event_type.upper()}: {meter_name}"
    seen_str = _fmt_site_time(last_seen_at) if last_seen_at else "N/A"

    if event_type == "disconnected":
        lines = [
            f"Event: DISCONNECTED",
            f"Meter: {meter_name}",
            "",
            f"Last valid reading time: {seen_str}",
            f"Alert after: {grace_minutes} min no data",
            "",
            f"Site time: {_fmt_site_time(event_time)}",
        ]
    else:
        # restored
        lines = [
            f"Event: RESTORED",
            f"Meter: {meter_name}",
            "",
            f"Data resumed at: {seen_str}",
            "",
            f"Site time: {_fmt_site_time(event_time)}",
        ]

    return subject, "\n".join(lines)


def send_email_smtp(subject: str, body: str, recipients: List[str]) -> None:
    """
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
    tls_mode = os.getenv("SMTP_TLS", "ssl").lower()

    if not host or not from_addr:
        raise RuntimeError("SMTP not configured: set SMTP_HOST and SMTP_FROM")

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
        with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as server:
            if user and password:
                server.login(user, password)
            server.send_message(msg)


def build_batch_email(
    *,
    event_type: str,  # disconnected | restored
    category_name: str,  # Inverters / Buildings / Weather Stations
    meter_names: List[str],
    grace_minutes: int,
    event_time: datetime,
    last_seen_list: Optional[
        List[Optional[datetime]]
    ] = None,  # parallel to meter_names
) -> tuple[str, str]:
    subject = f"[SIGI] {event_type.upper()}: {category_name}"

    # Grace line (more natural)
    grace_line = f"Grace time: alert if no data for {grace_minutes} min"

    lines = [
        f"Event: {event_type.upper()}",
        f"Category: {category_name}",
        "",
        grace_line,
        "",
        "Affected meters:",
    ]

    if event_type == "disconnected" and last_seen_list is not None:
        for name, ts in zip(meter_names, last_seen_list):
            ts_str = _fmt_site_time(ts) if ts else "N/A"
            lines.append(f"- {name} (last seen: {ts_str})")
    else:
        lines.extend([f"- {n}" for n in meter_names])

    lines.extend(["", f"Site time: {_fmt_site_time(event_time)}"])
    return subject, "\n".join(lines)
