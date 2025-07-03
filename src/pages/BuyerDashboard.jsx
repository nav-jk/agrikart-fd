import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import '../styles/BuyerDashboard.css';

const BuyerDashboard = () => {
  const [produce, setProduce] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [addedToCart, setAddedToCart] = useState({});
  const [quantityError, setQuantityError] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // New state for fetch errors

  const { user } = useAuth();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const categoryFilter = query.get('category');

  useEffect(() => {
    setLoading(true);
    setFetchError(null); // Reset error on new fetch
    api.get('/api/v1/farmer/') // Assuming this endpoint returns an array of farmers, each with a 'produce' array
      .then((res) => {
        // Flatten the produce from all farmers into a single array for easier mapping
        const allProduce = res.data.flatMap(farmer => 
          farmer.produce.map(item => ({
            ...item,
            farmerName: farmer.name, // Attach farmer's name to each produce item
            // Placeholder image URL - in a real app, this would come from your backend
            imageUrl: `https://placehold.co/400x300/e0ffe0/1b5e20?text=${item.name.replace(/\s/g, '+')}`
          }))
        );
        setProduce(allProduce);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch produce:', err);
        setFetchError('Failed to load marketplace items. Please try again later.');
        setLoading(false);
      });
  }, []); // Empty dependency array means this runs once on component mount

  const handleQuantityChange = (produceId, value) => {
    setQuantities(prev => ({ ...prev, [produceId]: value }));
    setQuantityError(prev => ({ ...prev, [produceId]: false })); // Clear error on change
  };

  const handleAddToCart = async (produceId, maxQuantity) => {
    const quantity = parseInt(quantities[produceId] || 0);

    // Input validation
    if (!quantity || quantity <= 0 || quantity > maxQuantity) {
      setQuantityError(prev => ({ ...prev, [produceId]: true }));
      // Provide a more specific alert based on validation
      if (!quantity || quantity <= 0) alert('Please select a valid quantity (at least 1).');
      else alert(`Quantity exceeds available stock of ${maxQuantity}.`);
      return;
    }

    try {
      // Ensure user is authenticated before adding to cart
      if (!user) {
        alert('Please log in to add items to your cart.');
        return;
      }

      await api.post('/api/v1/cart/', {
        produce: produceId,
        quantity,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`, // Ensure token is sent
        },
      });

      // Reset quantity input and show "Added" confirmation
      setQuantities(prev => ({ ...prev, [produceId]: '' }));
      setAddedToCart(prev => ({ ...prev, [produceId]: true }));
      setQuantityError(prev => ({ ...prev, [produceId]: false }));

      // Hide "Added" confirmation after a short delay
      setTimeout(() => {
        setAddedToCart(prev => ({ ...prev, [produceId]: false }));
      }, 2000); // 2 seconds

      alert('Item added to cart successfully!'); // User friendly feedback

    } catch (err) {
      console.error('Add to cart error:', err.response?.data || err.message);
      // More specific error handling based on backend response
      if (err.response && err.response.data && err.response.data.error) {
        alert(`Error adding to cart: ${err.response.data.error}`);
      } else {
        alert('Error adding to cart. Please make sure you are logged in as a buyer and try again.');
      }
    }
  };

  // Filter produce based on category selected from URL
  const filteredProduce = produce.filter(item =>
    !categoryFilter || 
    (item.category && item.category.toLowerCase() === categoryFilter.toLowerCase())
  );

  return (
    <div className="container">
      <h2 className="marketplace-title">Marketplace {categoryFilter ? `- ${categoryFilter}` : ''}</h2>

      {loading ? (
        <p className="loading-message">Loading fresh produce for you...</p>
      ) : fetchError ? (
        <p className="error-message">{fetchError}</p>
      ) : filteredProduce.length === 0 ? (
        <p className="empty-message">No produce available in this category right now.</p>
      ) : (
        <div className="produce-grid">
          {filteredProduce.map((item) => (
            <div className="produce-card" key={item.id}>
              <div className="produce-image-container">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="produce-image" 
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/400x300/cccccc/333333?text=Image+Not+Found"; }} // Fallback image
                />
                {item.category && (
                  <span className="produce-category-tag">{item.category}</span>
                )}
              </div>
              <div className="produce-details">
                <h3 className="produce-name">{item.name}</h3>
                <p className="produce-price">₹{parseFloat(item.price).toFixed(2)} / unit</p>
                <p className="produce-stock">Stock: {item.quantity} units</p>
                <p className="produce-farmer"><strong>Farmer:</strong> {item.farmerName}</p>

                <div className="quantity-cart-actions">
                  <select
                    className={`qty-select ${quantityError[item.id] ? 'error' : ''}`}
                    value={quantities[item.id] || ''}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  >
                    <option value="">Qty</option>
                    {/* Limit quantity to available stock or a reasonable max (e.g., 20) */}
                    {[...Array(Math.min(item.quantity, 20)).keys()].map((i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`add-cart-btn ${addedToCart[item.id] ? 'added' : ''}`}
                    onClick={() => handleAddToCart(item.id, item.quantity)}
                    disabled={addedToCart[item.id] || item.quantity <= 0} // Disable if already added or no stock
                  >
                    {addedToCart[item.id] ? 'Added ✅' : (item.quantity <= 0 ? 'Out of Stock' : 'Add to Cart')}
                  </button>
                </div>

                {quantityError[item.id] && (
                  <p className="qty-error-text">Please select a valid quantity.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
