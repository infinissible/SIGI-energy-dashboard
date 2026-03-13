// components/Navbars/NavbarSide.tsx
import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";

const links = [
  { label: ["Overview"], to: "/" },
  { label: ["Buildings"], to: "/buildings" },
  { label: ["Inverters"], to: "/inverters" },
  { label: ["Savings"], to: "/savings" },
  { label: ["EV Chargers"], to: "/ev-chargers" },
  { label: ["Trailers"], to: "/trailers" },
  { label: ["Weather Station"], to: "/weather-station" },
  { label: ["Analytics"], to: "/analytics" },
  { label: ["Download"], to: "/download" },
  { label: ["Notifications"], to: "/notifications" },
];

type Props = {
  variant?: "drawer";
  onNavigate?: () => void;
  className?: string;
};

export default function NavbarSide({ onNavigate, className = "" }: Props) {
  const location = useLocation();
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    const handleNotificationUpdate = () => {
      try {
        const logs = JSON.parse(
          localStorage.getItem("notification_logs") || "[]"
        );
        setHasNotifications(Array.isArray(logs) && logs.length > 0);
      } catch {
        setHasNotifications(false);
      }
    };

    // Initial check + listen for our custom event
    handleNotificationUpdate();
    window.addEventListener("notification_updated", handleNotificationUpdate);

    // (optional) also react if something else in the app touches localStorage and re-dispatches
    const handleVisibility = () => handleNotificationUpdate();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(
        "notification_updated",
        handleNotificationUpdate
      );
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Don't auto-clear on the notifications page while you're testing
  // (If you want auto-clear, re-enable this effect.)
  useEffect(() => {
    if (location.pathname.endsWith("/notifications")) {
      setHasNotifications(false);
      localStorage.setItem("notification_logs", "[]");
    }
  }, [location.pathname]);

  const isActive = (to: string, firstLabel: string) =>
    location.pathname === to ||
    (firstLabel === "Overview" &&
      (location.pathname === "/admin" || location.pathname === "/admin/"));

  const container =
    "w-full bg-gray-50/90 rounded-lg shadow-sm border border-gray-100 p-2 " +
    className;

  const linkBase =
    "block px-3 py-2 rounded-md text-sm text-left font-medium transition-colors";
  const linkActive = "bg-gray-200 text-gray-800 font-semibold";
  const linkIdle = "text-gray-700 hover:bg-gray-100";

  const Dot = () => (
    <span
      aria-hidden
      className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full"
    >
      !
    </span>
  );

  return (
    <aside className={container}>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const active = isActive(link.to, link.label[0]);
          const showDot = link.label[0] === "Notifications" && hasNotifications;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onNavigate}
              className={`${linkBase} ${active ? linkActive : linkIdle}`}
            >
              <div className="leading-tight">
                {/* Mobile label */}
                <span className="block sm:hidden">
                  <div className="flex items-center gap-1">
                    {link.label[0]} {showDot && <Dot />}
                  </div>
                  {link.label[1] && (
                    <div className="text-xs text-gray-500">{link.label[1]}</div>
                  )}
                </span>

                {/* Desktop label — now also shows the dot */}
                <span className="hidden sm:block">
                  <span className="flex items-center gap-1">
                    {link.label[0]} {showDot && <Dot />}
                    {link.label[1] && (
                      <span className="text-xs text-gray-500">
                        {" "}
                        {link.label[1]}
                      </span>
                    )}
                  </span>
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
