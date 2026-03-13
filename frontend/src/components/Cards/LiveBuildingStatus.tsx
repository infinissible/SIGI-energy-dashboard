import { useMemo, useState } from "react";
import BuildingCard from "./BuildingCard";
import useLivePVData from "@/hooks/useLivePVData";
import useEnergyToday from "@/hooks/useEnergyToday";

type BuildingId = "1084" | "1086" | "1200";

export default function LiveBuildingStatus() {
  const {
    loading: pvLoading,
    inverterA,
    inverterB,
    inverterC,
    adminLoad,
    netFlow, // admin net
    b1086Net,
    b1086Load,
    b1200Net,
    b1200Load,
  } = useLivePVData();

  const { loading: energyLoading, data: energyToday } = useEnergyToday();
  const loading = pvLoading || energyLoading;

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingId>("1084");

  const fmt = (n?: number) => (n != null ? n.toFixed(2) : "--");

  // Pick today's energy based on selected building
  const selectedEnergy = useMemo(() => {
    if (!energyToday) return null;
    if (selectedBuilding === "1084") return energyToday.admin;
    if (selectedBuilding === "1086") return energyToday.b1086;
    return energyToday.b1200;
  }, [energyToday, selectedBuilding]);

  const solarCoverage = useMemo(() => {
    if (!selectedEnergy) return "0.0%";
    const { pv_supplied_kwh, load_kwh } = selectedEnergy as any;
    if (!pv_supplied_kwh || !load_kwh || load_kwh <= 0) return "0.0%";
    return `${Math.min(100, (pv_supplied_kwh / load_kwh) * 100).toFixed(1)}%`;
  }, [selectedEnergy]);

  // Live metrics by building
  let liveCurrentLoad = "—";
  let livePV = "—";
  let liveNetFlow = "—";
  let label = "";
  let pvSourceLabel = "";

  if (selectedBuilding === "1084") {
    label = "Building 1084 (Admin)";
    pvSourceLabel = "Inverter C";
    liveCurrentLoad = adminLoad;
    livePV = inverterC;
    liveNetFlow = netFlow;
  } else if (selectedBuilding === "1086") {
    label = "Building 1086";
    pvSourceLabel = "Inverter A";
    liveCurrentLoad = b1086Load;
    livePV = inverterA;
    liveNetFlow = b1086Net;
  } else {
    label = "Building 1200";
    pvSourceLabel = "Inverter B";
    liveCurrentLoad = b1200Load;
    livePV = inverterB;
    liveNetFlow = b1200Net;
  }

  const todayLoad =
    selectedEnergy?.load_kwh != null ? fmt(selectedEnergy.load_kwh) : "--";

  const todayPV =
    selectedEnergy?.pv_supplied_kwh != null
      ? fmt(selectedEnergy.pv_supplied_kwh)
      : "--";

  const todayExport =
    selectedEnergy?.exported_kwh != null
      ? fmt(selectedEnergy.exported_kwh)
      : "--";

  return (
    <BuildingCard
      buildingLabel={label}
      pvSourceLabel={pvSourceLabel}
      currentLoad={liveCurrentLoad}
      pvGeneration={livePV}
      netFlow={liveNetFlow}
      todayLoad={todayLoad}
      todayPV={todayPV}
      todayExport={todayExport}
      solarPercent={solarCoverage}
      loading={loading}
      selectedBuilding={selectedBuilding}
      onSelectBuilding={setSelectedBuilding}
    />
  );
}
