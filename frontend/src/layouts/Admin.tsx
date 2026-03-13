import { useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import NavbarTop from "@/components/Navbars/NavbarTop";
import NavbarSide from "@/components/Navbars/NavbarSide";
import Footer from "@/components/Footer";
import OverviewGrid from "@/components/Cards/OverviewGrid";
import InverterDemandSummary from "@/pages/Download";
import Notification from "@/pages/Notification";
import Inverters from "@/pages/Inverters";
import Savings from "@/pages/Savings";
import Buildings from "@/pages/Buildings";
import EVChargers from "@/pages/EVChargers";
import Trailers from "@/pages/Trailers";
import WeatherStation from "@/pages/WeatherStation";
import Analytics from "@/pages/analytics/Analytics";

export default function Admin() {
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(() => window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  // Update drawer behavior on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // On route change: close drawer only on mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [location.pathname, isMobile]);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="bg-gray-50 min-h-screen font-sans overflow-x-hidden">
      {/* Top Navbar */}
      <NavbarTop />

      {/* Open button — visible on all screen sizes */}
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open menu"
        className="fixed left-3 top-28 z-50 w-10 h-10 rounded-full bg-white border shadow flex items-center justify-center"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Main Content */}
      <main className="mt-20 px-4 pb-4 max-w-full space-y-6">
        <Routes>
          <Route
            path="/"
            element={
              <div className="w-full">
                <OverviewGrid />
              </div>
            }
          />
          <Route path="/inverters" element={<Inverters />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/ev-chargers" element={<EVChargers />} />
          <Route path="/trailers" element={<Trailers />} />
          <Route path="/weather-station" element={<WeatherStation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/download" element={<InverterDemandSummary />} />
          <Route path="/notifications" element={<Notification />} />
        </Routes>

        <Footer />
      </main>

      {/* Sidebar Drawer */}
      {drawerOpen && (
        <div
          className="fixed left-3 top-28 z-50 w-52 max-w-[85vw] max-h-[70vh]
          bg-white shadow-xl border rounded-xl overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between p-3 border-b">
            <div className="font-semibold">Menu</div>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="Close menu"
              className="w-9 h-9 rounded-full border bg-white shadow flex items-center justify-center"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 6L9 12L15 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto p-2">
            <NavbarSide onNavigate={() => isMobile && closeDrawer()} />
          </div>
        </div>
      )}
    </div>
  );
}
