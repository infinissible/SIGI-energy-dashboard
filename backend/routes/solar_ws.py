# pv_streamer.py
import time
import csv
from pathlib import Path
from flask_socketio import emit
from modbus.solar_modbus import read_combined_power  # unchanged import path
from collections import defaultdict, deque
from statistics import mean
from datetime import datetime
from db import get_connection
from config import LOG_BASE_PATH

# Rolling buffer for 60 seconds of readings; buffers store numbers OR None
power_buffers = defaultdict(lambda: deque(maxlen=60))
last_insert_time = time.time()

# CSV log folder
CSV_DIR = Path(LOG_BASE_PATH) / "sharks"
CSV_DIR.mkdir(parents=True, exist_ok=True)


def insert_1min_avg_to_db(avg_data, timestamp):
    conn = get_connection()
    if not conn:
        print("❌ Skipping DB insert due to connection error.")
        return

    try:
        cursor = conn.cursor()
        sql = """
        INSERT INTO sigimicrogrid.sharks_demand_kw
            (timestamp, InverterA_1086, InverterB_1200, InverterC_1084, Inverter_total, Admin_Net, B1086_Net, B1200_Net, EV_L3, Admin_HVAC, Admin_Plugs)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            InverterA_1086=VALUES(InverterA_1086),
            InverterB_1200=VALUES(InverterB_1200),
            InverterC_1084=VALUES(InverterC_1084),
            Inverter_total=VALUES(Inverter_total),
            Admin_Net=VALUES(Admin_Net),
            B1086_Net=VALUES(B1086_Net), 
            B1200_Net=VALUES(B1200_Net),
            EV_L3=VALUES(EV_L3),
            Admin_HVAC=VALUES(Admin_HVAC),
            Admin_Plugs=VALUES(Admin_Plugs)
        """
        values = (
            timestamp.strftime("%Y-%m-%d %H:%M:00"),
            avg_data.get("sharkmeter1_1086_avg"),
            avg_data.get("sharkmeter2_1200_avg"),
            avg_data.get("sharkmeter3_1084_avg"),
            avg_data.get("total_kw"),
            avg_data.get("admin_net_kw"),
            avg_data.get("b1086_net_kw"),
            avg_data.get("b1200_net_kw"),
            avg_data.get("ev_l3_kw"),
            avg_data.get("hvac_kw"),
            avg_data.get("plug_load_kw"),
        )
        cursor.execute(sql, values)
        conn.commit()
        print(f"✅ Inserted to MySQL: {timestamp}")
    except Exception as e:
        print("❌ MySQL insert error:", e)
    finally:
        try:
            cursor.close()
            conn.close()
        except Exception:
            pass


def write_avg_to_csv(avg_data, timestamp):
    filename = f"sharks_websocket_{timestamp.strftime('%m%d%Y')}.csv"
    filepath = CSV_DIR / filename

    # Use fieldnames exactly as in the database
    fieldnames = [
        "timestamp",
        "InverterA_1086",
        "InverterB_1200",
        "InverterC_1084",
        "Inverter_total",
        "Admin_Net",
        "B1086_Net",
        "B1200_Net",
        "EV_L3",
        "Admin_HVAC",
        "Admin_Plugs",
    ]

    # Convert None -> empty string so CSV cell is blank rather than 'None'
    def maybe_empty(x):
        return "" if x is None else x

    row = {
        "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
        "InverterA_1086": maybe_empty(avg_data.get("sharkmeter1_1086_avg")),
        "InverterB_1200": maybe_empty(avg_data.get("sharkmeter2_1200_avg")),
        "InverterC_1084": maybe_empty(avg_data.get("sharkmeter3_1084_avg")),
        "Inverter_total": maybe_empty(avg_data.get("total_kw")),
        "Admin_Net": maybe_empty(avg_data.get("admin_net_kw")),
        "B1086_Net": maybe_empty(avg_data.get("b1086_net_kw")),
        "B1200_Net": maybe_empty(avg_data.get("b1200_net_kw")),
        "EV_L3": maybe_empty(avg_data.get("ev_l3_kw")),
        "Admin_HVAC": maybe_empty(avg_data.get("hvac_kw")),
        "Admin_Plugs": maybe_empty(avg_data.get("plug_load_kw")),
    }

    write_header = not filepath.exists()

    try:
        with open(filepath, "a", newline="") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            if write_header:
                writer.writeheader()
            writer.writerow(row)
        print(f"📝 Appended to CSV: {filepath.name}")
    except Exception as e:
        print("❌ CSV write error:", e)


