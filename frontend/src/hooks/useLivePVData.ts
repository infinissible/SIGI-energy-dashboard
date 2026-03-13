// hooks/useLivePVData.ts
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type InverterOutput = {
  name: string;
  value: string; // "NN.NN" or "—"
  online?: boolean; // true if backend raw read was numeric
};

type PVData = {
  loading: boolean;
  totalKW: string;

  // Per inverter
  inverterA: string;
  inverterB: string;
  inverterC: string;

  // Admin building (1084)
  adminLoad: string;
  netFlow: string; // Admin net flow (to/from grid)

  // Building 1086
  b1086Net: string; // b1086_net_kw
  b1086Load: string; // b1086_load_kw

  // Building 1200
  b1200Net: string; // b1200_net_kw
  b1200Load: string; // b1200_load_kw

  inverters: InverterOutput[];
  utilizationPercent: string;
  systemStatus: string;
  evL3KW: string;
  hvacKW: string;
  plugKW: string;
};

export default function useLivePVData(): PVData {
  const [loading, setLoading] = useState(true);

  // display placeholders
  const [totalKW, setTotalKW] = useState("—");
  const [inverterA, setInverterA] = useState("—");
  const [inverterB, setInverterB] = useState("—");
  const [inverterC, setInverterC] = useState("—");

  const [adminLoad, setAdminLoad] = useState("—");
  const [netFlow, setNetFlow] = useState("—"); // admin_net_kw

  const [b1086Net, setB1086Net] = useState("—");
  const [b1086Load, setB1086Load] = useState("—");

  const [b1200Net, setB1200Net] = useState("—");
  const [b1200Load, setB1200Load] = useState("—");

  const [inverters, setInverters] = useState<InverterOutput[]>([]);
  const [utilizationPercent, setUtilizationPercent] = useState("—");
  const [systemStatus, setSystemStatus] = useState("Nighttime");
  const [evL3KW, setEvL3KW] = useState("—");
  const [hvacKW, setHvacKW] = useState("—");
  const [plugKW, setPlugKW] = useState("—");

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    const socketPath = import.meta.env.VITE_SOCKET_PATH || undefined;

    const socket: Socket = io(socketUrl, {
      path: socketPath,
      transports: ["polling"],
    });

    // helper: convert numeric or null to display string
    const toDisplay = (raw: any) =>
      raw == null ? "—" : Number(raw).toFixed(2);

    socket.on("pv_data", (data: any) => {
      const totalRaw = data.total_kw;
      const invARaw = data.sharkmeter1_1086_avg;
      const invBRaw = data.sharkmeter2_1200_avg;
      const invCRaw = data.sharkmeter3_1084_avg;

      const adminLoadRaw = data.admin_load_kw; // from backend
      const adminNetRaw = data.admin_net_kw;

      const b1086NetRaw = data.b1086_net_kw;
      const b1086LoadRaw = data.b1086_load_kw;

      const b1200NetRaw = data.b1200_net_kw;
      const b1200LoadRaw = data.b1200_load_kw;

      const evL3Raw = data.ev_l3_kw;
      const hvacRaw = data.hvac_kw;
      const plugRaw = data.plug_load_kw;
      // Set display strings
      setTotalKW(toDisplay(totalRaw));
      setInverterA(toDisplay(invARaw));
      setInverterB(toDisplay(invBRaw));
      setInverterC(toDisplay(invCRaw));

      setAdminLoad(toDisplay(adminLoadRaw));
      setNetFlow(toDisplay(adminNetRaw));

      setB1086Net(toDisplay(b1086NetRaw));
      setB1086Load(toDisplay(b1086LoadRaw));

      setB1200Net(toDisplay(b1200NetRaw));
      setB1200Load(toDisplay(b1200LoadRaw));

      setEvL3KW(toDisplay(evL3Raw));
      setHvacKW(toDisplay(hvacRaw));
      setPlugKW(toDisplay(plugRaw));

      // Build inverter array (value string + online bool)
      setInverters([
        {
          name: "Inverter A (AE 260TX)",
          value: toDisplay(invARaw),
          online: invARaw != null,
        },
        {
          name: "Inverter B (AE 100TX)",
          value: toDisplay(invBRaw),
          online: invBRaw != null,
        },
        {
          name: "Inverter C (AE 100TX)",
          value: toDisplay(invCRaw),
          online: invCRaw != null,
        },
      ]);

      // Utilization / status: compute only when total numeric
      if (totalRaw == null) {
        setUtilizationPercent("—");
        setSystemStatus("Idle"); // or keep previous state if you prefer
      } else {
        const utilization = (Number(totalRaw) / 460) * 100;
        setUtilizationPercent(`${Math.max(0, utilization).toFixed(2)}%`);
        setSystemStatus(Number(totalRaw) > 0.5 ? "Generating" : "Idle");
      }

      setLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    loading,
    totalKW,
    inverterA,
    inverterB,
    inverterC,
    adminLoad,
    netFlow,
    b1086Net,
    b1086Load,
    b1200Net,
    b1200Load,
    inverters,
    utilizationPercent,
    systemStatus,
    evL3KW,
    hvacKW,
    plugKW,
  };
}
