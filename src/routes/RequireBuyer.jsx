import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const RequireBuyer = ({ children }) => {
  const { user } = useAuth();
  return user && !user.is_farmer ? children : <Navigate to="/" />;
};

export default RequireBuyer;
