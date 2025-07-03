import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components and plugins
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

import '../styles/Dashboard.css';

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [produceList, setProduceList] = useState([]);
  const [farmerInfo, setFarmerInfo] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', quantity: '', category: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state for dashboard data
  const [formLoading, setFormLoading] = useState(false); // Loading state for form submission
  const [dashboardError, setDashboardError] = useState(null); // Error state for dashboard fetch
  const [formError, setFormError] = useState(null); // Error state for form submission
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State for confirmation modal
  const [itemToDelete, setItemToDelete] = useState(null); // Store ID of item to delete

  // Callback to fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (!user || !user.phone) {
      setLoading(false);
      setDashboardError("User not logged in or phone number not available.");
      return;
    }

    setLoading(true);
    setDashboardError(null); // Clear previous errors
    try {
      // Assuming user.phone is the correct identifier for fetching farmer data
      const res = await api.get(`/api/v1/farmer/${user.phone}/`);
      setFarmerInfo({
        name: res.data.name || 'N/A',
        address: res.data.address || 'N/A',
        phone: user.phone,
        // Assuming 'joined' field exists in farmer data, format it nicely
        joined: res.data.joined ? new Date(res.data.joined).toLocaleDateString() : 'N/A',
      });
      setProduceList(res.data.produce || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setDashboardError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]); // Run fetchDashboard on component mount and when 'user' changes

  // Chart.js data configuration
  const categoryData = useCallback(() => {
    const counts = {};
    produceList.forEach(item => {
      const cat = item.category?.trim() || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    // Dynamic colors for variety
    const colors = [
      '#66bb6a', '#ffa726', '#42a5f5', '#ab47bc', '#ff7043', '#26c6da', '#ef5350', '#ffee58', '#78909c'
    ];

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length]), // Cycle through colors
        borderColor: '#fff',
        borderWidth: 2
      }],
      plugins: {
        datalabels: {
          color: '#fff',
          font: {
            weight: 'bold',
            size: 14,
            family: 'Nunito, Inter, sans-serif', // Use Inter for consistency
          },
          textShadowColor: 'rgba(0, 0, 0, 0.4)', // Stronger shadow for readability
          textShadowBlur: 6,
          formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const label = ctx.chart.data.labels[ctx.dataIndex];
            return `${label}\n(${percentage}%)`; // Label and percentage
          },
          align: 'center',
          anchor: 'center',
          clamp: true,
          borderRadius: 4,
          padding: 8, // More padding for datalabels
        }
      }
    };
  }, [produceList]); // Re-calculate chart data when produceList changes

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError(null); // Clear form errors on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true); // Start form loading
    setFormError(null); // Clear previous form errors

    const { name, price, quantity, category } = form;
    if (!name || !price || !quantity || !category) {
      setFormError("All fields are required.");
      setFormLoading(false);
      return;
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setFormError("Price must be a positive number.");
      setFormLoading(false);
      return;
    }
    if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      setFormError("Quantity must be a positive integer.");
      setFormLoading(false);
      return;
    }

    try {
      const dataToSubmit = {
        name,
        price: parseFloat(price), // Ensure price is float
        quantity: parseInt(quantity), // Ensure quantity is integer
        category,
        farmer: user.id // Pass farmer ID, assuming API expects it in payload for new produce
      };

      if (editingId) {
        await api.put(`/api/v1/produce/${editingId}/`, dataToSubmit);
      } else {
        await api.post('/api/v1/produce/', dataToSubmit);
      }
      setForm({ name: '', price: '', quantity: '', category: '' });
      setEditingId(null);
      fetchDashboard(); // Re-fetch all data to update lists and charts
      alert(editingId ? 'Produce updated successfully!' : 'Produce added successfully!'); // User feedback
    } catch (err) {
      console.error('Error saving produce:', err.response?.data || err.message);
      const errorMessage = err.response && err.response.data 
        ? Object.values(err.response.data).flat().join(' ') 
        : 'Error saving produce. Please try again.';
      setFormError(errorMessage);
    } finally {
      setFormLoading(false); // Stop form loading
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '',
      price: item.price || '',
      quantity: item.quantity || '',
      category: item.category || ''
    });
    setEditingId(item.id);
    setFormError(null); // Clear any old errors
  };

  const confirmDelete = (id) => {
    setItemToDelete(id);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setFormLoading(true); // Use form loading for delete as well
    setFormError(null); // Clear errors
    try {
      await api.delete(`/api/v1/produce/${itemToDelete}/`);
      fetchDashboard();
      alert("Produce deleted successfully!");
      setShowConfirmModal(false); // Close modal
      setItemToDelete(null); // Clear item to delete
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      setFormError("Failed to delete produce. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowConfirmModal(false);
    setItemToDelete(null);
  };

  const totalQty = produceList.reduce((acc, item) => acc + parseInt(item.quantity || 0), 0);
  const totalValue = produceList.reduce((acc, item) => acc + (parseFloat(item.price || 0) * parseInt(item.quantity || 0)), 0).toFixed(2);

  if (loading) {
    return (
      <div className="farmer-dashboard-wrapper loading-state">
        <div className="loading-spinner"></div>
        <p>Loading your farm dashboard...</p>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="farmer-dashboard-wrapper error-state">
        <div className="error-message-box">
          <p className="error-title">Dashboard Load Error</p>
          <p className="error-description">{dashboardError}</p>
          <button className="refresh-btn" onClick={fetchDashboard}>Retry Loading</button>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-dashboard-wrapper">
      <div className="farmer-dashboard-grid">
        {/* Sidebar Info Card */}
        <aside className="sidebar-info-card">
          <h3 className="card-title">Farmer Profile</h3>
          {farmerInfo ? (
            <ul className="profile-details-list">
              <li><i className="fas fa-user-tag profile-icon"></i> <strong>Name:</strong> {farmerInfo.name}</li>
              <li><i className="fas fa-phone-alt profile-icon"></i> <strong>Phone:</strong> {farmerInfo.phone}</li>
              <li><i className="fas fa-map-marker-alt profile-icon"></i> <strong>Address:</strong> {farmerInfo.address}</li>
              <li><i className="fas fa-calendar-alt profile-icon"></i> <strong>Joined:</strong> {farmerInfo.joined}</li>
            </ul>
          ) : <p>Profile information not available.</p>}

          {produceList.length > 0 && (
            <div className="category-chart-card">
              <h4 className="chart-title">Product Distribution by Category</h4>
              <div className="chart-canvas-container">
                <Pie data={categoryData()} options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  plugins: { 
                    datalabels: categoryData().plugins.datalabels, // Ensure datalabels plugin options are passed correctly
                    legend: {
                      display: true,
                      position: 'bottom',
                      labels: {
                        font: {
                          size: 12,
                          family: 'Inter, sans-serif'
                        },
                        boxWidth: 20,
                        padding: 15
                      }
                    },
                    tooltip: {
                      enabled: true
                    }
                  } 
                }} />
              </div>
              <p className="chart-note">Hover for detailed counts.</p>
            </div>
          )}
        </aside>

        {/* Main Dashboard Panel */}
        <div className="main-dashboard-panel">
          <h2 className="main-dashboard-title">Your Farm Dashboard</h2>

          {/* Key Stats */}
          <div className="stats-cards-grid">
            <div className="stat-card">
              <i className="fas fa-seedling stat-icon"></i>
              <h4 className="stat-title">Total Product Types</h4>
              <p className="stat-value">{produceList.length}</p>
            </div>
            <div className="stat-card">
              <i className="fas fa-boxes stat-icon"></i>
              <h4 className="stat-title">Total Quantity in Stock</h4>
              <p className="stat-value">{totalQty}</p>
            </div>
            <div className="stat-card">
              <i className="fas fa-rupee-sign stat-icon"></i>
              <h4 className="stat-title">Estimated Stock Value</h4>
              <p className="stat-value">₹{totalValue}</p>
            </div>
          </div>

          {/* Add/Edit Produce Form */}
          <div className="produce-form-card">
            <h3 className="card-title">{editingId ? 'Edit Product Details' : 'Add New Product to Inventory'}</h3>
            {formError && <p className="form-error-message">{formError}</p>}
            <form onSubmit={handleSubmit} className="produce-form-layout">
              <div className="field-group">
                <label htmlFor="name">Product Name</label>
                <input
                  id="name"
                  name="name"
                  placeholder="e.g., Organic Tomatoes"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="field-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="form-input form-select"
                >
                  <option value="">Select Category</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy">Dairy & Eggs</option>
                  <option value="Grains">Grains & Pulses</option>
                  <option value="Organic">Organic Produce</option>
                  <option value="Spices">Spices & Herbs</option> {/* Added for consistency with Home page */}
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="price">Price (₹ per unit)</label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01" // Allow decimal for price
                  placeholder="e.g., 50.00"
                  value={form.price}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="field-group">
                <label htmlFor="quantity">Quantity (units)</label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  placeholder="e.g., 100"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? (
                    <> <i className="fas fa-spinner fa-spin"></i> Saving... </>
                  ) : editingId ? (
                    <> <i className="fas fa-save"></i> Update Product </>
                  ) : (
                    <> <i className="fas fa-plus-circle"></i> Add Product </>
                  )}
                </button>
                {editingId && (
                  <button type="button" className="btn btn-secondary-outline" onClick={() => {
                    setEditingId(null);
                    setForm({ name: '', price: '', quantity: '', category: '' });
                    setFormError(null);
                  }}>
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Produce List */}
          <div className="produce-list-card">
            <h3 className="card-title">My Current Inventory</h3>
            {produceList.length === 0 ? (
              <p className="no-items-message">You haven't listed any products yet. Use the form above to add your first item!</p>
            ) : (
              <ul className="produce-items-list">
                {produceList.map(item => (
                  <li key={item.id} className="produce-item">
                    <div className="item-details-main">
                      <span className="item-name">{item.name}</span>
                      <span className="item-category">{item.category || 'Uncategorized'}</span>
                    </div>
                    <div className="item-details-sub">
                      <span className="item-price">₹{parseFloat(item.price).toFixed(2)}</span>
                      <span className="item-quantity">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-actions-group">
                      <button className="action-btn edit-btn" onClick={() => handleEdit(item)}>
                        <i className="fas fa-edit"></i> Edit
                      </button>
                      <button className="action-btn delete-btn" onClick={() => confirmDelete(item.id)}>
                        <i className="fas fa-trash-alt"></i> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 className="modal-title">Confirm Deletion</h4>
            <p className="modal-message">Are you sure you want to delete this product from your inventory? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={handleDelete} disabled={formLoading}>
                {formLoading ? 'Deleting...' : 'Delete'}
              </button>
              <button className="btn btn-cancel" onClick={cancelDelete} disabled={formLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerDashboard;
