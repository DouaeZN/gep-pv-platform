import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSystemDetail } from '../api';
import Navbar from '../components/Navbar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

export default function SystemDetail() {
  const { systemId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSystemDetail(systemId, days)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [systemId, days]);

  // Formater les timestamps pour l'affichage
  const formatDC = data?.dc?.map((d) => ({
    ...d,
    time: format(new Date(d.timestamp), 'dd/MM HH:mm'),
  })) || [];

  const formatAC = data?.ac?.map((d) => ({
    ...d,
    time: format(new Date(d.timestamp), 'dd/MM HH:mm'),
  })) || [];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
      <Navbar />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button onClick={() => navigate('/dashboard')} style={styles.back}>
            ← Retour
          </button>
          <div>
            <h1 style={styles.title}>{data?.name || systemId}</h1>
            <p style={styles.subtitle}>Données de production</p>
          </div>

          {/* Sélecteur de période */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={styles.select}
          >
            <option value={1}>Dernières 24h</option>
            <option value={7}>7 derniers jours</option>
            <option value={14}>14 derniers jours</option>
            <option value={30}>30 derniers jours</option>
          </select>
        </div>

        {loading ? (
          <p style={styles.loading}>Chargement des données...</p>
        ) : (
          <div style={styles.charts}>

            {/* Graphique 1 — Puissance DC */}
            <ChartCard title="Puissance DC (kW)">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formatDC}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis unit=" kW" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="dc_power_kw"
                    name="Puissance DC"
                    stroke="#e67e22"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Graphique 2 — Tension et courant DC */}
            <ChartCard title="Tension DC (V) & Courant DC (A)">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formatDC}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" unit=" V" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit=" A" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="dc_voltage_v"
                    name="Tension DC (V)" stroke="#3498db" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="dc_current_a"
                    name="Courant DC (A)" stroke="#9b59b6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Graphique 3 — Puissance et énergie AC */}
            <ChartCard title="Puissance AC (kW) & Énergie AC (kWh)">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formatAC}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" unit=" kW" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit=" kWh" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="ac_power_kw"
                    name="Puissance AC (kW)" stroke="#27ae60" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="ac_energy_kwh"
                    name="Énergie AC (kWh)" stroke="#1abc9c" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Graphique 4 — Irradiance */}
            <ChartCard title="Irradiance solaire (W/m²)">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formatDC}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis unit=" W/m²" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="irradiance_wm2"
                    name="Irradiance (W/m²)" stroke="#f39c12" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Graphique 5 — Facteur de puissance */}
            <ChartCard title="Facteur de puissance & Fréquence AC (Hz)">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={formatAC}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" domain={[0.9, 1]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" unit=" Hz" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="power_factor"
                    name="Facteur de puissance" stroke="#e74c3c" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="ac_frequency_hz"
                    name="Fréquence AC (Hz)" stroke="#2980b9" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <h3 style={{ margin: '0 0 16px', color: '#1a1a2e', fontSize: '16px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

const styles = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px',
    flexWrap: 'wrap',
  },
  back: {
    background: 'none',
    border: '1.5px solid #1a1a2e',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  title: { margin: 0, fontSize: '24px', color: '#1a1a2e' },
  subtitle: { margin: 0, color: '#666', fontSize: '14px' },
  select: {
    marginLeft: 'auto',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1.5px solid #ddd',
    fontSize: '14px',
    cursor: 'pointer',
  },
  charts: { display: 'flex', flexDirection: 'column', gap: '24px' },
  loading: { textAlign: 'center', padding: '60px', color: '#666' },
};