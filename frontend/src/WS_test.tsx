import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function RealtimePV() {
  const [totalKW, setTotalKW] = useState<number | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:8100");

    socket.on("pv_data", (data) => {
      console.log("📡 PV Data:", data);
      if (data.total_kw !== undefined) {
        setTotalKW(data.total_kw);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="text-xl font-mono">
      {totalKW !== null
        ? `Total PV Output: ${totalKW} kW`
        : "Waiting for data..."}
    </div>
  );
}
