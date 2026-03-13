import React, { useEffect, useState, useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";

interface GaugeCardProps {
  title: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  predicted?: number;
}

const GaugeCard: React.FC<GaugeCardProps> = ({
  title,
  value,
  unit = "kW",
  min = 0,
  max = 500,
  predicted = 300,
}) => {
  const [modulesInitialized, setModulesInitialized] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadModules = async () => {
      await import("highcharts/highcharts-more");
      await import("highcharts/modules/solid-gauge");
      setModulesInitialized(true);
    };
    loadModules();
  }, []);

  if (!modulesInitialized) return null;

  // Degrees to radians helper
  const degToRad = (deg: number) => (deg * Math.PI) / 180;

  // Calculate label position in JSX based on predicted value
  const getLabelPosition = () => {
    if (!chartContainerRef.current) return { left: "50%", top: "0%" };

    const radius = 80; // match outerRadius of chart
    const arcCenterX = chartContainerRef.current.offsetWidth / 2;
    const arcCenterY = chartContainerRef.current.offsetHeight * 0.85;

    const angle = ((predicted - min) / (max - min)) * 180 - 90;
    const rad = degToRad(angle);

    const x = arcCenterX + radius * Math.cos(rad);
    const y = arcCenterY + radius * Math.sin(rad) - 16; // offset upward

    return { left: `${x}px`, top: `${y}px` };
  };

  const options: Highcharts.Options = {
    chart: {
      type: "solidgauge",
      height: 200,
      backgroundColor: "transparent",
    },
    title: undefined,
    pane: {
      center: ["50%", "85%"],
      size: "100%",
      startAngle: -90,
      endAngle: 90,
      background: [
        {
          innerRadius: "60%",
          outerRadius: "100%",
          shape: "arc",
          backgroundColor: "#f3f4f6",
        },
      ],
    },
    tooltip: { enabled: false },
    yAxis: {
      min,
      max,
      lineWidth: 0,
      tickWidth: 0,
      tickLength: 0,
      minorTickLength: 0,
      tickPositions: [],
      labels: { enabled: false },
      plotBands: [
        {
          from: predicted - 2.5, // wider range for visibility
          to: predicted + 2.5,
          color: "#38bdf8",
          outerRadius: "107%", // longer tick outside the arc
          innerRadius: "97%",
        },
      ],
    },
    plotOptions: {
      solidgauge: {
        dataLabels: {
          y: 5,
          borderWidth: 0,
          useHTML: true,
          format: `
            <div style="text-align:center">
              <span style="font-size:20px;font-weight:600">{y}</span><br/>
              <span style="font-size:12px;opacity:0.5">${unit}</span>
            </div>
          `,
        },
      },
    },
    credits: { enabled: false },
    series: [
      {
        name: title,
        data: [value],
        type: "solidgauge",
      },
    ],
  };

  const labelStyle = {
    position: "absolute" as const,
    transform: "translate(-50%, -100%)",
    fontSize: "12px",
    color: "#4b5563",
    fontWeight: 400,
    pointerEvents: "none" as const,
    ...getLabelPosition(),
  };

  return (
    <div
      ref={chartContainerRef}
      className="bg-white rounded-md border p-4 shadow-sm relative"
      style={{ height: 240 }}
    >
      <div className="text-sm font-medium text-gray-700 mb-2 text-center">
        {title}
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} />
      {/* Predicted power label aligned above tick */}
      <div style={labelStyle}>
        Predicted: {predicted} {unit}
      </div>
    </div>
  );
};

export default GaugeCard;
