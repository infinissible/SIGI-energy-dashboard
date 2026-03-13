import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Import icons so Vite resolves correct URLs
import icon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconRetinaUrl: icon2xUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function LocationMap() {
  // Hardcoded Riverside coordinates
  const [position] = useState<[number, number]>([
    34.00035769263032, -117.33512938975784,
  ]);

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        center={position}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>1084 Columbia Ave, Riverside, CA 92507</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
