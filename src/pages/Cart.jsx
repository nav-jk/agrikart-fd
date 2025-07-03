import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { useNavigate, Link } from 'react-router-dom'; // Ensure Link is imported
import '../styles/Cart.css'; // New styles for Cart

const Cart = () => {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true); // State for initial cart loading
  const [checkoutLoading, setCheckoutLoading] = useState(false); // State for checkout button
  const [error, setError] = useState(null); // State for general errors
  const { user } = useAuth();
  const navigate = useNavigate();

  // IMPORTANT: Replace 'YOUR_PIXABAY_API_KEY' with your actual Pixabay API key.
  // Obtain a key from https://pixabay.com/api/docs/
  // In a production environment, it's highly recommended to proxy this through your backend
  // to prevent exposing your API key and manage rate limits.
  const PIXABAY_API_KEY = '51158823-fea8dc7b468cfc132c8b5ede6'; 

  // Function to fetch images from Pixabay, returns an array of URLs
  const fetchProductImages = useCallback(async (productName) => {
    // Check if the API key is set. If not, log a warning and return an empty array.
    if (!PIXABAY_API_KEY || PIXABAY_API_KEY === 'YOUR_PIXABAY_API_KEY') {
        console.warn("Pixabay API key is not set or is the placeholder. Using generic placeholder images.");
        return []; 
    }

    // Encode the product name for the URL query, adding 'vegetable' for better search results.
    const searchQuery = encodeURIComponent(productName + ' vegetable'); 
    // Request up to 10 images to have variety for products with the same name.
    const pixabayUrl = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${searchQuery}&image_type=photo&orientation=horizontal&per_page=10`;

    try {
      const response = await fetch(pixabayUrl);
      // Check if the network request was successful.
      if (!response.ok) {
        throw new Error(`Pixabay API error: ${response.statusText} (Status: ${response.status})`);
      }
      const data = await response.json();
      // If images are found, map them to an array of webformatURLs.
      if (data.hits && data.hits.length > 0) {
        return data.hits.map(hit => hit.webformatURL); 
      } else {
        // If no images are found for the search query, return an empty array.
        return []; 
      }
    } catch (error) {
      // Log any errors during the image fetching process.
      console.error(`Error fetching images for "${productName}":`, error);
      return []; // Return empty array on error to allow fallback.
    }
  }, [PIXABAY_API_KEY]); // Dependency on PIXABAY_API_KEY

  // Memoized fetchCart function using useCallback
  const fetchCart = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setError("Please log in to view your cart.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch cart data. Assuming the endpoint returns `res.data.cart` which contains cart items.
      const res = await api.get(`/api/v1/buyer/${user.phone}/`);
      const cartItemsData = res.data.cart || [];

      // A Map to store available image URLs for each unique product name
      // and a counter to track which image has been assigned.
      // Format: Map<productName, { urls: string[], currentIndex: number }>
      const productImagePool = new Map(); 

      // Create an array of promises, where each promise fetches an image for a produce item.
      const cartItemsWithImagesPromises = cartItemsData.map(async (item) => {
        let imageUrl = `https://placehold.co/100x100/cccccc/333333?text=Image+Not+Found`; // Default fallback image.

        // Ensure produce_info and its name exist before attempting to fetch images.
        const productName = item.produce_info?.name;
        if (productName) {
          // If images for this product name haven't been fetched yet, do it now.
          if (!productImagePool.has(productName)) {
            const urls = await fetchProductImages(productName);
            productImagePool.set(productName, { urls: urls, currentIndex: 0 });
          }

          // Get the image pool entry for the current product name.
          const poolEntry = productImagePool.get(productName);

          // If there are available images in the pool, assign the next one.
          if (poolEntry && poolEntry.urls.length > 0) {
            imageUrl = poolEntry.urls[poolEntry.currentIndex];
            // Increment the index, cycling back to 0 if it exceeds the array length.
            poolEntry.currentIndex = (poolEntry.currentIndex + 1) % poolEntry.urls.length; 
          } else {
            // If no images were fetched or the pool is empty, use a product-specific placeholder.
            imageUrl = `https://placehold.co/100x100/e0ffe0/1b5e20?text=${productName.replace(/\s/g, '+')}`;
          }
        }
        
        return { ...item, imageUrl };
      });

      // Wait for all image fetching promises to settle.
      const results = await Promise.allSettled(cartItemsWithImagesPromises);

      // Process the results to update the cart array with image URLs.
      const finalCartItems = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value; // Return the item with its fetched image URL.
        } else {
          // If any image fetching failed, log a warning and use a generic error placeholder.
          console.warn(`Failed to assign image for cart item ${cartItemsData[index]?.produce_info?.name || 'unknown'}:`, result.reason);
          return { 
            ...cartItemsData[index], 
            imageUrl: `https://placehold.co/100x100/cccccc/333333?text=Image+Error` 
          };
        }
      });

      setCart(finalCartItems); // Update the state with cart items including image URLs.

    } catch (err) {
      console.error('Error loading cart:', err);
      setError('Failed to load your cart. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, fetchProductImages]); // Dependencies: user object and the memoized fetchProductImages

  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // Dependency on memoized fetchCart

  const updateQuantity = async (id, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    const itemToUpdate = cart.find(item => item.id === id);
    if (!itemToUpdate) return;

    const maxStock = itemToUpdate.produce_info?.quantity || 0;
    if (quantity > maxStock) {
      setError(`Quantity for ${itemToUpdate.produce_info?.name || 'this item'} exceeds available stock of ${maxStock} kg.`);
      return;
    }

    setError(null); // Clear any previous error messages

    // Optimistically update the cart state for better UX
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));

    try {
      await api.patch(`/api/v1/cart/${id}/`, { quantity }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      // If backend sends back the updated item, you might re-set cart here:
      // setCart(prev => prev.map(item => item.id === id ? res.data : item));
    } catch (err) {
      console.error('Update quantity failed:', err.response?.data || err.message);
      setError('Failed to update quantity. Please refresh.'); 
      // Revert optimistic update if necessary
      // This is a simple revert; for complex scenarios, consider a more robust rollback
      setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: itemToUpdate.quantity } : item)); 
    }
  };

  const removeItem = async (id) => {
    // Optimistically remove the item
    setCart(prev => prev.filter(item => item.id !== id));
    setError(null); // Clear any previous error messages
    try {
      await api.delete(`/api/v1/cart/${id}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
    } catch (err) {
      console.error('Remove item failed:', err.response?.data || err.message);
      setError('Failed to remove item. Please refresh.');
      // Re-fetch cart if removal failed to sync state
      fetchCart();
    }
  };

  // Helper to calculate total amount of items in the cart
  const calculateCartTotal = () => {
    return cart.reduce((sum, item) => {
      // Ensure produce_info and price/quantity are numbers for calculation
      const price = parseFloat(item.produce_info?.price || 0);
      const quantity = parseInt(item.quantity || 0);
      return sum + (price * quantity);
    }, 0).toFixed(2); // Format to 2 decimal places for currency
  };

  const placeOrder = async () => {
    if (!cart.length) {
      setError("Your cart is empty. Please add items before proceeding to checkout.");
      return;
    }
    setCheckoutLoading(true);
    setError(null);

    try {
      // Step 1: Create order from cart
      const createOrderRes = await api.post('/api/v1/orders/create-from-cart/', {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });
      const orderId = createOrderRes.data.id;
      
      if (!orderId) {
        setError("Failed to create order on backend: No order ID returned.");
        return;
      }

      // Step 2: Get the total amount from the calculated cart total
      const totalAmount = calculateCartTotal();
      
      // Navigate to the payment page, passing order ID and total amount as query parameters
      navigate(`/payment?order_id=${orderId}&amount=${totalAmount}`);

      // Clear cart after successful order creation and navigation
      setCart([]);

    } catch (err) {
      console.error("Error during place order process:", err.response?.data || err.message);
      let errorMessage = "Something went wrong while placing the order.";
      if (err.response && err.response.data) {
        errorMessage = err.response.data.detail || err.response.data.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cart-page-wrapper">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (error && !cart.length) { // Show general error if cart is empty and there's an error
    return (
      <div className="cart-page-wrapper">
        <div className="error-state">
          <div className="error-message-box">
            <p className="error-title">Error</p>
            <p className="error-description">{error}</p>
            <button className="refresh-btn" onClick={fetchCart}>Retry Loading Cart</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-wrapper">
      <div className="cart-container">
        <h2 className="cart-header">Your Shopping Cart</h2>

        {error && cart.length > 0 && ( // Show error message even if cart has items (e.g., update failed)
          <p className="cart-top-error-message">{error}</p>
        )}

        {cart.length === 0 ? (
          <div className="empty-cart-state">
            <span className="empty-cart-icon">🛒</span>
            <p className="empty-message">Your cart is currently empty.</p>
            <Link to="/dashboard/buyer" className="continue-shopping-btn">
              <i className="fas fa-arrow-left"></i> Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items-section">
              {cart.map(item => (
                <div className="cart-item-card" key={item.id}>
                  <div className="item-image-wrapper">
                    {/* Use item.imageUrl which is fetched from Pixabay, with fallback */}
                    <img 
                      src={item.imageUrl} 
                      alt={item.produce_info?.name || 'Product'} 
                      className="item-image" 
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = `https://placehold.co/100x100/cccccc/333333?text=Image+Not+Found`; 
                      }} 
                    />
                  </div>
                  
                  <div className="item-details">
                    <h4 className="item-name">{item.produce_info?.name || 'Unknown Produce'}</h4>
                    <p className="item-price">Price: ₹{parseFloat(item.produce_info?.price || 0).toFixed(2)} / {item.produce_info?.unit || 'kg'}</p>
                    <p className="item-farmer">Sold by: {item.produce_info?.farmer_username || 'AgriKart Farmer'}</p>
                  </div>

                  <div className="item-quantity-controls">
                    <button 
                      className="qty-btn" 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      // Ensure max quantity is based on available stock from produce_info
                      max={item.produce_info?.quantity || 999} 
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                      className="qty-input"
                    />
                    <button 
                      className="qty-btn" 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= (item.produce_info?.quantity || 999)}
                    >
                      +
                    </button>
                  </div>

                  <div className="item-subtotal">
                    <p>Subtotal</p>
                    <p className="subtotal-amount">₹{(parseFloat(item.produce_info?.price || 0) * parseInt(item.quantity || 0)).toFixed(2)}</p>
                  </div>

                  <button className="remove-item-btn" onClick={() => removeItem(item.id)}>
                    <i className="fas fa-trash-alt"></i> Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary-section">
              <h3 className="summary-title">Order Summary</h3>
              <div className="summary-line">
                <span>Total Items:</span>
                <span>{cart.length}</span>
              </div>
              <div className="summary-line total-line">
                <span>Cart Total:</span>
                <span className="cart-total-amount">₹{calculateCartTotal()}</span>
              </div>
              
              <button 
                className="proceed-to-checkout-btn" 
                onClick={placeOrder} 
                disabled={checkoutLoading || cart.length === 0}
              >
                {checkoutLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-shopping-cart"></i> Proceed to Checkout
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
