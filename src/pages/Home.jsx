import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Home.css'; // Your new enhanced styles

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is logged in, redirect them to their respective dashboard
    if (user) {
      if (user.is_farmer) {
        navigate('/dashboard/farmer');
      } else if (user.is_buyer) {
        navigate('/dashboard/buyer');
      } else if (user.is_logistics) { // Assuming a logistics role exists
        navigate('/logistics/dashboard');
      }
      // If user is logged in but doesn't fit any role, perhaps navigate to a general user profile or buyer dashboard
      else {
        navigate('/me'); // Or a default landing for logged-in users
      }
    }
  }, [user, navigate]); // Dependencies: user object and navigate function

  // Function to handle image errors and set a placeholder
  const handleImageError = (e) => {
    e.target.onerror = null; // Prevent infinite loop if placeholder also fails
    e.target.src = "https://placehold.co/400x300/e0e0e0/555555?text=Image+Missing";
    e.target.style.objectFit = 'contain'; // Adjust fit for placeholder
    e.target.style.background = '#f8f8f8'; // Add a fallback background for images
  };

  return (
    <div className="home-page-wrapper">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Freshness Delivered <span className="emoji">🍅🥦</span></h1>
          <p className="hero-description">Shop directly from India's best local farms — no middlemen, just better food.</p>
          <p className="hero-subline">Welcome to <strong className="brand-name">AgriKart.ai</strong> — your personalized agri-commerce platform.</p>

          <div className="auth-action-buttons">
            <Link className="btn btn-primary" to="/signup/buyer">Sign Up</Link>
            <Link className="btn btn-outline" to="/login">Login</Link>
          </div>
        </div>
        <div className="hero-image-container">
          {/* Using the uploaded image_760906.jpg */}
          <img 
            src="/hero-veg.jpg" 
            alt="AgriKart Fresh Produce Field" 
            className="hero-image" 
            onError={handleImageError} 
          />
        </div>
      </section>

      {/* Category Section */}
      <section className="category-section">
        <h2 className="section-heading">Shop by Category</h2>
        <div className="category-grid">
          {[
            { label: 'Fruits', img: '/fruits.jpg' },
            { label: 'Vegetables', img: '/vegetables.jpg' },
            { label: 'Organic', img: '/organic.jpg' },
            { label: 'Dairy & Eggs', img: '/dairy.jpg' }, 
            { label: 'Grains & Pulses', img: '/grains.jpg' },
          ].map((cat, index) => (
            <div
              className="category-card"
              key={index}
              onClick={() => navigate(`/login?redirect=/dashboard/buyer&category=${cat.label}`)}
              role="button" 
              tabIndex="0" 
            >
              <div className="category-image-wrapper">
                <img 
                  src={cat.img} 
                  alt={cat.label} 
                  className="category-image" 
                  onError={handleImageError} 
                />
              </div>
              <p className="category-label">{cat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-heading">Why Choose AgriKart.ai?</h2>
        <div className="features-grid">
          <div className="feature-item">
            <i className="fas fa-hand-holding-heart feature-icon"></i>
            <h3 className="feature-title">Direct from Farms</h3>
            <p className="feature-description">Source the freshest produce directly from local farmers, ensuring quality and fair prices.</p>
          </div>
          <div className="feature-item">
            <i className="fas fa-truck-fast feature-icon"></i>
            <h3 className="feature-title">Fast & Reliable Delivery</h3>
            <p className="feature-description">Our efficient logistics ensure your orders reach you quickly and in perfect condition.</p>
          </div>
          <div className="feature-item">
            <i className="fas fa-seedling feature-icon"></i>
            <h3 className="feature-title">Sustainable & Organic</h3>
            <p className="feature-description">Support sustainable farming practices and access a wide range of organic products.</p>
          </div>
        </div>
      </section>

      {/* Call to Action for Farmers/Logistics */}
      <section className="cta-section">
        <h2 className="section-heading">Join Our Network!</h2>
        <p className="cta-description">Whether you're a farmer looking to reach new markets or a logistics provider seeking opportunities, AgriKart.ai is your partner in growth.</p>
        <div className="cta-buttons">
          <Link className="btn btn-cta-farmer" to="/signup/farmer">Register as Farmer</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; {new Date().getFullYear()} AgriKart.ai. All rights reserved.</p>
        <div className="footer-links">
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>

    </div>
  );
};

export default Home;
