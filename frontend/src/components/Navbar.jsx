import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun } from '@fortawesome/free-solid-svg-icons';

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <FontAwesomeIcon icon={faSun} style={{ marginRight: '8px' }} />
        GEP Monitor
      </div>
      <div style={styles.links}>
        <Link to="/dashboard" style={styles.link}>Dashboard</Link>
        <Link to="/map" style={styles.link}>Carte</Link>
        <button onClick={logout} style={styles.logout}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px',
    height: '60px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  brand: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f0c040',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '15px',
  },
  logout: {
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};