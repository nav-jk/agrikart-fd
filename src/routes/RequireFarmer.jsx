import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const RequireFarmer = ({ children }) => {
  const { user } = useAuth();
  return user?.is_farmer ? children : <Navigate to="/" />;
};

export default RequireFarmer;
