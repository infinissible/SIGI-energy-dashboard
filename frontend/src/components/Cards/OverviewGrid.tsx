import { useEffect, useState } from "react";

import OverviewCard from "./OverviewCard";
import SummaryAndTrends from "./SummaryAndTrends";
import TodaysMetrics from "./TodaysMetrics";
import SystemDiagram from "./SystemDiagram";
import Chart from "../Charts/Chart";
import LivePVStatus from "./LivePVStatus";
import LiveBuildingStatus from "./LiveBuildingStatus";
import MonthlyMetrics from "./MonthlyMetrics";
import EVChargers from "./EV";

export default function OverviewGrid() {
  const [selectedSystem, setSelectedSystem] = useState("all");

  return (
    <section className="w-full space-y-6">
      {/* Top row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-center mb-4">
            System Diagram
          </h2>
          <SystemDiagram onNodeSelect={setSelectedSystem} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow h-full">
          <h2 className="text-xl font-semibold mb-4">
            Real-Time System Performance
          </h2>
          <Chart
            selectedSystem={selectedSystem}
            setSelectedSystem={setSelectedSystem}
          />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">
            Real-Time Status
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LivePVStatus />
            <LiveBuildingStatus />
            <div className="col-span-full">
              <TodaysMetrics />
            </div>
            <EVChargers />
            <OverviewCard
              title="Trailers"
              value=""
              breakdown={[
                { label: "Trailer 1", value: "Disconnected" },
                { label: "Trailer 2", value: "Disconnected" },
              ]}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">
            Energy Trends Report
          </h2>
          <SummaryAndTrends />
          <MonthlyMetrics />
        </div>
      </div>
    </section>
  );
}
