from db import get_connection
from datetime import datetime, timedelta

DAY_MS = 24 * 60 * 60 * 1000


def execute_query(query, params=None, fetch_one=False):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)
    result = cursor.fetchone() if fetch_one else cursor.fetchall()
    cursor.close()
    conn.close()
    return result


def _parse_day_bounds(start_iso: str, end_iso: str):
    # local midnight boundaries (avoid UTC shift)
    start_dt = datetime.fromisoformat(start_iso)
    end_dt = datetime.fromisoformat(end_iso)
    start_ts = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_ts = end_dt.replace(hour=23, minute=59, second=59, microsecond=999000)
    return start_ts, end_ts


def get_demand_availability():
    row = execute_query(
        """
        SELECT DATE(MIN(timestamp)) AS earliest, DATE(MAX(timestamp)) AS latest
        FROM sigimicrogrid.sharks_demand_kw
    """,
        fetch_one=True,
    )
    return {
        "earliest": (
            row["earliest"].isoformat()
            if hasattr(row["earliest"], "isoformat")
            else str(row["earliest"])
        ),
        "latest": (
            row["latest"].isoformat()
            if hasattr(row["latest"], "isoformat")
            else str(row["latest"])
        ),
    }


# Used for admin fields: divide by 1000 and round to 2 decimals
def round2(val):
    return round(val / 1000, 2) if isinstance(val, (float, int)) else val


# Used for inverter fields already in kWh: just round to 2 decimals
def round_kwh(val):
    return round(val, 2) if isinstance(val, (float, int)) else val


def isoify_time(rows):
    for row in rows:
        if "time" in row and hasattr(row["time"], "isoformat"):
            row["time"] = row["time"].isoformat()
        for key, val in row.items():
            if key != "time" and isinstance(val, (float, int)):
                row[key] = round(val, 2)  # no /1000

    return rows


def safe_iso(val):
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, str):
        return val
    return None


def format_single_row(row):
    if not row:
        return None
    if "time" in row and hasattr(row["time"], "isoformat"):
        row["time"] = row["time"].isoformat()
    for key, val in row.items():
        if key != "time" and isinstance(val, (float, int)):
            row[key] = round2(val)
    return row


def get_pv_gen_data(interval_days):
    condition = (
        "DATE(timestamp) = CURDATE()"
        if interval_days == 0
        else f"timestamp >= NOW() - INTERVAL {interval_days} DAY"
    )

    query = f"""
        SELECT 
            timestamp AS time,
            InverterA_1086 AS pv_gen_1086,
            InverterB_1200 AS pv_gen_1200,
            InverterC_1084 AS pv_gen_1084,
            Inverter_total AS total_power,
            Admin_Net AS net_admin,
            B1086_Net AS b1086_net,
            B1200_Net AS b1200_net,
            EV_L3 AS ev_l3,
            Admin_HVAC AS admin_hvac,
            Admin_Plugs AS admin_plugs          
        FROM sigimicrogrid.sharks_demand_kw
        WHERE {condition}
        ORDER BY timestamp ASC
    """
    return isoify_time(execute_query(query))


def get_pv_gen_today():
    return get_pv_gen_data(0)


def get_pv_gen_last_3_days():
    return get_pv_gen_data(3)


def get_pv_gen_last_7_days():
    return get_pv_gen_data(7)


def get_pv_gen_last_30_days():
    return get_pv_gen_data(30)


def get_pv_gen_last_365_days():
    return get_pv_gen_data(365)


def format_number(value):
    return f"{value:,.2f}"


