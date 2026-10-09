"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// A black teardrop pin (no external image assets — matches the monochrome theme
// and avoids Leaflet's default broken marker-icon paths under bundlers).
function pinIcon() {
  return L.divIcon({
    className: "branch-pin",
    html:
      '<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.3 12 32 12 32s12-11.7 12-20.1C24 5.3 18.6 0 12 0z" fill="#121212"/>' +
      '<circle cx="12" cy="11.6" r="4.2" fill="#ffffff"/></svg>',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -34],
  });
}

// Keep only locations with usable numeric coordinates.
function withCoords(locations = []) {
  return locations
    .map((l) => ({ ...l, lat: Number(l.lat), lng: Number(l.lng) }))
    .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
}

export default function BranchMapInner({ locations = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const pts = withCoords(locations);
    if (!containerRef.current || !pts.length) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
    });
    mapRef.current = map;

    // CartoDB Positron — a light, desaturated basemap that suits the black &
    // white theme (a grayscale CSS filter on top keeps it fully monochrome).
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const markers = pts.map((l) => {
      const m = L.marker([l.lat, l.lng], { icon: pinIcon() }).addTo(map);
      const title = l.name ? `<strong>${escapeHtml(l.name)}</strong>` : "";
      const addr = l.address ? `<br/>${escapeHtml(l.address)}` : "";
      if (title || addr) m.bindPopup(`<div class="branch-popup">${title}${addr}</div>`);
      return m;
    });

    if (markers.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 13);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.35));
    }

    // Leaflet can misjudge size when its container animates/lays out late.
    const t = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, [locations]);

  return (
    <div
      ref={containerRef}
      className="branch-map h-[360px] w-full border border-ink bg-smoke sm:h-[460px]"
      role="region"
      aria-label="Map of our store locations"
    />
  );
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
