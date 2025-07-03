import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/api'; // Assuming this is your axios instance
import { useAuth } from '../context/AuthContext';
import '../styles/BuyerDashboard.css'; // Your existing CSS

const BuyerDashboard = () => {
  const [produce, setProduce] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [addedToCart, setAddedToCart] = useState({});
  const [quantityError, setQuantityError] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); // State for main data fetch errors

  const { user } = useAuth();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const categoryFilter = query.get('category');

  // Placeholder for Pixabay API Key. REPLACE WITH YOUR ACTUAL KEY IN A REAL APP.
  // Ideally, this should be handled server-side to prevent exposure.
  const PIXABAY_API_KEY = '51158823-fea8dc7b468cfc132c8b5ede6'; // <--- Replace this with your key

  // Function to fetch an image from Pixabay
  const fetchProductImage = async (productName) => {
    if (!PIXABAY_API_KEY || PIXABAY_API_KEY === 'YOUR_PIXABAY_API_KEY') {
        console.warn("Pixabay API key is not set. Using placeholder images.");
        return `https://placehold.co/400x300/e0ffe0/1b5e20?text=${productName.replace(/\s/g, '+')}`;
    }

    const searchQuery = encodeURIComponent(productName + ' vegetable'); // Add 'vegetable' for better results
    const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${searchQuery}&image_type=photo&orientation=horizontal&per_page=3`;

    try {
      const response = await fetch(pixabayUrl);
      if (!response.ok) {
        throw new Error(`Pixabay API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.hits && data.hits.length > 0) {
        // Return the URL of the first high-resolution image found
        return data.hits[0].webformatURL; 
      } else {
        // No image found, return a generic placeholder or product name placeholder
        return `https://placehold.co/400x300/cccccc/333333?text=${productName.replace(/\s/g, '+')}`;
      }
    } catch (error) {
      console.error(`Error fetching image for ${productName}:`, error);
      // Fallback to a placeholder if image fetching fails
      return `https://placehold.co/400x300/cccccc/333333?text=Image+Not+Found`;
    }
  };

  useEffect(() => {
    setLoading(true);
    setFetchError(null); // Reset error on new fetch

    api.get('/api/v1/farmer/') // Assuming this endpoint returns an array of farmers, each with a 'produce' array
      .then(async (res) => { // Mark as async to use await inside
        // Flatten the produce from all farmers into a single array
        const allProduce = res.data.flatMap(farmer => 
          farmer.produce.map(item => ({
            ...item,
            farmerName: farmer.name, // Attach farmer's name to each produce item
          }))
        );

        // Fetch images for all produce items concurrently
        const produceWithImagesPromises = allProduce.map(async (item) => {
          const imageUrl = await fetchProductImage(item.name);
          return { ...item, imageUrl };
        });

        // Use Promise.allSettled to ensure all promises resolve (or reject)
        // without stopping the entire process if one image fails.
        const results = await Promise.allSettled(produceWithImagesPromises);

        const produceWithImages = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            // If an image fetch failed, use a generic fallback
            console.warn(`Failed to get image for ${allProduce[index].name}:`, result.reason);
            return { 
              ...allProduce[index], 
              imageUrl: `https://placehold.co/400x300/cccccc/333333?text=Image+Error` 
            };
          }
        });

        setProduce(produceWithImages);
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
      // Using a custom message box instead of alert() as per instructions
      // You'll need to implement a modal/message box component for this
      console.log('Validation Error: Please select a valid quantity.'); // Log for now
      return;
    }

    try {
      // Ensure user is authenticated before adding to cart
      if (!user) {
        console.log('Authentication Error: Please log in to add items to your cart.'); // Log for now
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

      console.log('Item added to cart successfully!'); // User friendly feedback

    } catch (err) {
      console.error('Add to cart error:', err.response?.data || err.message);
      // More specific error handling based on backend response
      if (err.response && err.response.data && err.response.data.error) {
        console.log(`Error adding to cart: ${err.response.data.error}`);
      } else {
        console.log('Error adding to cart. Please make sure you are logged in as a buyer and try again.');
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
                  onError={(e) => { 
                    e.target.onerror = null; 
                    // Fallback to a generic "Image Not Found" placeholder if the fetched URL breaks
                    e.target.src = `https://placehold.co/400x300/cccccc/333333?text=Image+Not+Found`; 
                  }} 
                />
                {item.category && (
                  <span className="produce-category-tag">{item.category}</span>
                )}
              </div>
              <div className="produce-details">
                <h3 className="produce-name">{item.name}</h3>
                <p className="produce-price">₹{parseFloat(item.price).toFixed(2)} / kg</p>
                <p className="produce-stock">Stock: {item.quantity} kg</p>
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
