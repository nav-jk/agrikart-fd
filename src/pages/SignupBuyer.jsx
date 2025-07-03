import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import '../styles/SignupBuyer.css';

const SignupBuyer = () => {
  const [form, setForm] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('none');

  const navigate = useNavigate();

  const checkPasswordStrength = (password) => {
    let strength = 0;
    const minLength = 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (password.length >= minLength) strength += 1;
    if (hasLower && hasUpper) strength += 1;
    else if (hasLower || hasUpper) strength += 0.5;
    if (hasNumber) strength += 1;
    if (hasSpecial) strength += 1;

    if (password.length === 0) return 'none';
    else if (strength < 2) return 'weak';
    else if (strength < 3.5) return 'medium';
    else if (strength < 4.5) return 'strong';
    else return 'excellent';
  };

  const getStrengthBarWidthClass = () => {
    switch (passwordStrength) {
      case 'weak': return 'strength-bar-weak';
      case 'medium': return 'strength-bar-medium';
      case 'strong': return 'strength-bar-strong';
      case 'excellent': return 'strength-bar-excellent';
      default: return 'strength-bar-none';
    }
  };

  const getStrengthTextColorClass = () => {
    switch (passwordStrength) {
      case 'weak': return 'text-red';
      case 'medium': return 'text-yellow';
      case 'strong': return 'text-green';
      case 'excellent': return 'text-blue';
      default: return 'text-gray';
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      case 'excellent': return 'Excellent';
      default: return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setSignupError('');

    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSignupError('');

    const currentPasswordStrength = checkPasswordStrength(form.password);
    if (currentPasswordStrength === 'none' || currentPasswordStrength === 'weak') {
      setSignupError('Password is too weak. It must be at least 8 characters long and include a mix of letters and numbers.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/v1/auth/signup/', {
        username: form.username,
        email: form.email,
        phone_number: form.phone_number,
        password: form.password,
        address: form.address,
        is_buyer: true
      });
      alert('Account created successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      console.error('Signup error:', err.response?.data || err.message);
      if (err.response && err.response.data) {
        const errors = err.response.data;
        if (errors.username) {
          setSignupError(`Username: ${errors.username[0]}`);
        } else if (errors.email) {
          setSignupError(`Email: ${errors.email[0]}`);
        } else if (errors.phone_number) {
          setSignupError(`Phone Number: ${errors.phone_number[0]}`);
        } else if (errors.password) {
          setSignupError(`Password: ${errors.password[0]}`);
        } else if (errors.address) {
          setSignupError(`Address: ${errors.address[0]}`);
        } else if (errors.detail) {
          setSignupError(errors.detail);
        } else {
          setSignupError('Signup failed. Please check your details and try again.');
        }
      } else {
        setSignupError('Signup failed. A network error occurred or the server is unreachable.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper signup-page-wrapper">
      <div className="signup-container">
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-header">
            <h2 className="signup-title">Sign Up</h2>
          </div>

          {signupError && <p className="signup-error-message animate-fade-in">{signupError}</p>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
              className="form-input"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              className="form-input"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={form.phone_number}
              onChange={handleChange}
              placeholder="e.g., +91 9876543210"
              required
              className="form-input"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
                className="form-input password-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="password-toggle-button"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.875m-.002-2.32A8.913 8.913 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.05 10.05 0 01-1.563 3.875M18.5 12a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                  </svg>
                ) : (
                  <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {form.password.length > 0 && (
              <div className="password-strength-feedback">
                <div className="strength-bar-container">
                  <div className={`strength-bar ${getStrengthBarWidthClass()}`}></div>
                </div>
                <p className={`strength-text ${getStrengthTextColorClass()}`}>
                  Strength: {getStrengthText()}
                </p>
                <ul className="password-criteria-list">
                  <li className={form.password.length >= 8 ? 'criteria-met' : 'criteria-unmet'}>At least 8 characters</li>
                  <li className={/[a-z]/.test(form.password) && /[A-Z]/.test(form.password) ? 'criteria-met' : 'criteria-unmet'}>Mix of uppercase and lowercase letters</li>
                  <li className={/\d/.test(form.password) ? 'criteria-met' : 'criteria-unmet'}>Includes numbers</li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(form.password) ? 'criteria-met' : 'criteria-unmet'}>Includes special characters</li>
                </ul>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="address">Delivery Address</label>
            <textarea
              id="address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Your full delivery address including city, state, and pin code"
              required
              rows="3"
              className="form-input form-textarea"
              autoComplete="street-address"
            ></textarea>
          </div>

          <button type="submit" className="signup-button" disabled={loading}>
            {loading ? 'Registering...' : 'Sign Up as Buyer'}
          </button>

          <p className="signup-footer">
            Already have an account? <Link to="/login" className="login-link">Sign In here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupBuyer;
