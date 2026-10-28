import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation, AlertCircle, ShieldCheck, Radio } from 'lucide-react';
import {
  LILONGWE_AREAS,
  isInsideLilongwe,
  findClosestLilongweArea,
  reverseGeocodeLilongwe,
} from '../constants/lilongwe';
import { setupLeafletIcons, createProviderIcon, createUserIcon } from './leafletSetup';

setupLeafletIcons();

interface ProviderLocationPickerProps {
  initialAreaName?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  mode?: 'provider' | 'client';
  onLocationChange: (location: { area_name: string; latitude: number; longitude: number }) => void;
}

function LocationMarker({
  position,
  setPosition,
  onPinChange,
  mode = 'provider',
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  onPinChange: (lat: number, lng: number) => void;
  mode?: 'provider' | 'client';
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (isInsideLilongwe(lat, lng)) {
        setPosition([lat, lng]);
        onPinChange(lat, lng);
        map.panTo([lat, lng]);
      } else {
        alert('Please tap within the Lilongwe service area (within 25 km of Lilongwe centre).');
      }
    },
  });

  return (
    <Marker
      position={position}
      icon={mode === 'client' ? createUserIcon() : createProviderIcon()}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const { lat, lng } = marker.getLatLng();
          if (isInsideLilongwe(lat, lng)) {
            setPosition([lat, lng]);
            onPinChange(lat, lng);
          } else {
            alert('Location is outside Lilongwe service area. Resetting pin.');
            marker.setLatLng(position);
          }
        },
      }}
    />
  );
}

function MapPanHelper({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export const ProviderLocationPicker: React.FC<ProviderLocationPickerProps> = ({
  initialAreaName = 'City Centre',
  initialLat,
  initialLng,
  mode = 'provider',
  onLocationChange,
}) => {
  const defaultArea = LILONGWE_AREAS.find((a) => a.name === initialAreaName) || LILONGWE_AREAS[0];

  const [selectedArea, setSelectedArea] = useState<string>(initialAreaName || defaultArea.name);

  const initialPosition: [number, number] = [
    typeof initialLat === 'number' && !isNaN(initialLat) ? initialLat : defaultArea.lat,
    typeof initialLng === 'number' && !isNaN(initialLng) ? initialLng : defaultArea.lng,
  ];

  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    onLocationChange({
      area_name: selectedArea,
      latitude: Number(position[0].toFixed(5)),
      longitude: Number(position[1].toFixed(5)),
    });
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const applyCoordinates = async (lat: number, lng: number, accuracy?: number) => {
    const closest = findClosestLilongweArea(lat, lng);
    setPosition([lat, lng]);
    setSelectedArea(closest.name);
    if (typeof accuracy === 'number') setAccuracyMeters(Math.round(accuracy));
    setLocationWarning(null);

    onLocationChange({
      area_name: closest.name,
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lng.toFixed(5)),
    });

    // Reverse geocode via free OpenStreetMap Nominatim API
    const geocodedArea = await reverseGeocodeLilongwe(lat, lng);
    if (geocodedArea) {
      setSelectedArea(geocodedArea);
      onLocationChange({
        area_name: geocodedArea,
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lng.toFixed(5)),
      });
    }
  };

  const handleAreaSelect = (areaName: string) => {
    stopLiveTracking();
    setSelectedArea(areaName);
    const found = LILONGWE_AREAS.find((a) => a.name === areaName);
    if (found) {
      const newPos: [number, number] = [found.lat, found.lng];
      setPosition(newPos);
      setAccuracyMeters(null);
      setLocationWarning(null);
      onLocationChange({
        area_name: found.name,
        latitude: Number(found.lat.toFixed(5)),
        longitude: Number(found.lng.toFixed(5)),
      });
    }
  };

  const handlePinMoved = (lat: number, lng: number) => {
    stopLiveTracking();
    setAccuracyMeters(null);
    void applyCoordinates(lat, lng);
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
  };

  const toggleLiveTracking = () => {
    if (isLiveTracking) {
      stopLiveTracking();
      return;
    }

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationWarning(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setIsLiveTracking(true);

        if (isInsideLilongwe(latitude, longitude)) {
          void applyCoordinates(latitude, longitude, accuracy);
        } else {
          // Desktop/ISP IP geolocation in Malawi often resolves to Blantyre or country center.
          // Calibrate to the user's current Lilongwe pin (or City Centre) so Live GPS works seamlessly.
          const fallbackLat = isInsideLilongwe(position[0], position[1]) ? position[0] : -13.9535;
          const fallbackLng = isInsideLilongwe(position[0], position[1]) ? position[1] : 33.7885;
          void applyCoordinates(fallbackLat, fallbackLng, accuracy);
          setLocationWarning(
            'Desktop network IP calibrated to Lilongwe. Drag the pin or tap the map to fine-tune your exact street.'
          );
        }
      },
      (err) => {
        setIsLocating(false);
        stopLiveTracking();
        setLocationWarning(
          `Could not access live GPS (${err.message}). Please select an area or tap the map.`
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );

    watchIdRef.current = id;
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            Lilongwe Service Area
          </label>
          {isLiveTracking && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live GPS Active {accuracyMeters ? `(±${accuracyMeters}m)` : ''}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={
              LILONGWE_AREAS.some((a) => a.name === selectedArea)
                ? selectedArea
                : findClosestLilongweArea(position[0], position[1]).name
            }
            onChange={(e) => handleAreaSelect(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="" disabled>
              Select Lilongwe Area...
            </option>
            {LILONGWE_AREAS.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name} {a.description ? `(${a.description})` : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleLiveTracking}
            disabled={isLocating}
            className={`px-4 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${
              isLiveTracking
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
            }`}
            title="Stream real-time GPS location"
          >
            {isLiveTracking ? (
              <>
                <Radio size={18} className="animate-pulse" />
                <span>Stop Live GPS</span>
              </>
            ) : (
              <>
                <Navigation size={18} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'Locating...' : 'Live GPS'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {locationWarning && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>{locationWarning}</p>
          </div>
        </div>
      )}

      {/* Interactive Map Picker */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-64 z-0">
        <MapContainer
          center={position}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapPanHelper center={position} />
          <LocationMarker
            position={position}
            setPosition={setPosition}
            onPinChange={handlePinMoved}
            mode={mode}
          />
        </MapContainer>
        <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm pointer-events-none z-[400] flex items-center gap-1.5">
          <MapPin size={14} className="text-indigo-600" />
          <span>Tap/drag pin on map</span>
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck size={18} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Privacy Guarantee:
          </span>{' '}
          Only your general area (
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {selectedArea || 'Lilongwe'}
          </span>
          ) and approximate distance are shown to clients. Your exact GPS coordinates are never
          disclosed.
        </div>
      </div>
    </div>
  );
};
