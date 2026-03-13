from flask import Blueprint, jsonify, request
from datetime import datetime
from queries.solar import (
    get_pv_gen_today,
    get_pv_gen_last_3_days,
    get_pv_gen_last_7_days,
    get_pv_gen_last_30_days,
    get_pv_gen_last_365_days,
    get_latest_weather_data,
    get_last_7_days_weather,
    get_today_energy_summary,
    get_daily_summary,
    get_weather_by_range,
    get_latest_energy,
    get_pv_gen_by_range,
    get_demand_availability,
)

from queries.savings import (
    get_monthly_savings,
    get_latest_monthly_savings,
)

solar_bp = Blueprint("solar", __name__)


# ---------------------------
# API: Get PV + Net Load for Today
# ---------------------------
@solar_bp.route("/api/solar/today", methods=["GET"])
def solar_today():
    return jsonify(get_pv_gen_today())


# ---------------------------
# API: Get PV + Net Load for Last 3 Days
# ---------------------------
@solar_bp.route("/api/solar/3days", methods=["GET"])
def solar_last_3_days():
    return jsonify(get_pv_gen_last_3_days())


# ---------------------------
# API: Get PV + Net Load for Last 7 Days
# ---------------------------
@solar_bp.route("/api/solar/7days", methods=["GET"])
def solar_last_7_days():
    return jsonify(get_pv_gen_last_7_days())


# ---------------------------
# API: Get PV + Net Load for Last 30 Days
# ---------------------------
@solar_bp.route("/api/solar/30days", methods=["GET"])
def solar_this_month():
    return jsonify(get_pv_gen_last_30_days())


# ---------------------------
# API: Get PV + Net Load for Last 365 Days
# ---------------------------
@solar_bp.route("/api/solar/365days", methods=["GET"])
def solar_365_days():
    return jsonify(get_pv_gen_last_365_days())


# ---------------------------
# API: Get Latest Weather Station Data
# ---------------------------
@solar_bp.route("/api/solar/weather/latest", methods=["GET"])
def latest_weather_data():
    return jsonify(get_latest_weather_data())


# ---------------------------
# API: Get Last 7 Days of Weather Data
# ---------------------------
@solar_bp.route("/api/solar/weather/daily", methods=["GET"])
def daily_weather_data():
    return jsonify(get_last_7_days_weather())


@solar_bp.route("/api/solar/weather/<range_type>", methods=["GET"])
def weather_by_range(range_type):
    ranges = {
        "today": 0,
        "3days": 3,
        "7days": 7,
    }

    if range_type not in ranges:
        return (
            jsonify({"error": "Invalid range. Use one of: today, 3days, 7days."}),
            400,
        )

    data = get_weather_by_range(ranges[range_type])
    return jsonify(data)


# ---------------------------
# API: Get Today's Energy Summary
# ---------------------------
@solar_bp.route("/api/solar/sharks/energy", methods=["GET"])
def energy_today():
    return jsonify(get_today_energy_summary())


@solar_bp.route("/api/solar/sharks/energy/latest", methods=["GET"])
def energy_latest():
    row = get_latest_energy()
    # make timestamp JSON-friendly if it’s a datetime
    t = row.get("time")
    if hasattr(t, "isoformat"):
        row["time"] = t.isoformat()
    return jsonify(row)


# ---------------------------
# API: Get 7-Day Energy Summary for Trend View
# ---------------------------
# @solar_bp.route("/api/solar/daily-summary", methods=["GET"])
# def daily_energy_summary():
#     return jsonify(get_daily_summary())


@solar_bp.route("/api/solar/daily-summary", methods=["GET"])
def daily_energy_summary():
    # default to 7 for backward compatibility
    days = request.args.get("days", default=7, type=int)
    # guardrails
    days = max(1, min(days, 365))
    return jsonify(get_daily_summary(days))


@solar_bp.route("/api/solar/sharks/demand", methods=["GET"])
def sharks_demand():
    start = request.args.get("start")
    end = request.args.get("end")

    meta = get_demand_availability()

    if not start or not end:
        return jsonify(meta), 200

    try:
        rows = get_pv_gen_by_range(start, end)
        return jsonify({**meta, "rows": rows}), 200
    except ValueError as e:
        return jsonify({"error": str(e), **meta}), 400
    except Exception as e:
        # optional: log e for debugging
        return jsonify({"error": "database query failed", **meta}), 500


# ---------------------------
# API: Monthly Savings (from MySQL savings table)
# ---------------------------
@solar_bp.route("/api/solar/savings/months", methods=["GET"])
def savings_months():
    building = request.args.get("building", type=int)
    limit = request.args.get("limit", default=120, type=int)

    if not building:
        return jsonify({"error": "building is required (1084, 1086, 1200)"}), 400

    try:
        return jsonify(get_monthly_savings(building, limit)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        return jsonify({"error": "database query failed"}), 500


@solar_bp.route("/api/solar/savings/latest", methods=["GET"])
def savings_latest():
    building = request.args.get("building", type=int)

    if not building:
        return jsonify({"error": "building is required (1084, 1086, 1200)"}), 400

    try:
        row = get_latest_monthly_savings(building)
        if not row:
            return jsonify({"error": "not found"}), 404
        return jsonify(row), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception:
        return jsonify({"error": "database query failed"}), 500
