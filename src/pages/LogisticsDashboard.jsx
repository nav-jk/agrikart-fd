import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import '../styles/LogisticsDashboard.css'; // New styles

const LogisticsDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true); // Initial loading state
  const [error, setError] = useState(null); // General error state
  const [statusUpdateMap, setStatusUpdateMap] = useState({}); // Stores pending status updates for selects
  const [actionLoading, setActionLoading] = useState({}); // Tracks loading state for specific actions/buttons
  const [toastMessage, setToastMessage] = useState({ type: '', message: '' }); // For success/error toasts

  // Retrieve token (ensure this is handled securely, e.g., via AuthContext)
  const token = localStorage.getItem('access'); 

  // Function to show a toast message
  const showToast = useCallback((type, message) => {
    setToastMessage({ type, message });
    const timer = setTimeout(() => {
      setToastMessage({ type: '', message: '' });
    }, 4000); // Hide after 4 seconds
    return () => clearTimeout(timer);
  }, []);

  // Fetch orders data
  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError("Authentication token missing. Please log in.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/v1/logistics/orders/nearby/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Initialize statusUpdateMap with current order statuses
      const initialStatusMap = {};
      res.data.forEach(order => {
        initialStatusMap[order.order_id] = order.status;
      });
      setOrders(res.data);
      setStatusUpdateMap(initialStatusMap);
    } catch (err) {
      console.error('Error fetching nearby orders:', err.response?.data || err.message);
      setError('Failed to fetch nearby orders. Please ensure you are logged in as a logistics partner and try again.');
    } finally {
      setLoading(false);
    }
  }, [token]); // Dependency on token

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle status select change
  const handleStatusChange = (orderId, newStatus) => {
    setStatusUpdateMap((prev) => ({
      ...prev,
      [orderId]: newStatus,
    }));
  };

  // Update order status on backend
  const updateStatus = async (orderId) => {
    const newStatus = statusUpdateMap[orderId];
    if (!newStatus || newStatus === orders.find(o => o.order_id === orderId)?.status) {
      showToast('info', 'No new status selected or status is unchanged.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    setError(null); // Clear general error

    try {
      await api.patch(
        `/api/v1/logistics/orders/${orderId}/status/`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders((prev) =>
        prev.map((order) =>
          order.order_id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      );
      showToast('success', `Order #${orderId} status updated to ${newStatus}.`);
    } catch (err) {
      console.error('Status update failed:', err.response?.data || err.message);
      showToast('error', `Failed to update status for Order #${orderId}. Please try again.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Download receipt
  const downloadReceipt = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: true }));
    setError(null); // Clear general error

    try {
      const res = await api.get(`/api/v1/logistics/orders/${orderId}/receipt/`, {
        responseType: 'blob', // Important for file downloads
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `agrikart-order-${orderId}-receipt.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove(); // Clean up the DOM element
      window.URL.revokeObjectURL(url); // Revoke the object URL
      showToast('success', `Receipt for Order #${orderId} download started.`);
    } catch (err) {
      console.error('Receipt download failed:', err.response?.data || err.message);
      showToast('error', `Failed to download receipt for Order #${orderId}.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [`receipt_${orderId}`]: false }));
    }
  };

  // Get status summary for the pill display
  const getStatusSummary = useCallback(() => {
    const summary = {
      total: orders.length,
      CONFIRMED: 0,
      PICKED_UP: 0,
      IN_TRANSIT: 0,
      DELIVERED: 0,
      PENDING: 0, // Ensure 'PENDING' is included if orders can start in this state
      // Add any other statuses your backend might return
    };

    orders.forEach((order) => {
      const status = order.status?.toUpperCase(); // Ensure uppercase for consistency
      if (summary.hasOwnProperty(status)) {
        summary[status]++;
      } else {
        // Handle unexpected statuses if necessary, e.g., log them or add to an 'OTHER' category
        console.warn(`Unexpected order status: ${order.status}`);
      }
    });

    return summary;
  }, [orders]); // Recalculate when orders change

  const summary = getStatusSummary();

  if (loading) {
    return (
      <div className="logistics-dashboard-wrapper loading-state">
        <div className="loading-spinner"></div>
        <p>Loading nearby orders for logistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="logistics-dashboard-wrapper error-state">
        <div className="error-message-box">
          <p className="error-title">Dashboard Load Error</p>
          <p className="error-description">{error}</p>
          <button className="refresh-btn" onClick={fetchOrders}>Retry Loading</button>
        </div>
      </div>
    );
  }

  return (
    <div className="logistics-dashboard-wrapper">
      {toastMessage.message && (
        <div className={`toast-message toast-${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}

      <div className="logistics-dashboard-content">
        <h2 className="dashboard-title">Nearby Orders for Pickup & Delivery</h2>

        {/* Summary Pills */}
        <div className="summary-pills-container">
          <div className="summary-pill total">
            <i className="fas fa-list-alt pill-icon"></i>
            <span className="count">{summary.total}</span>
            <span className="label">Total Orders</span>
          </div>
          <div className="summary-pill confirmed">
            <i className="fas fa-check-circle pill-icon"></i>
            <span className="count">{summary.CONFIRMED}</span>
            <span className="label">Confirmed</span>
          </div>
          <div className="summary-pill picked-up">
            <i className="fas fa-box-open pill-icon"></i>
            <span className="count">{summary.PICKED_UP}</span>
            <span className="label">Picked Up</span>
          </div>
          <div className="summary-pill in-transit">
            <i className="fas fa-truck-moving pill-icon"></i>
            <span className="count">{summary.IN_TRANSIT}</span>
            <span className="label">In Transit</span>
          </div>
          <div className="summary-pill delivered">
            <i className="fas fa-handshake pill-icon"></i>
            <span className="count">{summary.DELIVERED}</span>
            <span className="label">Delivered</span>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="empty-orders-state">
            <i className="fas fa-clipboard-list empty-icon"></i>
            <p className="empty-text">No nearby orders requiring action at the moment.</p>
          </div>
        ) : (
          <div className="order-table-section">
            <div className="table-responsive"> {/* Wrapper for horizontal scroll on small screens */}
              <table className="order-details-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th> {/* Added Date column */}
                    <th>Status</th>
                    <th>Farmer</th>
                    <th>Buyer</th>
                    <th>Pickup Address</th>
                    <th>Delivery Address</th>
                    <th>Distance</th>
                    <th>Items</th>
                    <th>Total Amt.</th> {/* Added Total Amount column */}
                    <th>Map</th>
                    <th>Update Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isUpdatingStatus = actionLoading[order.order_id];
                    const isDownloadingReceipt = actionLoading[`receipt_${order.order_id}`];
                    // Format date
                    const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A';
                    // Calculate total amount if not provided directly, or use order.total_amount
                    const orderTotalAmount = order.total_amount ? parseFloat(order.total_amount).toFixed(2) : 
                      order.items?.reduce((sum, item) => sum + (parseFloat(item.produce.price || 0) * parseInt(item.quantity || 0)), 0).toFixed(2) || 'N/A';

                    return (
                      <tr key={order.order_id}>
                        <td data-label="Order ID">
                            <span className="order-id-display">#{order.order_id}</span>
                        </td>
                        <td data-label="Date">{orderDate}</td> {/* Display Date */}
                        <td data-label="Current Status">
                          <span className={`status-badge status-${order.status?.toLowerCase() || 'unknown'}`}>
                            {order.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td data-label="Farmer">{order.farmer_name}</td>
                        <td data-label="Buyer">{order.buyer_name || 'N/A'}</td> {/* Assuming buyer_name is available */}
                        <td data-label="Pickup Address">{order.farmer_address}</td>
                        <td data-label="Delivery Address">{order.buyer_address}</td>
                        <td data-label="Distance">{order.distance_km ? `${order.distance_km.toFixed(2)} km` : 'N/A'}</td>
                        <td data-label="Items">
                          <ul className="order-items-list-compact">
                            {order.items?.map((item, idx) => (
                              <li key={idx}>
                                {item.produce.name} (× {item.quantity})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td data-label="Total Amount">₹{orderTotalAmount}</td> {/* Display Total Amount */}
                        <td data-label="Map">
                          {order.farmer_lat && order.farmer_lon ? (
                            <Link
                              // CORRECTED: Link directly to LogisticsMap with farmer's location
                              to={`/logistics/map?lat=${order.farmer_lat}&lon=${order.farmer_lon}&name=${encodeURIComponent(order.farmer_name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="action-btn view-map-btn" // New class name for clarity
                              title="View Farmer Location on Map"
                            >
                              <i className="fas fa-map-marker-alt"></i> View
                            </Link>
                          ) : (
                            <span className="text-disabled">N/A</span>
                          )}
                        </td>
                        <td data-label="Update Status">
                          <div className="status-update-controls">
                            <select
                              className="status-select"
                              value={statusUpdateMap[order.order_id] || order.status}
                              onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                              disabled={isUpdatingStatus}
                            >
                              {/* Ensure options match your backend's expected status values */}
                              <option value="CONFIRMED">Confirmed</option>
                              <option value="PICKED_UP">Picked Up</option>
                              <option value="IN_TRANSIT">In Transit</option>
                              <option value="DELIVERED">Delivered</option>
                            </select>
                            <button
                              className="update-status-btn"
                              onClick={() => updateStatus(order.order_id)}
                              disabled={isUpdatingStatus}
                            >
                              {isUpdatingStatus ? (
                                <i className="fas fa-spinner fa-spin"></i>
                              ) : (
                                <i className="fas fa-sync-alt"></i>
                              )}
                              Update
                            </button>
                          </div>
                        </td>
                        <td data-label="Receipt">
                          <button
                            onClick={() => downloadReceipt(order.order_id)}
                            className="action-btn receipt-btn"
                            disabled={isDownloadingReceipt}
                            title="Download Receipt"
                          >
                            {isDownloadingReceipt ? (
                              <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fas fa-file-pdf"></i>
                            )}
                            Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticsDashboard;