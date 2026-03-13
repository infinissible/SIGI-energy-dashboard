# backend/notifications/worker.py
import time
from datetime import datetime, timedelta

from .detector import run_detector


def sleep_to_next_minute():
    now = datetime.now()
    next_minute = now.replace(second=0, microsecond=0) + timedelta(minutes=1)
    time.sleep(max(1, (next_minute - now).total_seconds()))


def main():
    print("✅ Notifications worker started")

    WARMUP_MINUTES = 5  # adjust (3–10 is typical)
    warmup_until = datetime.now() + timedelta(minutes=WARMUP_MINUTES)
    print(
        f"🕒 Warm-up enabled for {WARMUP_MINUTES} minutes (until {warmup_until:%Y-%m-%d %H:%M:%S})"
    )

    try:
        while True:
            try:
                in_warmup = datetime.now() < warmup_until
                run_detector(send_email=not in_warmup)
            except Exception as e:
                print(f"❌ Notifications worker error: {e}")
            sleep_to_next_minute()
    except KeyboardInterrupt:
        print("🛑 Notifications worker stopped (Ctrl+C)")


if __name__ == "__main__":
    main()
