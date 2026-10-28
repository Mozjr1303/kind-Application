import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import { MapPin, Star, ArrowRight } from 'lucide-react';
import { isInsideLilongwe } from '../constants/lilongwe';
import { setupLeafletIcons, createUserIcon, createProviderIcon } from './leafletSetup';

setupLeafletIcons();

export interface ProviderItem {
  id: number | string;
  name: string;
  service: string;
  area_name: string;
  latitude: number;
  longitude: number;
  qualifications?: string | null;
  photo_url?: string | null;
  rating?: number;
  jobs_done?: number;
  distance_km: number;
}

interface ClientProvidersMapProps {
  userLocation: { lat: number; lng: number; areaName: string };
  providers: ProviderItem[];
  radiusKm: number;
  isLiveGps?: boolean;
  onSelectProvider: (provider: ProviderItem) => void;
  onUserPinMove?: (lat: number, lng: number) => void;
}

function MapUpdater({ center, radiusKm }: { center: [number, number]; radiusKm: number }) {
  const map = useMap();
  const prevCenter = useRef<[number, number]>(center);
  const prevRadius = useRef<number>(radiusKm);

  useEffect(() => {
    const movedSignificantly =
      Math.abs(prevCenter.current[0] - center[0]) > 0.0005 ||
      Math.abs(prevCenter.current[1] - center[1]) > 0.0005;
    const radiusChanged = prevRadius.current !== radiusKm;

    if (movedSignificantly || radiusChanged) {
      map.setView(
        center,
        radiusChanged
          ? radiusKm <= 2
            ? 15
            : radiusKm <= 5
            ? 14
            : radiusKm <= 10
            ? 13
            : 12
          : map.getZoom()
      );
      prevCenter.current = center;
      prevRadius.current = radiusKm;
    }
  }, [center, radiusKm, map]);

  return null;
}

function InteractiveUserPin({
  center,
  areaName,
  onUserPinMove,
}: {
  center: [number, number];
  areaName: string;
  onUserPinMove?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!onUserPinMove) return;
      const { lat, lng } = e.latlng;
      if (isInsideLilongwe(lat, lng)) {
        onUserPinMove(lat, lng);
      }
    },
  });

  return (
    <Marker
      position={center}
      icon={createUserIcon()}
      draggable={Boolean(onUserPinMove)}
      eventHandlers={{
        dragend(e) {
          if (!onUserPinMove) return;
          const marker = e.target;
          const { lat, lng } = marker.getLatLng();
          if (isInsideLilongwe(lat, lng)) {
            onUserPinMove(lat, lng);
          } else {
            marker.setLatLng(center);
          }
        },
      }}
    >
      <Popup>
        <div className="p-1 text-center font-sans">
          <p className="font-bold text-slate-900 text-sm">Your Location</p>
          <p className="text-xs text-slate-500">{areaName}</p>
          <p className="text-[10px] text-indigo-600 mt-0.5">Drag pin or tap map to move</p>
        </div>
      </Popup>
    </Marker>
  );
}

export const ClientProvidersMap: React.FC<ClientProvidersMapProps> = ({
  userLocation,
  providers,
  radiusKm,
  isLiveGps = false,
  onSelectProvider,
  onUserPinMove,
}) => {
  const center: [number, number] = [userLocation.lat, userLocation.lng];

  return (
    <div className="relative w-full h-[380px] sm:h-[460px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm z-0">
      <MapContainer
        center={center}
        zoom={radiusKm <= 5 ? 14 : 13}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} radiusKm={radiusKm} />

        {/* User Search Radius Circle */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#4f46e5',
            fillColor: '#4f46e5',
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: '4, 8',
          }}
        />

        {/* User Position Marker (draggable / clickable) */}
        <InteractiveUserPin
          center={center}
          areaName={userLocation.areaName}
          onUserPinMove={onUserPinMove}
        />

        {/* Provider Markers */}
        {providers.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={createProviderIcon(p.service)}
          >
            <Popup>
              <div className="p-2 max-w-[220px] font-sans">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                    {p.photo_url ? (
                      <img
                        src={p.photo_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-bold text-xs text-indigo-600">
                        {p.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-indigo-600 font-semibold">{p.service}</p>
                  </div>
                </div>

                <div className="my-2 py-1.5 px-2 bg-slate-50 rounded-lg flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin size={12} className="text-slate-400" />
                    {p.area_name}
                  </span>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {p.distance_km} km
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star size={12} fill="currentColor" />
                    {p.rating && p.rating > 0 ? p.rating.toFixed(1) : 'New'}
                  </span>
                  <span>{p.jobs_done || 0} jobs done</span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectProvider(p)}
                  className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <span>View Details</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Top-right helper badge */}
      <div className="absolute top-3 right-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-[11px] font-semibold text-slate-600 dark:text-slate-300 pointer-events-none z-[400] flex items-center gap-1.5">
        <MapPin size={13} className="text-blue-600" />
        <span>{isLiveGps ? 'Live GPS Tracking' : 'Tap map or drag blue pin to move'}</span>
      </div>

      {/* Bottom-left live status pill */}
      <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs font-semibold text-slate-700 dark:text-slate-300 pointer-events-none z-[400] flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>
          Live: {providers.length} provider{providers.length === 1 ? '' : 's'} within {radiusKm} km
        </span>
      </div>
    </div>
  );
};

export default ClientProvidersMap;
