import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faRightToBracket, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError('Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <FontAwesomeIcon icon={faSun} style={styles.sunIcon} />
        </div>
        <h1 style={styles.title}>GEP Monitor</h1>
        <p style={styles.subtitle}>Green Energy Park — Benguerir</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin@gep.ma"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '8px' }} />
                Connexion...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faRightToBracket} style={{ marginRight: '8px' }} />
                Se connecter
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  card: {
    backgroundColor: 'white',
    padding: '48px 40px',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center',
  },
  logo: { fontSize: '48px', marginBottom: '8px' },
  sunIcon: {
    fontSize: '48px',
    color: '#f5a623',
  },
  title: { margin: '0 0 4px', color: '#1a1a2e', fontSize: '28px' },
  subtitle: { color: '#888', fontSize: '14px', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' },
  label: { fontSize: '14px', fontWeight: '500', color: '#333' },
  input: {
    padding: '12px 16px',
    border: '1.5px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
  },
  error: {
    color: '#e74c3c',
    fontSize: '14px',
    margin: 0,
    backgroundColor: '#fdf0f0',
    padding: '10px',
    borderRadius: '6px',
  },
  button: {
    padding: '14px',
    backgroundColor: '#1a1a2e',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
};