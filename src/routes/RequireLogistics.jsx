import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RequireLogistics = ({ children }) => {
  const { user } = useAuth();

  const isLogistics = user && !user.is_farmer && !user.is_buyer;

  return isLogistics ? children : <Navigate to="/" replace />;
};

export default RequireLogistics;
