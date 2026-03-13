# backend/notifications/meters.py

METER_DEFS = {
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
        # Weather Station 1 (WS1)
        {
            "meter_key": "weather_ws1",
            "meter_name": "Weather Station 1",
            "source_table": "sigimicrogrid.weather_station_processed",
            "weather_non_null_any": [
                "wind_direction_deg",
                "predicted_power_kw",
                "cell_temp_f",
                "ambient_temp_f",
            ],
        },
        # Weather Station 2 (WS2) – radiation sensors
        {
            "meter_key": "weather_ws2",
            "meter_name": "Weather Station 2",
            "source_table": "sigimicrogrid.weather_station_processed",
            "weather_non_null_any": [
                "global_horizontal_radiation_wm2",
                "irradiance_wm2",
            ],
        },
    ],
}

ALL_TYPES = ("inverter", "building", "weather")
