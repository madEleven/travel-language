import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2, WifiOff, Navigation, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_KEY = 'j00qC2zY4kXsXBilD5yq';

interface ToiletPOI {
  id: number;
  lat: number;
  lng: number;
  name: string;
  tags: Record<string, string>;
}

export function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toilets, setToilets] = useState<ToiletPOI[]>([]);
  const [toiletError, setToiletError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const searchNearbyToilets = async (lat: number, lng: number) => {
    setToiletError(null);
    const radius = 1000; // 1km
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"="toilets"](around:${radius},${lat},${lng});
        node["building"="toilets"](around:${radius},${lat},${lng});
      );
      out body;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        setToiletError('网络异常，无法加载附近厕所数据，请稍后重试');
        return;
      }

      const data = await response.json();
      const results: ToiletPOI[] = (data.elements || []).map((el: any) => ({
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        name: el.tags?.name || el.tags?.description || '公共厕所',
        tags: el.tags || {},
      }));

      setToilets(results.slice(0, 15));

      // Clear old markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Add markers
      results.slice(0, 15).forEach(toilet => {
        if (!mapRef.current) return;

        const el = document.createElement('div');
        el.className = 'toilet-marker';
        el.innerHTML = '🚻';
        el.style.fontSize = '24px';
        el.style.cursor = 'pointer';
        el.style.lineHeight = '1';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([toilet.lng, toilet.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
              <div style="padding:4px 8px;font-size:13px;">
                <strong>${toilet.name}</strong>
                ${toilet.tags.fee ? `<br/><span style="color:#666">费用: ${toilet.tags.fee}</span>` : ''}
                ${toilet.tags.wheelchair === 'yes' ? '<br/><span style="color:#666">♿ 无障碍</span>' : ''}
                <br/><a href="https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}" target="_blank" rel="noopener" style="color:#4f46e5;text-decoration:underline;font-size:12px;">导航前往 →</a>
              </div>
            `)
          )
          .addTo(mapRef.current);

        markersRef.current.push(marker);
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setToiletError('网络异常，无法加载附近厕所数据，请稍后重试');
      } else {
        setToiletError('网络异常，无法加载附近厕所数据，请稍后重试');
      }
      console.warn('Overpass API query failed:', err);
    }
  };

  useEffect(() => {
    if (isOffline) {
      setLoading(false);
      return;
    }

    if (!mapContainerRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        const map = new maplibregl.Map({
          container: mapContainerRef.current!,
          style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
          center: [longitude, latitude],
          zoom: 15,
          attributionControl: true,
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
        map.addControl(new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
        }), 'top-right');

        mapRef.current = map;

        map.on('load', () => {
          // Add user location marker
          const userEl = document.createElement('div');
          userEl.innerHTML = '📍';
          userEl.style.fontSize = '28px';
          userEl.style.lineHeight = '1';

          new maplibregl.Marker({ element: userEl })
            .setLngLat([longitude, latitude])
            .addTo(map);

          // Search nearby toilets
          searchNearbyToilets(latitude, longitude);
          setLoading(false);
        });

        map.on('error', () => {
          setError('地图加载失败，请检查网络连接');
          setLoading(false);
        });
      },
      (err) => {
        setError(err.code === 1 ? '请允许位置权限以使用地图功能' : '无法获取位置信息');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOffline]);

  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        duration: 1000,
      });
      searchNearbyToilets(userLocation.lat, userLocation.lng);
    }
  };

  const handleNavigateToToilet = (toilet: ToiletPOI) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`,
      '_blank'
    );
  };

  if (isOffline) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <WifiOff className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">离线模式</h3>
        <p className="text-sm text-muted-foreground">地图功能需要网络连接，请连接网络后重试。</p>
        <p className="text-sm text-muted-foreground mt-1">语句库和收藏夹在离线状态下仍可使用。</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <MapPin className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">无法加载地图</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在加载地图...</p>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainerRef} className="flex-1 w-full min-h-0" />

      {/* Toilet error banner */}
      {toiletError && (
        <div className="absolute top-3 left-3 right-3 z-20">
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 flex-1">{toiletError}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 shrink-0"
              onClick={() => {
                if (userLocation) {
                  setToiletError(null);
                  searchNearbyToilets(userLocation.lat, userLocation.lng);
                }
              }}
            >
              重试
            </Button>
          </div>
        </div>
      )}

      {/* Recenter button */}
      {userLocation && (
        <Button
          size="icon"
          className="absolute bottom-24 right-4 h-10 w-10 rounded-full shadow-lg z-10"
          onClick={handleRecenter}
        >
          <Navigation className="h-5 w-5" />
        </Button>
      )}

      {/* Toilets list */}
      {toilets.length > 0 && (
        <div className="absolute bottom-20 left-0 right-0 px-4 z-10">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {toilets.map((toilet) => (
              <Card key={toilet.id} className="shrink-0 w-48 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToToilet(toilet)}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{toilet.name}</p>
                  {toilet.tags.wheelchair === 'yes' && (
                    <p className="text-xs text-muted-foreground mt-0.5">♿ 无障碍</p>
                  )}
                  {toilet.tags.fee && (
                    <p className="text-xs text-muted-foreground mt-0.5">💰 {toilet.tags.fee}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                    <ExternalLink className="h-3 w-3" />
                    <span>导航前往</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}