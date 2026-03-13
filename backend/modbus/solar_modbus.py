# modbus/solar_modbus.py

from pymodbus.client.tcp import ModbusTcpClient
from config import (
    MODBUS_IP,
    ADMIN_MODBUS_IP,
    PORT,
    ADMIN_UNIT_ID,
    B1086_NET_IP,
    B1200_NET_IP,
)
import struct
import time
from typing import Optional, Dict, Any

# ---------- Inverter Shark Meters (PV on MODBUS_IP) ----------

# Unit IDs mapped to logical labels used by pv_streamer.py
SHARK_DEVICES = {
    1: "sharkmeter1_1086_avg",
    2: "sharkmeter2_1200_avg",
    3: "sharkmeter3_1084_avg",
}

# All use Watts, 3-Ph total (FLOAT32) at this register pair
INVERTER_REGISTER = 0x03F9

# ---------- Admin Building Shark200 (on ADMIN_MODBUS_IP) ----------

ADMIN_NET_REGISTER = 0x057D  # Net Watts, 3-Ph total
EV_L3_REGISTER = 0x04B5  # EV L3 Watts
HVAC_WATTS_REGISTER = 0x05E1  # HVAC Watts
PLUG_WATTS_REGISTER = 0x0645  # Plugs Watts

# ---------- Building Net Shark200s (new) ----------

BUILDING_NET_REGISTER = 0x03F9  # Watts, 3-Ph total (FLOAT32)
BUILDING_NET_UNIT_ID = 1  # Shark 200 default

# ---------- Common ----------

MODBUS_TIMEOUT_S = 2


def _try_read_holding_registers(client, address: int, count: int, unit_id: int):
    """
    Try read_holding_registers with unit/slave/device_id kwarg names
    for compatibility across pymodbus 2.x / 3.x.
    Returns a response object or raises on complete failure.
    """
    for kw in ("unit", "slave", "device_id"):
        try:
            result = client.read_holding_registers(
                address=address,
                count=count,
                **{kw: unit_id},
            )
            if result is None:
                continue
            if hasattr(result, "isError") and result.isError():
                continue
            return result
        except TypeError:
            # This kw name not supported in this pymodbus version
            continue
        except Exception:
            # Transport / protocol error: let caller handle
            raise

    raise Exception(
        f"Modbus read (addr={hex(address)}, unit={unit_id}) failed for all kw formats"
    )


def read_float(client: ModbusTcpClient, address: int, unit_id: int) -> float:
    """
    Read two holding registers at `address` and interpret as big-endian IEEE754 float.
    Returns raw float (typically Watts). Raises on failure.
    """
    result = _try_read_holding_registers(
        client,
        address=address,
        count=2,
        unit_id=unit_id,
    )

    if not hasattr(result, "registers") or len(result.registers) < 2:
        raise Exception(
            f"Unexpected register response at {hex(address)} for device {unit_id}"
        )

    r0, r1 = result.registers[0], result.registers[1]
    raw_bytes = r0.to_bytes(2, "big") + r1.to_bytes(2, "big")

    try:
        return struct.unpack(">f", raw_bytes)[0]
    except Exception as e:
        raise Exception(
            f"Failed to unpack float at {hex(address)} for device {unit_id}: {e}"
        )


def read_kw(
    client: ModbusTcpClient,
    address: int,
    unit_id: int,
    *,
    safe: bool = True,
    label: str = "",
) -> Optional[float]:
    """
    Helper over read_float:
      - Reads FLOAT32 at (address, unit_id)
      - Converts Watts -> kW (2 decimals)
      - If safe=True: return None on error (and log).
      - If safe=False: propagate exception.
    """
    try:
        watts = read_float(client, address, unit_id)
        return round(watts / 1000.0, 2)
    except Exception as e:
        if not safe:
            raise
        if label:
            print(
                f"⚠️ read_kw failed [{label}]: addr={hex(address)} unit={unit_id}: {e}"
            )
        else:
            print(f"⚠️ read_kw failed: addr={hex(address)} unit={unit_id}: {e}")
        return None


# ---------- Inverter PV ----------


