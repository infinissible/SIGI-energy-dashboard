import React, { useEffect, useRef, useState } from "react";
import { PieChart, Pie, ResponsiveContainer, Cell } from "recharts";

interface GaugeChartProps {
  title: string;
  currentValue: number;
  predictedValue: number;
  maxValue?: number;
  unit?: string;
}

const GaugeChart: React.FC<GaugeChartProps> = ({
  title,
  currentValue,
  predictedValue,
  maxValue = 500,
  unit = "kW",
}) => {
  const radius = 60;
  const innerRadius = 30;
  const startAngle = 210;
  const endAngle = -30;
  const totalAngle = startAngle - endAngle;

  const actualEndAngle = startAngle - (currentValue / maxValue) * totalAngle;
  const predictedAngle = startAngle - (predictedValue / maxValue) * totalAngle;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  const getCoords = (
    cx: number,
    cy: number,
    radius: number,
    angleDeg: number,
    offset = 10
  ) => {
    const rad = (Math.PI / 180) * angleDeg;
    const r = radius + offset;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  };

  const startCoord = getCoords(cx, cy, radius, startAngle, 6);
  const endCoord = getCoords(cx, cy, radius, endAngle, 6);
  const predictedCoord = getCoords(cx, cy, radius, predictedAngle, 12); // base tick position
  const predictedLabelCoord = getCoords(cx, cy, radius, predictedAngle, 22); // place above the tick
  const predictedTickStart = getCoords(cx, cy, radius, predictedAngle, 0); // tick start
  const predictedInnerCoord = getCoords(cx, cy, innerRadius, predictedAngle, 0);

  const backgroundData = [{ name: "Total", value: maxValue }];
  const actualData = [{ name: "Actual", value: currentValue }];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col justify-center">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
        {title}
      </h3>

      <div className="relative w-full h-[200px]" ref={containerRef}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Background Arc */}
            <Pie
              data={backgroundData}
              dataKey="value"
              cx="50%"
              cy="50%"
              startAngle={startAngle}
              endAngle={endAngle}
              innerRadius={innerRadius}
              outerRadius={radius}
              isAnimationActive={false}
            >
              <Cell fill="#f3f4f6" />
            </Pie>

            {/* Actual Arc */}
            <Pie
              data={actualData}
              dataKey="value"
              cx="50%"
              cy="50%"
              startAngle={startAngle}
              endAngle={actualEndAngle}
              innerRadius={innerRadius}
              outerRadius={radius}
            >
              <Cell fill="#38bdf8" />
            </Pie>

            <line
              x1={predictedCoord.x}
              y1={predictedCoord.y}
              x2={predictedInnerCoord.x}
              y2={predictedInnerCoord.y}
              stroke="#9ca3af"
              strokeWidth={1}
            />

            {/* Center Value */}
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={15}
              fontWeight={500}
              fill="#0c4a6e"
            >
              {currentValue} {unit}
            </text>

            {/* 0 and Max Labels */}
            <text
              x={startCoord.x}
              y={startCoord.y}
              fontSize={12}
              fill="#6b7280"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              0
            </text>
            <text
              x={predictedLabelCoord.x}
              y={predictedLabelCoord.y}
              fontSize={11}
              fill="#4b5563"
              textAnchor="middle"
              dominantBaseline="bottom"
            >
              Predicted: {predictedValue} {unit}
            </text>

            <text
              x={endCoord.x}
              y={endCoord.y}
              fontSize={12}
              fill="#6b7280"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {maxValue}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GaugeChart;
