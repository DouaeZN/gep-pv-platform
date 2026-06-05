import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const GEP_CENTER = [32.232, -7.952];
const GEP_ZOOM = 15;

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const rgbLayerRef = useRef(null);
  const thermalLayerRef = useRef(null);

  const [status, setStatus] = useState('Initialisation...');
  const [loading, setLoading] = useState(false);
  const [rgbVisible, setRgbVisible] = useState(true);
  const [thermalVisible, setThermalVisible] = useState(false);
  const [tifLoaded, setTifLoaded] = useState(false);

  useEffect(() => {
    if (mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: GEP_CENTER,
      zoom: GEP_ZOOM,
    });

    const osm = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenStreetMap', maxZoom: 19 }
    );
    const satellite = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 19 }
    );
    const terrain = L.tileLayer(
      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      { attribution: '© OpenTopoMap', maxZoom: 17 }
    );

    osm.addTo(map);
    L.control.layers(
      { 'OpenStreetMap': osm, 'Satellite': satellite, 'Terrain': terrain },
      {},
      { position: 'topright' }
    ).addTo(map);
    L.control.scale({ imperial: false }).addTo(map);

    mapInstance.current = map;
    loadRGB(map);
  }, []);

  async function loadRGB(map) {
    setLoading(true);
    setStatus("Chargement de l'orthomosaïque...");
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/orthomap/rgb/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Erreur serveur');

      const west  = parseFloat(res.headers.get('X-Bounds-West'));
      const south = parseFloat(res.headers.get('X-Bounds-South'));
      const east  = parseFloat(res.headers.get('X-Bounds-East'));
      const north = parseFloat(res.headers.get('X-Bounds-North'));
      const bounds = [[south, west], [north, east]];

      const blob = await res.blob();
      const imgUrl = URL.createObjectURL(blob);

      const layer = L.imageOverlay(imgUrl, bounds, { opacity: 0.85 });
      layer.addTo(map);
      rgbLayerRef.current = layer;
      map.fitBounds(bounds);

      setTifLoaded(true);
      setStatus('Orthomosaïque chargée');
    } catch (err) {
      setStatus('GeoTIFF non disponible — carte de base affichée.');
    } finally {
      setLoading(false);
    }
  }

  async function loadThermal() {
    if (thermalLayerRef.current) {
      thermalLayerRef.current.addTo(mapInstance.current);
      setThermalVisible(true);
      return;
    }

    setLoading(true);
    setStatus('Génération de la couche thermique...');
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/orthomap/thermal/', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const west  = parseFloat(res.headers.get('X-Bounds-West'));
      const south = parseFloat(res.headers.get('X-Bounds-South'));
      const east  = parseFloat(res.headers.get('X-Bounds-East'));
      const north = parseFloat(res.headers.get('X-Bounds-North'));
      const bounds = [[south, west], [north, east]];

      const blob = await res.blob();
      const imgUrl = URL.createObjectURL(blob);

      const layer = L.imageOverlay(imgUrl, bounds, { opacity: 0.75 });
      layer.addTo(mapInstance.current);
      thermalLayerRef.current = layer;
      setThermalVisible(true);
      setStatus('Couche thermique chargée');
    } catch (err) {
      setStatus('Erreur couche thermique.');
    } finally {
      setLoading(false);
    }
  }

  function toggleRGB() {
    if (!rgbLayerRef.current) return;
    if (rgbVisible) {
      mapInstance.current.removeLayer(rgbLayerRef.current);
    } else {
      rgbLayerRef.current.addTo(mapInstance.current);
    }
    setRgbVisible(!rgbVisible);
  }

  function toggleThermal() {
    if (!thermalVisible) {
      loadThermal();
    } else {
      mapInstance.current.removeLayer(thermalLayerRef.current);
      setThermalVisible(false);
    }
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div style={styles.controlBar}>
        <span style={styles.status}>
          {loading && <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }} />}
          {!loading && <i className="fa-solid fa-circle-check" style={{ marginRight: '6px', color: '#27ae60' }} />}
          {status}
        </span>
        <div style={styles.controls}>
          <button
            onClick={toggleRGB}
            disabled={!tifLoaded}
            style={{ ...styles.btn, background: rgbVisible ? '#27ae60' : '#7f8c8d' }}
          >
            <i className="fa-solid fa-satellite" style={{ marginRight: '6px' }} />
            RGB {rgbVisible ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={toggleThermal}
            disabled={!tifLoaded}
            style={{ ...styles.btn, background: thermalVisible ? '#e74c3c' : '#7f8c8d' }}
          >
            <i className="fa-solid fa-temperature-half" style={{ marginRight: '6px' }} />
            Thermique {thermalVisible ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {thermalVisible && (
          <div style={styles.legend}>
            <p style={styles.legendTitle}>
              <i className="fa-solid fa-temperature-half" style={{ marginRight: '6px', color: '#e74c3c' }} />
              Température simulée
            </p>
            <div style={styles.gradient} />
            <div style={styles.legendRow}>
              <span>25°C</span><span>75°C</span>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

const styles = {
  controlBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 20px', backgroundColor: '#1a1a2e', color: 'white',
    gap: '10px', flexWrap: 'wrap',
  },
  status: { fontSize: '13px', color: '#ccc', flex: 1, display: 'flex', alignItems: 'center' },
  controls: { display: 'flex', gap: '12px' },
  btn: {
    padding: '8px 16px', border: 'none', borderRadius: '6px',
    color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
    display: 'flex', alignItems: 'center',
  },
  legend: {
    position: 'absolute', bottom: '30px', right: '10px',
    background: 'rgba(255,255,255,0.95)', padding: '12px 16px',
    borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 1000, minWidth: '160px',
  },
  legendTitle: { margin: '0 0 8px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  gradient: {
    height: '16px', borderRadius: '4px', marginBottom: '4px',
    background: 'linear-gradient(to right, #2800a0, #a01050, #f04010, #f8c020, #fcffa4)',
  },
  legendRow: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: '12px', fontWeight: 'bold',
  },
};