# queries/savings.py

from decimal import Decimal
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from queries.solar import execute_query  # reuse existing helper


def _json_safe(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def _json_safe_row(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    return {k: _json_safe(v) for k, v in row.items()}


def _json_safe_rows(rows: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    if not rows:
        return []
    return [{k: _json_safe(v) for k, v in r.items()} for r in rows]


# Building -> (table_name, ordered_columns)
SAVINGS_META: Dict[int, Tuple[str, List[str]]] = {
    1084: (
        "sigimicrogrid.b1084_savings_summary",
        [
            "month",
            "total_kw_w_pv",
            "total_kw_wo_pv",
            "pv_net_kwh",
            "total_kwh_w_pv",
            "total_kwh_wo_pv",
            "network_w_pv",
            "network_wo_pv",
            "total_kw_savings_$",
            "total_kwh_savings_$",
            "network_savings_$",
            "total_savings_$",
        ],
    ),
    1086: (
        "sigimicrogrid.b1086_savings_summary",
        [
            "month",
            "on_kw_w_pv",
            "mid_kw_w_pv",
            "off_kw_w_pv",
            "on_kw_wo_pv",
            "mid_kw_wo_pv",
            "off_kw_wo_pv",
            "on_kwh_w_pv",
            "mid_kwh_w_pv",
            "off_kwh_w_pv",
            "on_pv_kwh",
            "mid_pv_kwh",
            "off_pv_kwh",
            "on_kwh_wo_pv",
            "mid_kwh_wo_pv",
            "off_kwh_wo_pv",
            "total_kw_savings_$",
            "total_kwh_savings_$",
            "network_w_pv",
            "network_wo_pv",
            "network_savings_$",
            "total_savings_$",
        ],
    ),
    1200: (
        "sigimicrogrid.b1200_savings_summary",
        [
            "month",
            "on_kw_w_pv",
            "mid_kw_w_pv",
            "off_kw_w_pv",
            "on_kw_wo_pv",
            "mid_kw_wo_pv",
            "off_kw_wo_pv",
            "on_kwh_w_pv",
            "mid_kwh_w_pv",
            "off_kwh_w_pv",
            "on_pv_kwh",
            "mid_pv_kwh",
            "off_pv_kwh",
            "on_kwh_wo_pv",
            "mid_kwh_wo_pv",
            "off_kwh_wo_pv",
            "total_kw_savings_$",
            "total_kwh_savings_$",
            "network_w_pv",
            "network_wo_pv",
            "network_savings_$",
            "total_savings_$",
        ],
    ),
}


def _meta(building: int) -> Tuple[str, List[str]]:
    if building not in SAVINGS_META:
        raise ValueError("Invalid building. Use one of: 1084, 1086, 1200.")
    return SAVINGS_META[building]


def get_monthly_savings(building: int, limit: int = 120) -> List[Dict[str, Any]]:
    table, cols = _meta(building)
    limit = max(1, min(int(limit), 240))

    col_sql = ",\n            ".join(cols)
    sql = f"""
        SELECT
            {col_sql}
        FROM {table}
        ORDER BY month DESC
        LIMIT %s
    """
    rows = execute_query(sql, params=(limit,))
    return _json_safe_rows(rows)


def get_latest_monthly_savings(building: int) -> Optional[Dict[str, Any]]:
    table, cols = _meta(building)

    col_sql = ",\n            ".join(cols)
    sql = f"""
        SELECT
            {col_sql}
        FROM {table}
        ORDER BY month DESC
        LIMIT 1
    """
    row = execute_query(sql, fetch_one=True)
    return _json_safe_row(row)
