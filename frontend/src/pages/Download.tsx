const inverterFiles = [
  { name: "Inverters_2025.csv", size: "26.96 MB" },
  { name: "Inverters_2024.csv", size: "23.17 MB" },
  { name: "Inverters_2023.csv", size: "22.61 MB" },
  { name: "Inverters_2022.csv", size: "22.13 MB" },
  { name: "Inverters_2021.csv", size: "14.12 MB" },
  { name: "Inverters_2020.csv", size: "19.05 MB" },
  { name: "Inverters_2019.csv", size: "20.33 MB" },
  { name: "Inverters_2018.csv", size: "21.92 MB" },
  { name: "Inverters_2017.csv", size: "20.34 MB" },
  { name: "Inverters_2016.csv", size: "22.17 MB" },
  { name: "Inverters_2015.csv", size: "23.08 MB" },
  { name: "Inverters_2014.csv", size: "12.09 MB" },
];

const apiBase = import.meta.env.VITE_API_BASE_PATH || "";

export default function InverterFiles() {
  return (
    <section className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow border border-gray-200 text-left">
      <h2 className="text-lg font-semibold mb-4">Inverter CSV Files</h2>

      <ul className="space-y-1">
        {inverterFiles.map((file) => (
          <li key={file.name}>
            <a
              href={`${apiBase}/csv/${file.name}`}
              download
              className="text-sm text-blue-600 hover:underline"
            >
              {file.name}
            </a>{" "}
            <span className="text-xs text-gray-500">({file.size})</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
