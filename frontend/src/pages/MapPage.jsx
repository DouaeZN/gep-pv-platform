import Navbar from '../components/Navbar';

export default function MapPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Navbar />
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Carte interactive</h1>
        <p style={{ color: '#666' }}>
          La carte Leaflet avec le GeoTIFF sera ajoutée à l'étape suivante.
        </p>
      </div>
    </div>
  );
}