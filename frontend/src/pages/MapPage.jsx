import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCircleInfo,
  faTemperatureHalf,
} from '@fortawesome/free-solid-svg-icons';

if (!document.getElementById('fa-cdn')) {
  const link = document.createElement('link');
  link.id = 'fa-cdn';
  link.rel = 'stylesheet';
  link.href =
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
  document.head.appendChild(link);
}

const GEP_CENTER = [32.2226, -7.9279];
const GEP_ZOOM = 19;

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const thermalLayerRef = useRef(null);

  const [status, setStatus] = useState('Initialisation...');
  const [loading, setLoading] = useState(false);
  const [thermalVisible, setThermalVisible] = useState(false);
  const [tifLoaded, setTifLoaded] = useState(false);

  useEffect(() => {
    if (mapInstance.current) return;
    if (!mapRef.current) return;

    mapRef.current.innerHTML = '';

    const map = L.map(mapRef.current, {
      center: GEP_CENTER,
      zoom: GEP_ZOOM,
      minZoom: 10,
      maxZoom: 24,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 120,
    });

    mapInstance.current = map;

    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap', maxZoom: 24, maxNativeZoom: 19 }
    );
    const satellite = L.tileLayer(
      'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      { attribution: '© Google', maxZoom: 24, maxNativeZoom: 21 }
    );
    const terrain = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenTopoMap', maxZoom: 17 }
    );
    osm.addTo(map);

    const token = localStorage.getItem('access_token');

    const orthoTiles = L.tileLayer(
      `http://localhost:8000/api/orthomap/tiles/{z}/{x}/{y}/`,
      {
        attribution: '© GEP Drone Survey',
        minZoom: 10,
        maxZoom: 24,
        maxNativeZoom: 24,
        tileSize: 256,
        keepBuffer: 2,
        updateWhenIdle: false,
        updateWhenZooming: false,
      }
    );

    orthoTiles.createTile = function (coords, done) {
      const tile = document.createElement('img');
      tile.crossOrigin = 'anonymous';
      const url = this.getTileUrl(coords);
      const controller = new AbortController();
      tile._abortController = controller;

      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.blob();
        })
        .then((blob) => {
          tile.src = URL.createObjectURL(blob);
          done(null, tile);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') done(e, tile);
        });

      return tile;
    };

    orthoTiles.on('tileunload', (e) => {
      const ctrl = e.tile._abortController;
      if (ctrl) ctrl.abort();
    });

    orthoTiles.addTo(map);

    L.control
      .layers(
        { OpenStreetMap: osm, Satellite: satellite, Terrain: terrain },
        { 'Orthomosaïque RGB': orthoTiles },
        { position: 'topright' }
      )
      .addTo(map);

    L.control.scale({ imperial: false }).addTo(map);

    loadSystemsGeoJSON(mapInstance, token);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  async function loadSystemsGeoJSON(mapRef, token) {
    setStatus('Chargement des systèmes...');

    const mapAlive = () => mapRef.current !== null;

    try {
      const res = await fetch(
        'http://localhost:8000/api/orthomap/systems.geojson',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!mapAlive()) return;

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      }

      const geojson = await res.json();

      if (!mapAlive()) return;

      const systemsMap = {};
      for (const feature of geojson.features) {
        const sid = feature.properties.system;
        if (!systemsMap[sid]) {
          systemsMap[sid] = {
            properties: feature.properties,
            geometries: [],
          };
        }
        systemsMap[sid].geometries.push(feature.geometry);
      }

      for (const sid of Object.keys(systemsMap)) {
        const { properties: p, geometries } = systemsMap[sid];

        const systemGroup = L.featureGroup();

        for (const geom of geometries) {
          const subLayer = L.geoJSON(
            { type: 'Feature', properties: {}, geometry: geom },
            {
              style: {
                color: '#00e5ff',
                weight: 2.5,
                fillColor: '#00e5ff',
                fillOpacity: 0.15,
                dashArray: '8 4',
              },
            }
          );
          systemGroup.addLayer(subLayer);
        }

        const popupContent = `
          <div style="min-width:230px;font-family:sans-serif">
            <div style="background:#1a1a2e;color:white;padding:10px 14px;
                        margin:-14px -20px 12px;border-radius:4px 4px 0 0;
                        display:flex;justify-content:space-between;align-items:center">
              <strong>${p.name}</strong>
              <span style="background:#f0c040;color:#1a1a2e;padding:2px 8px;
                           border-radius:10px;font-size:12px;font-weight:bold">
                ${p.system}
              </span>
            </div>
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr>
                <td style="color:#666;padding:4px 0">
                  <i class="fa-solid fa-bolt" style="margin-right:6px;color:#f0c040"></i>Capacité
                </td>
                <td style="text-align:right;font-weight:bold">${p.capacity_kwc} kWc</td>
              </tr>
              <tr>
                <td style="color:#666;padding:4px 0">
                  <i class="fa-solid fa-calendar-check" style="margin-right:6px;color:#f0c040"></i>Mise en service
                </td>
                <td style="text-align:right">${p.commissioning_date}</td>
              </tr>
              <tr>
                <td style="color:#666;padding:4px 0">
                  <i class="fa-solid fa-angle-up" style="margin-right:6px;color:#f0c040"></i>Inclinaison
                </td>
                <td style="text-align:right">${p.inclination}°</td>
              </tr>
              <tr>
                <td style="color:#666;padding:4px 0">
                  <i class="fa-solid fa-compass" style="margin-right:6px;color:#f0c040"></i>Orientation
                </td>
                <td style="text-align:right">${p.orientation}</td>
              </tr>
            </table>
            <hr style="margin:10px 0;border:none;border-top:1px solid #eee"/>
            <div style="display:flex;justify-content:space-around;text-align:center;
                        background:#f8f9fa;padding:10px;border-radius:6px">
              <div>
                <div style="font-size:11px;color:#666">
                  <i class="fa-solid fa-plug" style="margin-right:4px"></i>Puissance AC
                </div>
                <div style="font-size:20px;font-weight:bold;color:#27ae60">
                  ${p.last_ac_power_kw?.toFixed(1)} kW
                </div>
              </div>
              <div style="width:1px;background:#eee"></div>
              <div>
                <div style="font-size:11px;color:#666">
                  <i class="fa-solid fa-sun" style="margin-right:4px"></i>Énergie du jour
                </div>
                <div style="font-size:20px;font-weight:bold;color:#27ae60">
                  ${p.daily_energy_kwh?.toFixed(1)} kWh
                </div>
              </div>
            </div>
            <button
              onclick="window.location.href='/system/${p.system}'"
              style="width:100%;margin-top:12px;padding:10px;background:#1a1a2e;
                     color:white;border:none;border-radius:6px;cursor:pointer;
                     font-size:13px;font-weight:bold"
            >
              <i class="fa-solid fa-arrow-right" style="margin-right:6px"></i>Voir les détails
            </button>
          </div>
        `;

        systemGroup.bindPopup(popupContent, { maxWidth: 300 });

        const highlight = () => {
          systemGroup.eachLayer((l) => {
            if (l.setStyle) l.setStyle({ fillOpacity: 0.45, weight: 3.5, color: '#00e5ff', dashArray: '' });
            if (l.eachLayer)
              l.eachLayer((sub) => sub.setStyle({ fillOpacity: 0.45, weight: 3.5, color: '#00e5ff', dashArray: '' }));
          });
        };

        const resetStyle = () => {
          systemGroup.eachLayer((l) => {
            if (l.setStyle) l.setStyle({ fillOpacity: 0.15, weight: 2.5, color: '#00e5ff', dashArray: '8 4' });
            if (l.eachLayer)
              l.eachLayer((sub) => sub.setStyle({ fillOpacity: 0.15, weight: 2.5, color: '#00e5ff', dashArray: '8 4' }));
          });
        };

        systemGroup.on('mouseover', highlight);
        systemGroup.on('mouseout', resetStyle);
        systemGroup.on('click', (e) => {
          systemGroup.openPopup(e.latlng);
        });

        systemGroup.addTo(mapRef.current);
      }

      setTimeout(() => {
        setStatus('Carte chargée ✓');
        setTifLoaded(true);
      }, 0);
    } catch (err) {
      console.error('[loadSystemsGeoJSON]', err);
      setStatus(`Erreur GeoJSON : ${err.message}`);
    }
  }

  async function toggleThermal() {
    const map = mapInstance.current;
    if (!map) return;

    if (thermalVisible) {
      if (thermalLayerRef.current) map.removeLayer(thermalLayerRef.current);
      setThermalVisible(false);
      return;
    }

    setLoading(true);
    setStatus('Génération couche thermique...');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/orthomap/thermal/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const west = parseFloat(res.headers.get('X-Bounds-West'));
      const south = parseFloat(res.headers.get('X-Bounds-South'));
      const east = parseFloat(res.headers.get('X-Bounds-East'));
      const north = parseFloat(res.headers.get('X-Bounds-North'));

      const isUTM = Math.abs(west) > 180 || Math.abs(south) > 90;
      let swLat, swLng, neLat, neLng;
      if (isUTM) {
        const utmToWgs84 = (easting, northing, zone = 29, northern = true) => {
          const a = 6378137.0, f = 1 / 298.257223563;
          const b = a * (1 - f);
          const e2 = (a * a - b * b) / (a * a);
          const e1sq = e2 / (1 - e2);
          const k0 = 0.9996;
          const E = easting - 500000;
          const N = northern ? northing : northing - 10000000;
          const M = N / k0;
          const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
          const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
          const phi1 = mu
            + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
            + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
            + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
          const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
          const T1 = Math.tan(phi1) * Math.tan(phi1);
          const C1 = e1sq * Math.cos(phi1) * Math.cos(phi1);
          const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
          const D = E / (N1 * k0);
          const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
            D * D / 2
            - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e1sq) * D * D * D * D / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e1sq - 3 * C1 * C1) * D * D * D * D * D * D / 720
          );
          const lon = (D
            - (1 + 2 * T1 + C1) * D * D * D / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e1sq + 24 * T1 * T1) * D * D * D * D * D / 120
          ) / Math.cos(phi1);
          const latDeg = lat * 180 / Math.PI;
          const lonDeg = (zone - 1) * 6 - 180 + 3 + lon * 180 / Math.PI;
          return [latDeg, lonDeg];
        };
        [swLat, swLng] = utmToWgs84(west, south);
        [neLat, neLng] = utmToWgs84(east, north);
      } else {
        swLat = south; swLng = west;
        neLat = north; neLng = east;
      }

      const blob = await res.blob();
      const layer = L.imageOverlay(
        URL.createObjectURL(blob),
        [[swLat, swLng], [neLat, neLng]],
        { opacity: 0.75 }
      );
      layer.addTo(map);
      thermalLayerRef.current = layer;
      setThermalVisible(true);
      setStatus('Couche thermique chargée ✓');
    } catch (err) {
      console.error('[toggleThermal]', err);
      setStatus(`Erreur thermique : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={styles.bar}>
        <span style={styles.status}>
          {loading ? (
            <>
              <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: 6 }} />
              {status}
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCircleInfo} style={{ marginRight: 6, color: '#f0c040' }} />
              {status}
            </>
          )}
        </span>
        <button
          onClick={toggleThermal}
          disabled={!tifLoaded}
          style={{
            ...styles.btn,
            background: thermalVisible ? '#e74c3c' : '#7f8c8d',
            opacity: !tifLoaded ? 0.5 : 1,
            cursor: !tifLoaded ? 'not-allowed' : 'pointer',
          }}
        >
          <FontAwesomeIcon icon={faTemperatureHalf} style={{ marginRight: 6 }} />
          Thermique {thermalVisible ? 'ON' : 'OFF'}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {thermalVisible && (
          <div style={styles.legend}>
            <p style={styles.legendTitle}>
              <FontAwesomeIcon icon={faTemperatureHalf} style={{ marginRight: 6, color: '#e74c3c' }} />
              Température simulée
            </p>
            <div style={styles.gradient} />
            <div style={styles.legendRow}>
              <span>25°C</span>
              <span>75°C</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    gap: '10px',
  },
  status: {
    fontSize: '13px',
    color: '#ccc',
    flex: 1,
  },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '13px',
    fontWeight: 'bold',
    transition: 'background 0.2s',
  },
  legend: {
    position: 'absolute',
    bottom: '30px',
    right: '10px',
    background: 'rgba(255,255,255,0.95)',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 1000,
    minWidth: '160px',
  },
  legendTitle: {
    margin: '0 0 8px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  gradient: {
    height: '16px',
    borderRadius: '4px',
    marginBottom: '4px',
    background:
      'linear-gradient(to right, #2800a0, #a01050, #f04010, #f8c020, #fcffa4)',
  },
  legendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: 'bold',
  },
};