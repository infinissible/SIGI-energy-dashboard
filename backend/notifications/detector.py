# backend/notifications/detector.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

from . import repo
from .emailer import send_email_smtp, build_batch_email


CATEGORY_LABEL = {
    "inverter": "Inverters",
    "building": "Buildings",
    "weather": "Weather Stations",
}


@dataclass
class EdgeEvent:
    event_type: str  # disconnected | restored
    meter_type: str  # inverter | building | weather
    meter_name: str
    log_id: int
    grace_minutes: int
    last_seen_at: Optional[datetime]


def compute_minutes_since_last_valid(
    now: datetime, last_seen: Optional[datetime]
) -> Optional[int]:
    if last_seen is None:
        return None
    diff = now - last_seen
    return max(0, int(diff.total_seconds() // 60))


def evaluate_meter(
    rule: repo.Rule,
    meter_type: str,
    meter_def: Dict[str, Any],
    now: datetime,
) -> Optional[EdgeEvent]:
    meter_key = meter_def["meter_key"]
    meter_name = meter_def["meter_name"]
    grace = int(rule.grace_minutes)

    # Heartbeat
    try:
        last_seen = repo.get_meter_last_seen(meter_def)
    except Exception as e:
        print(f"❌ Heartbeat query failed for {meter_key}: {e}")
        repo.insert_log(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            event_type="error",
            detected_at=now,
            last_seen_at=None,
            email_sent=False,
            email_recipient_count=0,
        )
        return None

    minutes_since = compute_minutes_since_last_valid(now, last_seen)

    # disconnected if no heartbeat OR gap >= grace
    is_disconnected_now = (last_seen is None) or (
        minutes_since is not None and minutes_since >= grace
    )

    prev = repo.get_alarm_state(rule.id, meter_key)
    was_disconnected = bool(prev.is_disconnected) if prev else False

    # 1) DISCONNECTED edge
    if is_disconnected_now and not was_disconnected:
        print(f"🚨 DISCONNECTED edge: {meter_name}")

        log_id = repo.insert_log(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            event_type="disconnected",
            detected_at=now,
            last_seen_at=last_seen,
            email_sent=False,
            email_recipient_count=0,
        )

        repo.upsert_alarm_state(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            is_disconnected=True,
            last_seen_at=last_seen,
        )

        return EdgeEvent(
            event_type="disconnected",
            meter_type=meter_type,
            meter_name=meter_name,
            log_id=log_id,
            grace_minutes=grace,
            last_seen_at=last_seen,
        )

    # 2) RESTORED edge
    if (not is_disconnected_now) and was_disconnected:
        # If restored notifications disabled for this rule, just flip state without creating restored event
        if not rule.restored_enabled:
            repo.upsert_alarm_state(
                rule_id=rule.id,
                meter_key=meter_key,
                meter_type=meter_type,
                is_disconnected=False,
                last_seen_at=last_seen,
            )
            return None

        print(f"✅ RESTORED edge: {meter_name}")

        log_id = repo.insert_log(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            event_type="restored",
            detected_at=now,
            last_seen_at=last_seen,
            email_sent=False,
            email_recipient_count=0,
        )

        repo.upsert_alarm_state(
            rule_id=rule.id,
            meter_key=meter_key,
            meter_type=meter_type,
            is_disconnected=False,
            last_seen_at=last_seen,
        )

        return EdgeEvent(
            event_type="restored",
            meter_type=meter_type,
            meter_name=meter_name,
            log_id=log_id,
            grace_minutes=grace,
            last_seen_at=last_seen,
        )

    # 3) No edge: always persist state
    repo.upsert_alarm_state(
        rule_id=rule.id,
        meter_key=meter_key,
        meter_type=meter_type,
        is_disconnected=was_disconnected,
        last_seen_at=last_seen,
    )
    return None


def run_detector(*, send_email: bool = True) -> None:
    now = datetime.now()
    print(f"\n=== Notifications detector run @ {now:%Y-%m-%d %H:%M:%S} ===")

    rules = repo.get_enabled_rules()
    if not rules:
        print("No enabled rules found.")
        return

    checked = 0
    edge_events: List[EdgeEvent] = []

    for rule in rules:
        meters = repo.expand_rule_meters(rule)
        for meter_type, meter_def in meters:
            checked += 1
            ev = evaluate_meter(rule, meter_type, meter_def, now)
            if ev:
                edge_events.append(ev)

    print(f"Checked {checked} meter-rule targets; edges {len(edge_events)}.")

    # Warm-up: no emails
    if not send_email:
        if edge_events:
            print("🕒 Warm-up active: edges detected but emails suppressed.")
        return

    if not edge_events:
        return

    recipients = repo.get_active_recipient_emails()
    if not recipients:
        print("⚠️ No active recipients; batch emails not sent.")
        return

    # Group by (event_type, meter_type)
    buckets: Dict[Tuple[str, str], List[EdgeEvent]] = {}
    for ev in edge_events:
        buckets.setdefault((ev.event_type, ev.meter_type), []).append(ev)

    for (event_type, meter_type), evs in buckets.items():
        category_name = CATEGORY_LABEL.get(meter_type, meter_type)
        meter_names = [e.meter_name for e in evs]
        log_ids = [e.log_id for e in evs]
        last_seen_list = [e.last_seen_at for e in evs]

        grace_minutes = evs[0].grace_minutes  # same within this bucket

        subject, body = build_batch_email(
            event_type=event_type,
            category_name=category_name,
            meter_names=meter_names,
            grace_minutes=grace_minutes,
            event_time=now,
            last_seen_list=last_seen_list,
        )

        try:
            send_email_smtp(subject, body, recipients)
            repo.mark_logs_emailed(log_ids, recipient_count=len(recipients))
            print(f"📧 Sent {event_type} batch for {category_name}: {len(evs)} meters")
        except Exception as e:
            print(f"❌ Batch email failed ({event_type}/{category_name}): {e}")
            # optional: insert an error log row (not required)
