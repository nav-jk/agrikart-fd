import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon" role="img" aria-label="logo">
        <img src="/agrikart-logo.png" alt="AgriKart Logo" className="brand-logo" />
      </span> AgriKart.ai

        </Link>
      </div>

      <div className="navbar-right">
        {/* Home Link - Always visible */}
        <Link to="/" className="nav-link">
          <i className="fas fa-home nav-icon"></i> Home
        </Link>

        {/* Farmer Dashboard Link */}
        {user?.is_farmer && (
          <Link to="/dashboard/farmer" className="nav-link">
            <i className="fas fa-tractor nav-icon"></i> Dashboard
          </Link>
        )}

        {/* Buyer Cart Link */}
        {user && !user?.is_farmer && (
          <Link to="/cart" className="nav-link">
            <i className="fas fa-shopping-cart nav-icon"></i> Cart
          </Link>
        )}

        {/* Profile Page Link */}
        {user && (
          <Link to="/me" className="nav-link">
            <i className="fas fa-user-circle nav-icon"></i> Profile
          </Link>
        )}

        {/* Logistics Dashboard Link */}
        {user?.is_logistics && (
          <Link to="/logistics/dashboard" className="nav-link">
            <i className="fas fa-shipping-fast nav-icon"></i> Logistics
          </Link>
        )}

        {/* Login/Logout Button */}
        {user ? (
          <button className="btn-logout" onClick={logout}>
            <i className="fas fa-sign-out-alt nav-icon"></i> Logout
          </button>
        ) : (
          <Link to="/login" className="nav-link nav-link-login">
            <i className="fas fa-sign-in-alt nav-icon"></i> Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
