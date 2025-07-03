import { createContext, useContext, useEffect, useState } from 'react';
import { getDecodedUser } from '../utils/token';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('access'));
  const [user, setUser] = useState(getDecodedUser(token));

  useEffect(() => {
    if (token) {
      localStorage.setItem('access', token);
      setUser(getDecodedUser(token));
    } else {
      localStorage.removeItem('access');
      setUser(null);
    }
  }, [token]);

  const login = (newToken) => setToken(newToken);
  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
