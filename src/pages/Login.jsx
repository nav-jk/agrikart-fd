import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Ensure Link is imported
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false); // New loading state
  const [loginError, setLoginError] = useState(''); // New error message state
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const query = new URLSearchParams(location.search);
  const redirect = query.get('redirect') || '/';
  const category = query.get('category'); // For specific redirects

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setLoginError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading
    setLoginError(''); // Clear previous errors

    try {
      const res = await api.post('/api/v1/auth/token/', form);
      login(res.data.access); // Store token and update auth context

      // Decode user data from the token
      const user = JSON.parse(atob(res.data.access.split('.')[1]));
      console.log('Decoded login user:', user);

      // Redirect based on user role
      user.is_logistics = !user.is_buyer && !user.is_farmer;
      if (user.is_logistics) { // Check for logistics first
        navigate('/logistics/dashboard');
      } else if (user.is_farmer) {
        navigate('/dashboard/farmer');
      } else { // Default to buyer dashboard or specified redirect
        const target = category
          ? `${redirect}?category=${encodeURIComponent(category)}`
          : redirect;
        navigate(target);
      }

    } catch (err) {
      console.error('Login failed:', err.response?.data || err.message);
      // Display a user-friendly error message on the UI
      if (err.response && err.response.data && err.response.data.detail) {
        setLoginError(err.response.data.detail);
      } else {
        setLoginError('Login failed. Please check your username and password.');
      }
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="page-wrapper login-page-wrapper">
      <div className="login-container">
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-header">
            <h2 className="login-title">Sign in to AgriKart.ai</h2>
          </div>

          {loginError && <p className="login-error-message">{loginError}</p>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              className="form-input"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="form-input"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <p className="login-footer">
            New to AgriKart? <Link to="/signup/buyer" className="signup-link">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