def read_inverter_power() -> Dict[str, Optional[float]]:
    """
    Read inverter meters on MODBUS_IP.
    Returns:
      - sharkmeter1_1086_avg (kW)
      - sharkmeter2_1200_avg (kW)
      - sharkmeter3_1084_avg (kW)
      - total_kw (kW, sum of valid inverters)
    """
    client = ModbusTcpClient(MODBUS_IP, port=PORT, timeout=MODBUS_TIMEOUT_S)

    try:
        if not client.connect():
            keys = list(SHARK_DEVICES.values()) + ["total_kw"]
            return {k: None for k in keys}

        results: Dict[str, Optional[float]] = {}
        total_watts = 0.0
        valid_count = 0

        for unit_id, label in SHARK_DEVICES.items():
            kw = read_kw(
                client,
                INVERTER_REGISTER,
                unit_id,
                safe=True,
                label=label,
            )
            results[label] = kw

            if isinstance(kw, (int, float)):
                total_watts += kw * 1000.0
                valid_count += 1

            time.sleep(0.2)  # avoid hammering the bus

        results["total_kw"] = (
            round(total_watts / 1000.0, 2) if valid_count > 0 else None
        )

        return results

    finally:
        try:
            client.close()
        except Exception:
            pass


# ---------- Admin building Shark200 ----------


def read_shark200_admin() -> Dict[str, Optional[float]]:
    """
    Read admin building Shark200 on ADMIN_MODBUS_IP.
    Returns:
      - admin_net_kw
      - net_flow_kw (alias of admin_net_kw)
      - ev_l3_kw
      - hvac_kw
      - plug_load_kw
    All values in kW or None.
    """
    client = ModbusTcpClient(ADMIN_MODBUS_IP, port=PORT, timeout=MODBUS_TIMEOUT_S)

    try:
        if not client.connect():
            return {
                "admin_net_kw": None,
                "net_flow_kw": None,
                "ev_l3_kw": None,
                "hvac_kw": None,
                "plug_load_kw": None,
            }

        admin_net = read_kw(
            client,
            ADMIN_NET_REGISTER,
            ADMIN_UNIT_ID,
            safe=True,
            label="admin_net",
        )
        ev_l3 = read_kw(
            client,
            EV_L3_REGISTER,
            ADMIN_UNIT_ID,
            safe=True,
            label="ev_l3",
        )
        hvac = read_kw(
            client,
            HVAC_WATTS_REGISTER,
            ADMIN_UNIT_ID,
            safe=True,
            label="hvac",
        )
        plug = read_kw(
            client,
            PLUG_WATTS_REGISTER,
            ADMIN_UNIT_ID,
            safe=True,
            label="plug",
        )

        return {
            "admin_net_kw": admin_net,
            "net_flow_kw": admin_net,
            "ev_l3_kw": ev_l3,
            "hvac_kw": hvac,
            "plug_load_kw": plug,
        }

    finally:
        try:
            client.close()
        except Exception:
            pass


# ---------- New Building Net Shark200s ----------


def read_building_nets() -> Dict[str, Optional[float]]:
    """
    Read net kW for buildings 1086 and 1200 from their Shark 200 meters
    using Watts, 3-Ph total at 0x03F9 with unit id 1.
    Returns:
      - b1086_net_kw
      - b1200_net_kw
    """
    out: Dict[str, Optional[float]] = {
        "b1086_net_kw": None,
        "b1200_net_kw": None,
    }

    # Building 1086
    client_1086 = ModbusTcpClient(B1086_NET_IP, port=PORT, timeout=MODBUS_TIMEOUT_S)
    try:
        if client_1086.connect():
            out["b1086_net_kw"] = read_kw(
                client_1086,
                BUILDING_NET_REGISTER,
                BUILDING_NET_UNIT_ID,
                safe=True,
                label="b1086_net",
            )
    finally:
        try:
            client_1086.close()
        except Exception:
            pass

    # Building 1200
    client_1200 = ModbusTcpClient(B1200_NET_IP, port=PORT, timeout=MODBUS_TIMEOUT_S)
    try:
        if client_1200.connect():
            out["b1200_net_kw"] = read_kw(
                client_1200,
                BUILDING_NET_REGISTER,
                BUILDING_NET_UNIT_ID,
                safe=True,
                label="b1200_net",
            )
    finally:
        try:
            client_1200.close()
        except Exception:
            pass

    return out


# ---------- Combined entrypoint used by pv_streamer.py ----------


def read_combined_power() -> Dict[str, Any]:
    """
    Aggregate all sources into a single dict for pv_streamer.py:
      - Inverter PV:
          sharkmeter1_1086_avg
          sharkmeter2_1200_avg
          sharkmeter3_1084_avg
          total_kw
      - Admin building:
          admin_net_kw, net_flow_kw, ev_l3_kw, hvac_kw, plug_load_kw
      - Building nets:
          b1086_net_kw, b1200_net_kw
    All in kW where applicable.
    """
    inverter_data = read_inverter_power()
    admin_data = read_shark200_admin()
    building_nets = read_building_nets()

    # Distinct keys, so later dicts won't clobber earlier ones.
    return {**inverter_data, **admin_data, **building_nets}
