import { useEffect, useState, useCallback, useMemo } from 'react'; // Added useMemo
import api from '../api/api';
import '../styles/Me.css'; // Ensure this CSS file is updated with new styles
import { useAuth } from '../context/AuthContext';

const Me = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); 
  const [actionLoading, setActionLoading] = useState({}); // To manage loading state for specific actions (e.g., receipt download)
  const [toastMessage, setToastMessage] = useState({ type: '', message: '' }); // For toast notifications

  // State for Edit Profile Modal
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ username: '', email: '' });
  const [editProfileLoading, setEditProfileLoading] = useState(false);

  // State for Edit Address Modal
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editAddressData, setEditAddressData] = useState({ address: '' });
  const [editAddressLoading, setEditAddressLoading] = useState(false);

  // New states for Settings options
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true); // Example: user preference
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);


  const { user, logout } = useAuth(); // Assuming useAuth provides current user details and a logout function

  // Function to show a toast message
  const showToast = useCallback((type, message) => {
    setToastMessage({ type, message });
    const timer = setTimeout(() => {
      setToastMessage({ type: '', message: '' });
    }, 4000); // Hide after 4 seconds
    return () => clearTimeout(timer);
  }, []);

  // Memoized function to fetch user profile data
  const fetchProfile = useCallback(async () => {
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
      // Initialize notification setting from profile if available, otherwise default
      // Assuming profile.user might have a 'notifications_enabled' field
      if (typeof res.data.user.notifications_enabled !== 'undefined') {
        setEmailNotificationsEnabled(res.data.user.notifications_enabled);
      }
    } catch (err) {
      console.error('Failed to load profile:', err.response?.data || err.message);
      setError("Failed to load profile details. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); 

  // Fetch user profile data on component mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); 

  // Function to handle downloading an order receipt
  const downloadReceipt = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: true })); 
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
      setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: false })); 
    }
  };

  // Handle opening the Edit Profile modal
  const handleOpenEditProfileModal = useCallback(() => {
    if (profile?.user) {
      setEditProfileData({ 
        username: profile.user.username || '', 
        email: profile.user.email || '' 
      });
      setShowEditProfileModal(true);
    }
  }, [profile]);

  // Handle submitting the Edit Profile form
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setEditProfileLoading(true);
    const token = localStorage.getItem('access');

    try {
      // Assuming the /api/v1/auth/me/ endpoint accepts PATCH for user fields
      await api.put(`/api/v1/user/${profile.user.phone_number}/`, {
        username: editProfileData.username,
        email: editProfileData.email,
        phone_number: profile.user.phone_number, // required field for PUT
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast('success', 'Profile updated successfully!');
      setShowEditProfileModal(false);
      fetchProfile(); // Refresh profile data
    } catch (err) {
      console.error('Failed to update profile:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Failed to update profile.';
      showToast('error', errorMessage);
    } finally {
      setEditProfileLoading(false);
    }
  };

  // Handle opening the Edit Address modal
  const handleOpenEditAddressModal = useCallback(() => {
    if (profile?.buyer) {
      setEditAddressData({ address: profile.buyer.address || '' });
      setShowEditAddressModal(true);
    } else {
      showToast('info', 'You do not have a buyer profile to edit an address.');
    }
  }, [profile, showToast]);

  // Handle submitting the Edit Address form
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setEditAddressLoading(true);
    const token = localStorage.getItem('access');

    try {
      // Assuming /api/v1/auth/me/ endpoint can accept nested updates for buyer address
      // Backend should handle updating the buyer's address associated with the user.
      await api.put(`/api/v1/buyer/${profile.user.phone_number}/`, {
      address: editAddressData.address,
      user: profile.user.id // Ensure user ID is passed to associate it properly
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

      showToast('success', 'Address updated successfully!');
      setShowEditAddressModal(false);
      fetchProfile(); // Refresh updated data
    } catch (err) {
      console.error('Failed to update address:', err.response?.data || err.message);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to update address.';
      showToast('error', errorMessage);
    } finally {
      setEditAddressLoading(false);
    }
  };

  // Placeholder function for tracking an order
  const handleTrackOrder = useCallback((orderId) => {
    console.log(`Track Order button clicked for Order ID: ${orderId}. Implement tracking logic or navigation.`);
    showToast('info', `Tracking for Order #${orderId} is not yet available.`);
  }, [showToast]);

  // Placeholder function for getting help with an order
  const handleGetHelp = useCallback((orderId) => {
    console.log(`Get Help button clicked for Order ID: ${orderId}. Implement support contact or FAQ link.`);
    showToast('info', `Please contact support for assistance with Order #${orderId}.`);
  }, [showToast]);

  // New: Handle Change Password (simulated)
  const handleChangePassword = useCallback(() => {
    console.log("Change Password button clicked.");
    showToast('info', 'Password change functionality is under development. Please contact support.');
    // In a real app, this would navigate to a dedicated password change form
    // or open a complex modal for current/new password input.
  }, [showToast]);

  // New: Handle Toggle Email Notifications
  const handleToggleEmailNotifications = useCallback(async () => {
    const newSetting = !emailNotificationsEnabled;
    setEmailNotificationsEnabled(newSetting); // Optimistic update

    const token = localStorage.getItem('access');
    try {
      // Assuming /api/v1/auth/me/ can update a 'notifications_enabled' field directly on the user model
      await api.patch('/api/v1/auth/me/', {
        notifications_enabled: newSetting,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('success', `Email notifications ${newSetting ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      console.error('Failed to update notification settings:', err.response?.data || err.message);
      showToast('error', 'Failed to update notification settings. Please try again.');
      setEmailNotificationsEnabled(!newSetting); // Revert on error
    }
  }, [emailNotificationsEnabled, showToast]);

  // New: Handle Delete Account (with confirmation modal)
  const handleOpenDeleteAccountModal = useCallback(() => {
    setShowDeleteAccountModal(true);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
  setDeleteAccountLoading(true);
  const token = localStorage.getItem('access');

  if (!token || !profile?.user?.phone_number) {
    showToast('error', 'Missing authentication or user phone number.');
    setDeleteAccountLoading(false);
    return;
  }

  try {
    // 🔥 Real DELETE request to backend
    await api.delete(`/api/v1/buyer/${profile.user.phone_number}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    showToast('success', 'Account successfully deleted. Redirecting...');
    setShowDeleteAccountModal(false);

    // Optional delay for UX
    setTimeout(() => {
      logout(); // Clear local storage, session, and auth state
      window.location.href = '/'; // Redirect to homepage or login
    }, 2000);
  } catch (err) {
    console.error('Failed to delete account:', err.response?.data || err.message);
    const errorMessage =
      err.response?.data?.detail || err.response?.data?.message || 'Failed to delete account.';
    showToast('error', errorMessage);
  } finally {
    setDeleteAccountLoading(false);
  }
}, [profile, showToast, logout]);


  // Calculate the farmer from whom the buyer has bought the most
// Top farmer calculation logic
const [topFarmer, setTopFarmer] = useState(null);

useEffect(() => {
  if (!profile?.buyer?.orders?.length) {
    setTopFarmer(null);
    return;
  }

  const farmerTotals = {}; // { 'farmer_username': { totalSpent, phone_number } }

  profile.buyer.orders.forEach(order => {
    order.items.forEach(item => {
      const farmerUsername = item.produce_info?.farmer_username;
      const farmerPhone = item.produce_info?.farmer_phone_number; // Ensure backend sends this
      const price = parseFloat(item.produce_info?.price || 0);
      const qty = parseFloat(item.quantity || 0);
      const total = price * qty;

      if (farmerUsername && farmerPhone) {
        if (!farmerTotals[farmerUsername]) {
          farmerTotals[farmerUsername] = { totalSpent: 0, phone: farmerPhone };
        }
        farmerTotals[farmerUsername].totalSpent += total;
      }
    });
  });

  // Determine top farmer
  let topFarmerUsername = null;
  let maxSpent = 0;
  let topFarmerPhone = null;

  for (const [username, info] of Object.entries(farmerTotals)) {
    if (info.totalSpent > maxSpent) {
      topFarmerUsername = username;
      maxSpent = info.totalSpent;
      topFarmerPhone = info.phone;
    }
  }

  if (!topFarmerPhone) {
    setTopFarmer(null);
    return;
  }

  // Step 2: Fetch full farmer profile
  const fetchTopFarmer = async () => {
    const token = localStorage.getItem('access');
    try {
      const res = await api.get(`/farmer/${topFarmerPhone}/`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setTopFarmer({
        name: res.data.user.username,
        phone: res.data.user.phone_number,
        totalSpent: maxSpent.toFixed(2),
        ...res.data, // include full farmer data (address, etc.)
      });
    } catch (err) {
      console.error('Failed to fetch top farmer details:', err);
      setTopFarmer({
        name: topFarmerUsername,
        phone: topFarmerPhone,
        totalSpent: maxSpent.toFixed(2),
        error: true
      });
    }
  };

  fetchTopFarmer();
}, [profile]);



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
  // Ensure orders is an array, even if null/undefined
  const orders = buyer?.orders || []; 
  const roles = [];
  if (profileUser.is_buyer) roles.push('Buyer');
  if (profileUser.is_farmer) roles.push('Farmer');
  if (profileUser.is_logistics) roles.push('Logistics');
  const userRoles = roles.join(' | ') || 'User';

  // Helper to determine status badge class
  const getStatusBadgeClass = (status) => {
    const lowerCaseStatus = status?.toLowerCase();
    switch (lowerCaseStatus) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'shipped': 
      case 'in_transit': return 'status-shipped'; // Group 'shipped' and 'in_transit'
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      case 'processing': return 'status-processing';
      case 'picked_up': return 'status-shipped'; // Group 'picked_up' with shipped
      default: return 'status-unknown';
    }
  };

  return (
    <div className="me-dashboard">
      {/* Toast Message */}
      {toastMessage.message && (
        <div className={`toast-message toast-${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Profile</h3>
            <form onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label htmlFor="username">Username:</label>
                <input
                  type="text"
                  id="username"
                  className="payment-input"
                  value={editProfileData.username}
                  onChange={(e) => setEditProfileData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email:</label>
                <input
                  type="email"
                  id="email"
                  className="payment-input"
                  value={editProfileData.email}
                  onChange={(e) => setEditProfileData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-link" onClick={() => setShowEditProfileModal(false)} disabled={editProfileLoading}>
                  Cancel
                </button>
                <button type="submit" className="action-btn receipt-btn" disabled={editProfileLoading}>
                  {editProfileLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {showEditAddressModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Delivery Address</h3>
            <form onSubmit={handleSaveAddress}>
              <div className="form-group">
                <label htmlFor="address">Address:</label>
                <textarea
                  id="address"
                  className="payment-input"
                  rows="4"
                  value={editAddressData.address}
                  onChange={(e) => setEditAddressData(prev => ({ ...prev, address: e.target.value }))}
                  required
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-link" onClick={() => setShowEditAddressModal(false)} disabled={editAddressLoading}>
                  Cancel
                </button>
                <button type="submit" className="action-btn receipt-btn" disabled={editAddressLoading}>
                  {editAddressLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>Save Address</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <h3>Confirm Profile Deletion</h3>
            <p className="modal-message">Are you sure you want to delete your buyer profile? This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="cancel-link" onClick={() => setShowDeleteAccountModal(false)} disabled={deleteAccountLoading}>
                Cancel
              </button>
              <button type="button" className="action-btn delete-btn" onClick={handleDeleteAccount} disabled={deleteAccountLoading}>
                {deleteAccountLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Deleting...
                  </>
                ) : (
                  <>Delete Profile</>
                )}
              </button>
            </div>
          </div>
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
          <button className="edit-profile-btn" onClick={handleOpenEditProfileModal}>
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
                                                <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                                                    {order.status || 'Unknown'}
                                                </span>
                                            </p>
                                            <p className="order-date">
                                                Ordered on: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="order-actions-header">
                                            {/* Receipt download button - now visible for CONFIRMED or DELIVERED */}
                                            {(order.status === 'CONFIRMED' || order.status === 'DELIVERED' || order.status === 'PENDING' || order.status === 'IN_TRANSIT' || order.status === 'PICKED_UP' || order.status === 'PROCESSING') && (
                                                <button
                                                    className="action-btn receipt-btn"
                                                    onClick={() => downloadReceipt(order.id)}
                                                    disabled={isDownloadingReceipt}
                                                    title="Download Order Receipt"
                                                >
                                                    {isDownloadingReceipt ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin"></i> Downloading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-receipt"></i> Receipt
                                                        </>
                                                    )}
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
                                            <button className="action-btn track-btn" onClick={() => handleTrackOrder(order.id)}>
                                                <i className="fas fa-map-marker-alt"></i> Track Order
                                            </button>
                                            <button className="action-btn help-btn" onClick={() => handleGetHelp(order.id)}>
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
              <h3 className="section-title">Your Favorite Farmer</h3>
              {topFarmer ? (
                <div className="top-farmer-card">
                  <h4>👨‍🌾 {topFarmer.name}</h4>
                  <p>Phone: {topFarmer.phone}</p>
                  <p>Total Spent: ₹{topFarmer.totalSpent}</p>
                  {topFarmer.address && (
                    <p>📍 Address: {topFarmer.address}</p>
                  )}
                  {topFarmer.error && (
                    <p style={{ color: 'red' }}>⚠️ Could not fetch complete profile.</p>
                  )}
                </div>
              ) : (
                <p className="no-content-message">No orders yet to determine a top farmer.</p>
              )}
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
                <button className="action-btn edit-address-btn" onClick={handleOpenEditAddressModal}>
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
            <div className="settings-options">
                {/* Change Password */}
                <div className="setting-item">
                    <span className="setting-label"><i className="fas fa-key setting-icon"></i> Change Password</span>
                    <button className="action-btn help-btn" onClick={handleChangePassword}>
                        Update Password
                    </button>
                </div>

                {/* Notification Preferences (simple toggle for now) */}
                <div className="setting-item">
                    <span className="setting-label"><i className="fas fa-bell setting-icon"></i> Email Notifications</span>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={emailNotificationsEnabled} 
                            onChange={handleToggleEmailNotifications} 
                        />
                        <span className="slider round"></span>
                    </label>
                </div>

                {/* Delete Account */}
                <div className="setting-item delete-account-item">
                    <span className="setting-label"><i className="fas fa-user-times setting-icon error-icon"></i> Delete Buyer Profile</span>
                    <button className="action-btn delete-btn" onClick={handleOpenDeleteAccountModal}>
                        Delete Buyer Profile
                    </button>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Me;