def get_pv_gen_by_range(start_iso: str, end_iso: str):
    start_dt, end_dt = _parse_day_bounds(start_iso, end_iso)
    if end_dt < start_dt:
        raise ValueError("end must be >= start")

    span_ms = int((end_dt - start_dt).total_seconds() * 1000) + 1
    span_days = span_ms / DAY_MS
    if span_days > 7.0 + 1e-9:
        raise ValueError("range must be <= 7 days")

    sql = """
        SELECT
            CAST(UNIX_TIMESTAMP(timestamp) * 1000 AS UNSIGNED) AS time,
            CAST(ROUND(InverterA_1086, 2) AS DOUBLE) AS pv_1086,
            CAST(ROUND(InverterB_1200, 2) AS DOUBLE) AS pv_1200,
            CAST(ROUND(InverterC_1084, 2) AS DOUBLE) AS pv_1084,
            CAST(ROUND(Inverter_total, 2) AS DOUBLE) AS total_power,
            CAST(ROUND(Admin_Net, 2) AS DOUBLE)     AS net_admin,
            CAST(ROUND(B1086_Net, 2) AS DOUBLE)     AS b1086_net,
            CAST(ROUND(B1200_Net, 2) AS DOUBLE)     AS b1200_net,
            CAST(ROUND(EV_L3, 2) AS DOUBLE)         AS ev_l3,
            CAST(ROUND(Admin_HVAC, 2) AS DOUBLE)    AS admin_hvac,
            CAST(ROUND(Admin_Plugs, 2) AS DOUBLE)   AS admin_plugs
        FROM sigimicrogrid.sharks_demand_kw
        WHERE timestamp >= %s AND timestamp <= %s
        ORDER BY timestamp ASC
    """
    return execute_query(sql, params=(start_dt, end_dt))


def get_latest_weather_data():
    query = """
        SELECT
            timestamp AS time,
            ROUND((ambient_temp_f - 32) * 5/9, 2) AS ambient_temp_c,
            ROUND((cell_temp_f    - 32) * 5/9, 2) AS cell_temp_c,
            ROUND(global_horizontal_radiation_wm2, 2) AS ghr_wm2,
            ROUND(irradiance_wm2, 2) AS irradiance_wm2
        FROM sigimicrogrid.weather_station_processed
        ORDER BY timestamp DESC
        LIMIT 1
    """
    row = execute_query(query, fetch_one=True)
    if not row:
        return None

    t = row["time"]
    return {
        "time": t.isoformat() if hasattr(t, "isoformat") else str(t),
        "ambient_temp_c": (
            float(row["ambient_temp_c"]) if row["ambient_temp_c"] is not None else None
        ),
        "cell_temp_c": (
            float(row["cell_temp_c"]) if row["cell_temp_c"] is not None else None
        ),
        "ghr_wm2": float(row["ghr_wm2"]) if row["ghr_wm2"] is not None else None,
        "irradiance_wm2": (
            float(row["irradiance_wm2"]) if row["irradiance_wm2"] is not None else None
        ),
    }


def get_last_7_days_weather():
    query = """
        SELECT
            DATE_FORMAT(date_local, '%Y-%m-%d') AS date,
            ambient_min_c, ambient_max_c, ambient_avg_c,
            cell_min_c, cell_max_c, cell_avg_c,
            ghr_min_wm2, ghr_max_wm2, ghr_avg_wm2,
            irr_min_wm2, irr_max_wm2, irr_avg_wm2,
            samples_count, completeness_pct,
            DATE_FORMAT(updated_at_local, '%Y-%m-%d %H:%i:%s') AS updated_at_local
        FROM sigimicrogrid.weather_station_daily
        ORDER BY date_local DESC
        LIMIT 7
    """
    rows = execute_query(query)
    return list(reversed(rows)) if rows else []


def get_weather_by_range(interval_days: int):
    # interval_days: 0=today, 3=last 3 days (midnight 2 days ago → end of today), 7=last 7 days, ...
    if interval_days == 0:
        # [today 00:00, tomorrow 00:00)
        condition = """
            timestamp >= DATE(NOW()) AND timestamp < DATE(NOW()) + INTERVAL 1 DAY
        """
    else:
        # [local midnight (days-1) ago, tomorrow 00:00)
        condition = f"""
            timestamp >= DATE(NOW()) - INTERVAL {interval_days - 1} DAY
            AND timestamp < DATE(NOW()) + INTERVAL 1 DAY
        """

    query = f"""
        SELECT
            UNIX_TIMESTAMP(timestamp) * 1000 AS time,  -- epoch ms (LOCAL)
            ROUND((ambient_temp_f - 32) * 5/9, 2) AS ambient_temp_c,
            ROUND((cell_temp_f - 32) * 5/9, 2) AS cell_temp_c,
            ROUND(global_horizontal_radiation_wm2, 2) AS ghr_wm2,
            ROUND(irradiance_wm2, 2) AS irradiance_wm2
        FROM sigimicrogrid.weather_station_processed
        WHERE {condition}
        ORDER BY timestamp ASC
    """
    # IMPORTANT: do NOT re-ISO 'time' here; it's already a number.
    return execute_query(query)


