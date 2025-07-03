import { useEffect, useState, useCallback } from 'react'; // Added useCallback
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
      // Assuming buyer's cart is directly accessible via buyer's phone number or associated with user's session
      // Endpoint: /api/v1/buyer/{phone_number}/ if the cart is part of the buyer profile
      // OR a dedicated cart endpoint like /api/v1/cart/ if the backend infers user from token
      // I'll stick to the original `/api/v1/buyer/${user.phone}/` as provided, assuming it returns `res.data.cart`
      const res = await api.get(`/api/v1/buyer/${user.phone}/`);
      setCart(res.data.cart || []);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError('Failed to load your cart. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]); // Dependency on user object

  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // Dependency on memoized fetchCart

  const updateQuantity = async (id, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity < 1) {
      // Optionally show a temporary message to the user here
      console.warn("Invalid quantity. Must be at least 1.");
      return;
    }

    // Optimistically update the cart state for better UX
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity } : item));

    try {
      await api.patch(`/api/v1/cart/${id}/`, { quantity });
      // If backend sends back the updated item, you might re-set cart here:
      // setCart(prev => prev.map(item => item.id === id ? res.data : item));
    } catch (err) {
      console.error('Update quantity failed:', err);
      setError('Failed to update quantity. Please refresh.'); // More generic error as optimistic update already happened
      // Revert optimistic update if necessary
      setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: item.quantity } : item)); // Revert to old quantity
    }
  };

  const removeItem = async (id) => {
    // Optimistically remove the item
    setCart(prev => prev.filter(item => item.id !== id));
    try {
      await api.delete(`/api/v1/cart/${id}/`);
    } catch (err) {
      console.error('Remove item failed:', err);
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
      const createOrderRes = await api.post('/api/v1/orders/create-from-cart/');
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
            <Link to="/products" className="continue-shopping-btn">
              <i className="fas fa-arrow-left"></i> Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items-section">
              {cart.map(item => (
                <div className="cart-item-card" key={item.id}>
                  <div className="item-image-wrapper">
                    {/* Assuming produce_info has an image_url. Use a placeholder if not. */}
                    <img 
                      src={item.produce_info?.image_url || 'https://via.placeholder.com/100x100?text=Produce'} 
                      alt={item.produce_info?.name || 'Product'} 
                      className="item-image" 
                    />
                  </div>
                  
                  <div className="item-details">
                    <h4 className="item-name">{item.produce_info?.name || 'Unknown Produce'}</h4>
                    <p className="item-price">Price: ₹{parseFloat(item.produce_info?.price || 0).toFixed(2)} / {item.produce_info?.unit || 'unit'}</p>
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
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, e.target.value)}
                      className="qty-input"
                    />
                    <button 
                      className="qty-btn" 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
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
