import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faSquare,
  faPlug,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

export default function SystemCard({ system }) {
  const navigate = useNavigate();

  return (
    <div style={styles.card}>
      <img
        src="https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&h=200&fit=crop"
        alt="Système PV"
        style={styles.image}
      />

      <div style={styles.header}>
        <h2 style={styles.title}>{system.name}</h2>
        <span style={styles.badge}>{system.system_id}</span>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          <FontAwesomeIcon icon={faBolt} style={{ marginRight: '8px', color: '#f0c040' }} />
          Système
        </h3>
        <div style={styles.grid}>
          <InfoRow label="Capacité" value={`${system.capacity_kwc} kWc`} />
          <InfoRow label="Mise en service" value={system.commissioning_date} />
          <InfoRow label="Inclinaison" value={`${system.inclination}°`} />
          <InfoRow label="Orientation" value={system.orientation} />
          <InfoRow label="Nb. strings" value={system.nb_strings} />
        </div>
      </div>

      {system.module && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FontAwesomeIcon icon={faSquare} style={{ marginRight: '8px', color: '#1a1a2e' }} />
            Panneaux
          </h3>
          <div style={styles.grid}>
            <InfoRow label="Marque" value={system.module.brand} />
            <InfoRow label="Modèle" value={system.module.model} />
            <InfoRow label="Technologie" value={system.module.technology} />
            <InfoRow label="Puissance" value={`${system.module.power_wc} Wc`} />
            <InfoRow label="Par string" value={system.module.nb_per_string} />
          </div>
        </div>
      )}

      {system.inverters && system.inverters.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FontAwesomeIcon icon={faPlug} style={{ marginRight: '8px', color: '#e74c3c' }} />
            Onduleurs
          </h3>
          {system.inverters.map((inv) => (
            <div key={inv.inverter_id} style={styles.inverterRow}>
              <InfoRow label="Modèle" value={`${inv.brand} ${inv.model}`} />
              <InfoRow label="Puissance AC" value={`${inv.power_kw_ac} kW`} />
              <InfoRow label="MPPT" value={inv.nb_mppt} />
              <InfoRow label="N° série" value={inv.serial_number} />
            </div>
          ))}
        </div>
      )}

      <div style={styles.liveBox}>
        <div style={styles.liveItem}>
          <span style={styles.liveLabel}>Puissance AC actuelle</span>
          <span style={styles.liveValue}>
            {system.last_ac_power_kw?.toFixed(1)} kW
          </span>
        </div>
        <div style={styles.liveItem}>
          <span style={styles.liveLabel}>Énergie aujourd'hui</span>
          <span style={styles.liveValue}>
            {system.daily_energy_kwh?.toFixed(1)} kWh
          </span>
        </div>
      </div>

      <button
        style={styles.button}
        onClick={() => navigate(`/system/${system.system_id}`)}
      >
        Voir les détails
        <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '8px' }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#666', fontSize: '13px' }}>{label}</span>
      <span style={{ fontWeight: '500', fontSize: '13px' }}>{value}</span>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s',
  },
  image: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    color: 'white',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#f0c040',
    color: '#1a1a2e',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  section: {
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
  },
  sectionTitle: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#333',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  inverterRow: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px dashed #eee',
  },
  liveBox: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '16px',
    backgroundColor: '#f8f9fa',
  },
  liveItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  liveLabel: {
    fontSize: '12px',
    color: '#666',
  },
  liveValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#27ae60',
  },
  button: {
    margin: '16px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
};