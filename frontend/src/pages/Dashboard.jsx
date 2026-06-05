import { useEffect, useState } from 'react';
import { getSystems } from '../api';
import SystemCard from '../components/SystemCard';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getSystems()
      .then((res) => setSystems(res.data))
      .catch(() => setError('Erreur de chargement des systèmes.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Navbar />

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Vue d'ensemble — 4 Systèmes PV</h1>
          <p style={styles.subtitle}>
            Green Energy Park · Benguerir, Maroc
          </p>
        </div>

        {loading && (
          <div style={styles.center}>
            <p>Chargement des systèmes...</p>
          </div>
        )}

        {error && (
          <div style={styles.center}>
            <p style={{ color: 'red' }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div style={styles.grid}>
            {systems.map((system) => (
              <SystemCard key={system.system_id} system={system} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    margin: '0 0 8px',
    fontSize: '28px',
    color: '#1a1a2e',
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '24px',
  },
  center: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
  },
};