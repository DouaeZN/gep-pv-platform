import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    localStorage.getItem('access_token')
  );
  const navigate = useNavigate();

  const login = async (username, password) => {
    const res = await apiLogin(username, password);
    localStorage.setItem('access_token', res.data.access);
    setToken(res.data.access);
    navigate('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);