def get_latest_energy():

    query = """
        SELECT
            timestamp AS time,
            InverterA_1086_received,
            InverterA_1086_delivered,
            InverterA_1086_net,
            InverterA_1086_total,
            InverterB_1200_received,
            InverterB_1200_delivered,
            InverterB_1200_net,
            InverterB_1200_total,
            InverterC_1084_received,
            InverterC_1084_delivered,
            InverterC_1084_net,
            InverterC_1084_total,
            Admin_1084_received,
            Admin_1084_delivered,
            Admin_1084_net,
            Admin_1084_total,
            EV_L3_net,
            EV_L3_total,
            B1086_received,
            B1086_delivered,
            B1086_net,
            B1086_total,
            B1200_received,
            B1200_delivered,
            B1200_net,
            B1200_total
        FROM sigimicrogrid.sharks_energy_kwh
        ORDER BY timestamp DESC
        LIMIT 1
    """
    row = execute_query(query, fetch_one=True)
    if not row:
        return {"error": "No data"}

    def n(x):
        return None if x is None else float(x)

    return row


def get_today_energy_summary():
    # Step 1: Get first and last rows for today with all key values present
    query = """
        SELECT 
            MIN(timestamp) AS start_time,
            MAX(timestamp) AS end_time
        FROM sigimicrogrid.sharks_energy_kwh
        WHERE DATE(timestamp) = CURDATE()
        AND InverterC_1084_delivered IS NOT NULL
        AND Admin_1084_received IS NOT NULL
        AND Admin_1084_delivered IS NOT NULL
        AND B1086_received IS NOT NULL
        AND B1086_delivered IS NOT NULL
        AND B1200_received IS NOT NULL
        AND B1200_delivered IS NOT NULL
    """
    time_bounds = execute_query(query, fetch_one=True)

    if not time_bounds or not time_bounds["start_time"] or not time_bounds["end_time"]:
        return {"error": "No valid data for today"}

    # Step 2: Fetch the two boundary rows
    data_query = f"""
        SELECT 
            timestamp AS time,
            InverterC_1084_received,
            InverterC_1084_delivered,
            InverterC_1084_total,
            InverterC_1084_net,
            InverterA_1086_received,
            InverterA_1086_delivered,
            InverterA_1086_total,
            InverterA_1086_net,
            InverterB_1200_received,
            InverterB_1200_delivered,
            InverterB_1200_total,
            InverterB_1200_net,
            Admin_1084_received,
            Admin_1084_delivered,
            Admin_1084_total,
            Admin_1084_net,
            B1086_received,
            B1086_delivered,
            B1086_total,
            B1086_net,
            B1200_received,
            B1200_delivered,
            B1200_total,
            B1200_net
        FROM sigimicrogrid.sharks_energy_kwh
        WHERE timestamp IN ('{time_bounds["start_time"]}', '{time_bounds["end_time"]}')
        ORDER BY timestamp
    """
    rows = execute_query(data_query)

    if not rows or len(rows) != 2:
        return {"error": "Insufficient data for delta calculation"}

    first, last = rows[0], rows[1]

    def delta(val1, val2):
        try:
            return round(val2 - val1, 2)
        except:
            return 0.0

    return {
        "time_start": safe_iso(first["time"]),
        "time_end": safe_iso(last["time"]),
        # Inverter 1084 (C)
        "e_1084_received_kwh": delta(
            first["InverterC_1084_received"], last["InverterC_1084_received"]
        ),
        "e_1084_delivered_kwh": delta(
            first["InverterC_1084_delivered"], last["InverterC_1084_delivered"]
        ),
        "e_1084_total_kwh": delta(
            first["InverterC_1084_total"], last["InverterC_1084_total"]
        ),
        "e_1084_net_kwh": delta(
            first["InverterC_1084_net"], last["InverterC_1084_net"]
        ),
        # Inverter 1086 (A)
        "e_1086_received_kwh": delta(
            first["InverterA_1086_received"], last["InverterA_1086_received"]
        ),
        "e_1086_delivered_kwh": delta(
            first["InverterA_1086_delivered"], last["InverterA_1086_delivered"]
        ),
        "e_1086_total_kwh": delta(
            first["InverterA_1086_total"], last["InverterA_1086_total"]
        ),
        "e_1086_net_kwh": delta(
            first["InverterA_1086_net"], last["InverterA_1086_net"]
        ),
        # Inverter 1200 (B)
        "e_1200_received_kwh": delta(
            first["InverterB_1200_received"], last["InverterB_1200_received"]
        ),
        "e_1200_delivered_kwh": delta(
            first["InverterB_1200_delivered"], last["InverterB_1200_delivered"]
        ),
        "e_1200_total_kwh": delta(
            first["InverterB_1200_total"], last["InverterB_1200_total"]
        ),
        "e_1200_net_kwh": delta(
            first["InverterB_1200_net"], last["InverterB_1200_net"]
        ),
        # Admin Building (Already in kWh, no conversion)
        "e_admin_received_kwh": delta(
            first["Admin_1084_received"], last["Admin_1084_received"]
        ),
        "e_admin_delivered_kwh": delta(
            first["Admin_1084_delivered"], last["Admin_1084_delivered"]
        ),
        "e_admin_total_kwh": delta(first["Admin_1084_total"], last["Admin_1084_total"]),
        "e_admin_net_kwh": delta(first["Admin_1084_net"], last["Admin_1084_net"]),
        # New Building meters: B1086
        "e_b1086_received_kwh": delta(first["B1086_received"], last["B1086_received"]),
        "e_b1086_delivered_kwh": delta(
            first["B1086_delivered"], last["B1086_delivered"]
        ),
        "e_b1086_total_kwh": delta(first["B1086_total"], last["B1086_total"]),
        "e_b1086_net_kwh": delta(first["B1086_net"], last["B1086_net"]),
        # New Building meters: B1200
        "e_b1200_received_kwh": delta(first["B1200_received"], last["B1200_received"]),
        "e_b1200_delivered_kwh": delta(
            first["B1200_delivered"], last["B1200_delivered"]
        ),
        "e_b1200_total_kwh": delta(first["B1200_total"], last["B1200_total"]),
        "e_b1200_net_kwh": delta(first["B1200_net"], last["B1200_net"]),
        # Admin consumption logic
        "admin_total_consumption_kwh": round(
            delta(first["InverterC_1084_delivered"], last["InverterC_1084_delivered"])
            + delta(first["Admin_1084_net"], last["Admin_1084_net"]),
            2,
        ),
        "pv_supplied_kwh": delta(
            first["InverterC_1084_delivered"], last["InverterC_1084_delivered"]
        ),
        "exported_kwh": delta(
            first["Admin_1084_delivered"], last["Admin_1084_delivered"]
        ),
        # B1086 consumption logic (Inverter A + B1086 meter)
        "b1086_total_consumption_kwh": round(
            delta(first["InverterA_1086_delivered"], last["InverterA_1086_delivered"])
            + delta(first["B1086_net"], last["B1086_net"]),
            2,
        ),
        "b1086_pv_supplied_kwh": delta(
            first["InverterA_1086_delivered"], last["InverterA_1086_delivered"]
        ),
        "b1086_exported_kwh": delta(first["B1086_delivered"], last["B1086_delivered"]),
        # B1200 consumption logic (Inverter B + B1200 meter)
        "b1200_total_consumption_kwh": round(
            delta(first["InverterB_1200_delivered"], last["InverterB_1200_delivered"])
            + delta(first["B1200_net"], last["B1200_net"]),
            2,
        ),
        "b1200_pv_supplied_kwh": delta(
            first["InverterB_1200_delivered"], last["InverterB_1200_delivered"]
        ),
        "b1200_exported_kwh": delta(first["B1200_delivered"], last["B1200_delivered"]),
    }


