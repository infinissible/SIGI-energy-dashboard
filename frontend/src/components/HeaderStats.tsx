import { useEffect, useState } from "react";
// import CardStatsGauge from "components/Cards/CardStatsGauge";
// import CardWeather from "components/Cards/CardWeather";
// import CardStatsSolar from "components/Cards/CardStatsSolar";
// import CardStatsEV from "components/Cards/CardStatsEV";
// import CardStatsBattery from "components/Cards/CardStatsBattery";
// import CardGeneration from "components/Cards/CardGeneration";
// import JointSLD from "components/Cards/JointSLD";
// import CardLineChart from "components/Cards/CardLineChart";

export default function HeaderStats(
  {
    // rawData,
    // summaryData,
    // weatherData,
    // loading,
    // chartData,
    // chartLoading,
    // currentRange,
    // onRangeChange,
  }
) {
  // const [solarData, setSolarData] = useState({});

  // const safeDivide = (value, divisor, fallback = 0) => {
  //   const result = Number(value) / Number(divisor);
  //   return isFinite(result) ? Number(result.toFixed(2)) : fallback;
  // };

  // useEffect(() => {
  //   if (!loading && rawData && summaryData) {
  //     const raw = Array.isArray(rawData) ? rawData[0] : rawData;

  //     setSolarData({
  //       ...raw,
  //       gen_to_date: Number(summaryData.gen_to_date?.replace(/,/g, "") || 0),
  //       gen_this_month: Number(
  //         summaryData.gen_this_month?.replace(/,/g, "") || 0
  //       ),
  //       gen_last_month: Number(
  //         summaryData.gen_last_month?.replace(/,/g, "") || 0
  //       ),
  //       gen_this_year: Number(
  //         summaryData.gen_this_year?.replace(/,/g, "") || 0
  //       ),
  //     });
  //   }
  // }, [rawData, summaryData, loading]);

  return (
    <div className="relative bg-blue-50 md:pt-32 pt-12">
      <div className="px-4 md:px-10 mx-auto w-full space-y-4">
        {/* ============ TOP ROW ============ */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full md:w-1/2">
            <div className="flex flex-col space-y-4">
              <CardStatsGauge
                valueTotal={safeDivide(solarData.power_total, 1, 0)}
                valueToDate={safeDivide(solarData.gen_to_date, 1e9, 0)}
              />
              <CardWeather
                temperature={
                  weatherData?.temp !== undefined
                    ? `${weatherData.temp} °F`
                    : "Loading..."
                }
                cell_temp={
                  weatherData?.cell_temp !== undefined
                    ? `${weatherData.cell_temp} °F`
                    : "Loading..."
                }
                irradiance={
                  weatherData?.irradiance !== undefined
                    ? `${weatherData.irradiance} W/m²`
                    : "Loading..."
                }
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 w-full md:w-1/2">
            <div className="flex flex-wrap -mx-2">
              <div className="w-full md:w-1/3 px-2">
                <CardStatsSolar
                  title="Building 1084"
                  solarGen={`${safeDivide(solarData.power_1084, 1)} kW`}
                  netLoad={`${safeDivide(solarData.net_1084, 1)} kW`}
                />
              </div>
              <div className="w-full md:w-1/3 px-2">
                <CardStatsSolar
                  title="Building 1086"
                  solarGen={`${safeDivide(solarData.power_1086, 1)} kW`}
                  netLoad="--"
                />
              </div>
              <div className="w-full md:w-1/3 px-2">
                <CardStatsSolar
                  title="Building 1200"
                  solarGen={`${safeDivide(solarData.power_1200, 1)} kW`}
                  netLoad="--"
                />
              </div>
              <div className="w-full md:w-1/2 px-2">
                <CardGeneration
                  thisMonth={
                    typeof solarData.gen_this_month === "number"
                      ? `${solarData.gen_this_month.toLocaleString()} kWh`
                      : "Loading..."
                  }
                  lastMonth={
                    typeof solarData.gen_last_month === "number"
                      ? `${solarData.gen_last_month.toLocaleString()} kWh`
                      : "Loading..."
                  }
                  thisYear={
                    typeof solarData.gen_this_year === "number"
                      ? `${solarData.gen_this_year.toLocaleString()} kWh`
                      : "Loading..."
                  }
                />
              </div>
              <div className="w-full md:w-1/2 px-2">
                <CardStatsEV title="EV Chargers" />
              </div>
              <div className="w-full md:w-1/2 px-2">
                <CardStatsBattery title="Battery Status" />
              </div>
            </div>
          </div>
        </div>

        {/* ============ BOTTOM ROW ============ */}
        {/* <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/3 bg-white rounded-xl shadow-lg p-4">
            <JointSLD />
          </div>
          <div className="w-full md:w-2/3 bg-white rounded-xl shadow-lg p-4">
            <CardLineChart
              chartData={chartData}
              loading={chartLoading}
              currentRange={currentRange}
              onRangeChange={onRangeChange}
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}