def setup_ws_events(socketio):
    @socketio.on("connect")
    def handle_connect():
        print("Client connected")

    @socketio.on("disconnect")
    def handle_disconnect():
        print("Client disconnected")

    def stream_pv_data():
        global last_insert_time

        # We will emit an "emitted_data" payload derived from the raw read,
        # but using last_emitted_values to keep the UI stable on read failure.
        while True:
            data = read_combined_power()

            # Compute a raw current_load for logging (use raw None if missing)
            raw_admin_net = data.get("admin_net_kw")
            raw_inv_c = data.get("sharkmeter3_1084_avg")
            if isinstance(raw_admin_net, (int, float)) and isinstance(
                raw_inv_c, (int, float)
            ):
                data["admin_load_kw"] = round(raw_admin_net + raw_inv_c, 2)
            else:
                # If either is missing, set None (so DB/CSV records NULL)
                data["admin_load_kw"] = None

            # NEW: Compute Building 1086 load: PV A + B1086 net
            raw_b1086_net = data.get("b1086_net_kw")
            raw_inv_a = data.get("sharkmeter1_1086_avg")
            if isinstance(raw_b1086_net, (int, float)) and isinstance(
                raw_inv_a, (int, float)
            ):
                data["b1086_load_kw"] = round(raw_b1086_net + raw_inv_a, 2)
            else:
                data["b1086_load_kw"] = None

            # NEW: Compute Building 1200 load: PV B + B1200 net
            raw_b1200_net = data.get("b1200_net_kw")
            raw_inv_b = data.get("sharkmeter2_1200_avg")
            if isinstance(raw_b1200_net, (int, float)) and isinstance(
                raw_inv_b, (int, float)
            ):
                data["b1200_load_kw"] = round(raw_b1200_net + raw_inv_b, 2)
            else:
                data["b1200_load_kw"] = None

            # emit display and raw only; no *_online flag
            emitted_data = dict(data)
            for key in [
                "sharkmeter1_1086_avg",
                "sharkmeter2_1200_avg",
                "sharkmeter3_1084_avg",
                "total_kw",
                "admin_net_kw",
                "admin_load_kw",
                "b1086_net_kw",
                "b1086_load_kw",
                "b1200_net_kw",
                "b1200_load_kw",
                "ev_l3_kw",
                "hvac_kw",
                "plug_load_kw",
            ]:
                raw_val = data.get(key)
                if isinstance(raw_val, (int, float)):
                    emitted_data[key] = round(float(raw_val), 2)
                else:
                    emitted_data[key] = None

            print("📡 Emitting data (UI-friendly):", emitted_data)
            socketio.emit("pv_data", emitted_data)

            # Store current values to buffer (store numeric OR None)
            for key in [
                "sharkmeter1_1086_avg",
                "sharkmeter2_1200_avg",
                "sharkmeter3_1084_avg",
                "total_kw",
                "admin_net_kw",
                "admin_load_kw",
                "b1086_net_kw",
                "b1086_load_kw",
                "b1200_net_kw",
                "b1200_load_kw",
                "ev_l3_kw",
                "hvac_kw",
                "plug_load_kw",
            ]:
                value = data.get(key)
                # Append numeric OR None (so buffer length still advances)
                if isinstance(value, (int, float)):
                    power_buffers[key].append(value)
                else:
                    power_buffers[key].append(None)

            # Every 60 seconds, compute and print averages (ignore None samples)
            if time.time() - last_insert_time >= 60:
                timestamp = datetime.now()
                rounded_time = timestamp.replace(second=0, microsecond=0)

                averages = {}
                for key, buf in power_buffers.items():
                    numeric_vals = [v for v in buf if isinstance(v, (int, float))]
                    if numeric_vals:
                        averages[key] = round(mean(numeric_vals), 2)
                    else:
                        averages[key] = (
                            None  # explicitly log NULL if no numeric samples
                        )

                print(
                    f"\n📊 [AVG @ {timestamp.strftime('%Y-%m-%d %H:%M:%S')}] 1-minute averages:"
                )
                for k, v in averages.items():
                    print(f"  {k}: {v if v is not None else 'NULL'} kW")

                insert_1min_avg_to_db(averages, rounded_time)
                write_avg_to_csv(averages, rounded_time)

                last_insert_time = time.time()

            time.sleep(1)

    # Start background task when server runs
    socketio.start_background_task(stream_pv_data)
