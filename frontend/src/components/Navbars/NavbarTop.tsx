import { useEffect, useState } from "react";
import sigiImage from "@/assets/img/sigi_660.png";
import { Link } from "react-router-dom";

export default function NavbarTop() {
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const now = new Date();
    setLastUpdated(now.toLocaleString()); // or use toLocaleTimeString()
  }, []);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-gray-100 shadow-md border-b border-gray-300">
      <div className="max-w-full mx-auto px-6 flex items-center justify-between h-24 pt-2">
        {/* Left: Logo + Title */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="hover:opacity-90">
            <img
              alt="SIGI Logo"
              src={sigiImage}
              className="h-20 w-auto object-contain"
            />
          </Link>
          {/* <span className="text-white text-4xl font-bold tracking-tight font-inter">
            SIGI Dashboard Project
          </span> */}
        </div>

        {/* Right: System Info Box */}
        <div className="text-xs text-white pl-4 border-l-2 border-dotted border-gray-800 ml-6 text-left">
          <div className="mb-1">
            <span className="font-semibold text-gray-800">System Size:</span>{" "}
            <span className="font-semibold text-slate-800">500.0 kW DC</span>
          </div>
          <div className="mb-1">
            <span className="font-semibold text-gray-800">
              Generating Since:
            </span>{" "}
            <span className="font-semibold text-slate-800">April 14, 2014</span>
          </div>
          <div>
            <span className="font-semibold text-gray-800">Last Updated:</span>{" "}
            <span className="font-semibold text-slate-800">{lastUpdated}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
