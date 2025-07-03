import { useEffect, useState, useCallback } from 'react'; // Added useCallback
import api from '../api/api';
import '../styles/Me.css';
import { useAuth } from '../context/AuthContext';

const Me = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); 
  const [actionLoading, setActionLoading] = useState({}); // To manage loading state for specific actions (e.g., receipt download)
  const [toastMessage, setToastMessage] = useState({ type: '', message: '' }); // For toast notifications

  const { user } = useAuth(); // Assuming useAuth provides current user details

  // Function to show a toast message
  const showToast = useCallback((type, message) => {
    setToastMessage({ type, message });
    const timer = setTimeout(() => {
      setToastMessage({ type: '', message: '' });
    }, 4000); // Hide after 4 seconds
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access');
      if (!token) {
        setError("You are not logged in. Please log in to view your profile.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/api/v1/auth/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile:', err.response?.data || err.message);
        setError("Failed to load profile details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const downloadReceipt = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: true })); // Set loading for this specific receipt
    const token = localStorage.getItem('access');

    if (!token) {
      showToast('error', "Login required to download receipt.");
      setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: false }));
      return;
    }

    try {
      const res = await api.get(`/api/v1/auth/orders/${orderId}/receipt/`, {
        responseType: 'blob', // Important for file downloads
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `AgriKart_Order_${orderId}_Receipt.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('success', `Receipt for Order #${orderId} download started.`);
    } catch (err) {
      console.error("Error downloading receipt:", err);
      const errorMessage = err.response && err.response.data && err.response.data.detail 
                             ? err.response.data.detail 
                             : "Failed to download receipt. Please try again.";
      showToast('error', errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: false })); // Clear loading
    }
  };


  if (loading) {
    return (
      <div className="me-dashboard loading-state">
        <div className="loading-spinner"></div>
        <p>Loading your profile and orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="me-dashboard error-state">
        <div className="error-message-box">
          <p className="error-title">Error Loading Profile</p>
          <p className="error-description">{error}</p>
          <button className="refresh-btn" onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  if (!profile || !profile.user) {
    return (
      <div className="me-dashboard error-state">
        <div className="error-message-box">
          <p className="error-title">Profile Not Found</p>
          <p className="error-description">User profile data could not be retrieved.</p>
          <button className="refresh-btn" onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      </div>
    );
  }

  const { user: profileUser, buyer, farmer, logistics } = profile;
  const orders = buyer?.orders || [];
  const roles = [];
  if (profileUser.is_buyer) roles.push('Buyer');
  if (profileUser.is_farmer) roles.push('Farmer');
  if (profileUser.is_logistics) roles.push('Logistics');
  const userRoles = roles.join(' | ') || 'User';


  return (
    <div className="me-dashboard">
      {/* Toast Message */}
      {toastMessage.message && (
        <div className={`toast-message toast-${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Sidebar */}
      <aside className="me-sidebar">
        <div className="sidebar-header">
          <h3>My AgriKart Account</h3>
          <p className="user-role">{userRoles}</p>
        </div>
        <ul className="sidebar-links">
          <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
            <i className="fas fa-box-open sidebar-icon"></i> Orders
          </li>
          <li className={activeTab === 'favorites' ? 'active' : ''} onClick={() => setActiveTab('favorites')}>
            <i className="fas fa-heart sidebar-icon"></i> Favorites
          </li>
          <li className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>
            <i className="fas fa-credit-card sidebar-icon"></i> Payments
          </li>
          <li className={activeTab === 'addresses' ? 'active' : ''} onClick={() => setActiveTab('addresses')}>
            <i className="fas fa-map-marker-alt sidebar-icon"></i> Addresses
          </li>
          <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
            <i className="fas fa-cog sidebar-icon"></i> Settings
          </li>
        </ul>
      </aside>

      {/* Main content */}
      <main className="me-content">
        {/* Top Banner */}
        <div className="profile-banner">
          <div className="profile-avatar-wrapper">
            <i className="fas fa-user-circle profile-avatar-icon"></i>
          </div>
          <div className="profile-details">
            <h2>Hello, {profileUser.username}!</h2>
            <p className="profile-contact">
              <i className="fas fa-phone-alt contact-icon"></i> {profileUser.phone_number} 
              {profileUser.email && (
                <> &nbsp;•&nbsp; <i className="fas fa-envelope contact-icon"></i> {profileUser.email}</>
              )}
            </p>
          </div>
          <button className="edit-profile-btn">
            <i className="fas fa-edit"></i> Edit Profile
          </button>
        </div>

        {/* Content based on activeTab */}
        {activeTab === 'orders' && (
            <div className="orders-section section-content">
                <h3 className="section-title">Your Orders</h3>

                {orders.length === 0 ? (
                    <p className="no-content-message">You haven’t placed any orders yet. Start shopping now!</p>
                ) : (
                    <div className="order-cards-grid">
                        {orders.map((order) => {
                            const isDownloadingReceipt = actionLoading[`receipt_${order.id}`];
                            return (
                                <div key={order.id} className="order-card">
                                    <div className="order-card-header">
                                        <div className="order-summary-left">
                                            <h4 className="order-id">Order ID: #{order.id}</h4>
                                            <p className="order-status">
                                                Status:{' '}
                                                <span className={`status-badge status-${order.status?.toLowerCase() || 'unknown'}`}>
                                                    {order.status || 'Unknown'}
                                                </span>
                                            </p>
                                            <p className="order-date">
                                                Ordered on: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="order-actions-header">
                                            {/* Receipt download button - now visible for CONFIRMED or DELIVERED */}
                                            {(order.status === 'CONFIRMED' || order.status === 'DELIVERED' || order.status === 'PENDING' || order.status === 'IN_TRANSIT' || order.status === 'PICKED_UP') && (
                                                <button
                                                    className="action-btn receipt-btn"
                                                    onClick={() => downloadReceipt(order.id)}
                                                    disabled={isDownloadingReceipt}
                                                    title="Download Order Receipt"
                                                >
                                                    {isDownloadingReceipt ? (
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                    ) : (
                                                        <i className="fas fa-receipt"></i>
                                                    )}
                                                    Receipt
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="order-card-body">
                                        {order.items && order.items.length > 0 && (
                                            <div className="order-items-summary">
                                                <h5 className="items-heading">Items:</h5>
                                                <ul className="items-list">
                                                    {order.items.map(item => (
                                                        <li key={item.id} className="item-entry">
                                                            <span>{item.quantity} x {item.produce_info?.name || 'Item'}</span>
                                                            <span className="item-price"> ₹{(parseFloat(item.quantity) * parseFloat(item.produce_info?.price || 0)).toFixed(2)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        <p className="order-total">
                                            <strong>Total Amount:</strong> <span className="total-amount-value">₹{order.total_amount ? parseFloat(order.total_amount).toFixed(2) : 'N/A'}</span>
                                        </p>
                                        <p className="order-address">
                                            <strong>Delivery Address:</strong> {buyer?.address || 'Not available'}
                                        </p>
                                        
                                        <div className="order-footer-actions">
                                            <button className="action-btn track-btn">
                                                <i className="fas fa-map-marker-alt"></i> Track Order
                                            </button>
                                            <button className="action-btn help-btn">
                                                <i className="fas fa-question-circle"></i> Get Help
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'favorites' && (
          <div className="favorites-section section-content">
            <h3 className="section-title">Your Favorite Items</h3>
            <p className="no-content-message">You haven't added any favorites yet.</p>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="payments-section section-content">
            <h3 className="section-title">Saved Payment Methods</h3>
            <p className="no-content-message">No payment methods saved.</p>
          </div>
        )}

        {activeTab === 'addresses' && (
          <div className="addresses-section section-content">
            <h3 className="section-title">Your Addresses</h3>
            {buyer?.address ? (
              <div className="user-address-card">
                <p className="address-line">
                  <i className="fas fa-map-marker-alt address-icon"></i> {buyer.address}
                </p>
                <p className="address-note">This is your primary delivery address.</p>
                <button className="action-btn edit-address-btn">
                    <i className="fas fa-edit"></i> Edit Address
                </button>
              </div>
            ) : (
              <p className="no-content-message">No addresses added yet. Please update your profile.</p>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-section section-content">
            <h3 className="section-title">Account Settings</h3>
            <p className="no-content-message">Manage your account preferences here.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Me;
