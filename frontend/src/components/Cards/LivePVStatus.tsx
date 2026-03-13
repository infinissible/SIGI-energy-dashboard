import PVGenerationCard from "./PVGenerationCard";
import useLivePVData from "@/hooks/useLivePVData";
import useEnergyToday from "@/hooks/useEnergyToday";

export default function LivePVStatus() {
  const { loading, totalKW, inverters, utilizationPercent, systemStatus } =
    useLivePVData();
  const { loading: energyLoading, data: energyToday } = useEnergyToday();
  const combinedLoading = loading || energyLoading;

  const pvEnergyToday =
    energyToday?.pv_energy_today_kwh != null
      ? energyToday.pv_energy_today_kwh.toFixed(2)
      : "--";

  return (
    <PVGenerationCard
      currentPower={totalKW}
      inverters={inverters}
      loading={loading}
      utilizationPercent={utilizationPercent}
      systemStatus={systemStatus}
      pvEnergyToday={pvEnergyToday}
    />
  );
}