def get_daily_summary(days: int | None = None):
    where = ""
    if days is not None:
        days = max(1, int(days))
        lookback = days - 1
        where = f"WHERE `date` >= (CURDATE() - INTERVAL {lookback} DAY)"

    query = f"""
        SELECT 
            `date`,
            inverter_c_delivered_kwh AS PV_generated,
            admin_received_kwh AS consumed,
            admin_delivered_kwh AS exported,
            admin_net_kwh AS admin_net,
            -- New building B1086 (linked to Inverter A)
            inverter_a_delivered_kwh AS b1086_pv_generated,
            b1086_delivered_kwh      AS b1086_exported,
            b1086_net_kwh            AS b1086_net,
            -- New building B1200 (linked to Inverter B)
            inverter_b_delivered_kwh AS b1200_pv_generated,
            b1200_delivered_kwh      AS b1200_exported,
            b1200_net_kwh            AS b1200_net
        FROM sigimicrogrid.sharks_daily_summary
        {where}
        ORDER BY `date` ASC
    """
    rows = execute_query(query)
    if not rows:
        return []

    formatted = []
    for row in rows:
        date_obj = row["date"]
        label = (
            date_obj.strftime("%b %d, %Y")
            if hasattr(date_obj, "strftime")
            else str(date_obj)
        )

        pv_generated = row["PV_generated"] or 0
        # Match today-energy logic: consumption = inverter_1084_delivered + admin_net
        consumed_kwh = (pv_generated) + (row["admin_net"] or 0)
        exported_kwh = (
            abs(row["exported"]) if isinstance(row["exported"], (int, float)) else 0.0
        )
        savings = (pv_generated - exported_kwh) * 0.25

        # --- B1086 building (Inverter A + B1086 meter) ---
        b1086_pv_generated = row.get("b1086_pv_generated") or 0
        b1086_consumed_kwh = b1086_pv_generated + (row.get("b1086_net") or 0)
        b1086_exported_kwh = (
            abs(row.get("b1086_exported"))
            if isinstance(row.get("b1086_exported"), (int, float))
            else 0.0
        )
        b1086_savings = (b1086_pv_generated - b1086_exported_kwh) * 0.25

        # --- B1200 building (Inverter B + B1200 meter) ---
        b1200_pv_generated = row.get("b1200_pv_generated") or 0
        b1200_consumed_kwh = b1200_pv_generated + (row.get("b1200_net") or 0)
        b1200_exported_kwh = (
            abs(row.get("b1200_exported"))
            if isinstance(row.get("b1200_exported"), (int, float))
            else 0.0
        )
        b1200_savings = (b1200_pv_generated - b1200_exported_kwh) * 0.25

        formatted.append(
            {
                "date": label,
                # Admin (backward compatible)
                "PV_generated": round_kwh(pv_generated),
                "consumed": round_kwh(consumed_kwh),
                "exported": round_kwh(exported_kwh),
                "savings": round_kwh(savings),
                # New: B1086 building
                "b1086_PV_generated": round_kwh(b1086_pv_generated),
                "b1086_consumed": round_kwh(b1086_consumed_kwh),
                "b1086_exported": round_kwh(b1086_exported_kwh),
                "b1086_savings": round_kwh(b1086_savings),
                # New: B1200 building
                "b1200_PV_generated": round_kwh(b1200_pv_generated),
                "b1200_consumed": round_kwh(b1200_consumed_kwh),
                "b1200_exported": round_kwh(b1200_exported_kwh),
                "b1200_savings": round_kwh(b1200_savings),
            }
        )
    return formatted
