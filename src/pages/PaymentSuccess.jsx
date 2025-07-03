import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/payment-success.css'; // Create this new CSS file

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('0.00');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('order_id');
    const amount = params.get('amount');
    if (id) {
      setOrderId(id);
    }
    if (amount) {
      setPaymentAmount(parseFloat(amount).toFixed(2));
    }
  }, [location.search]);

  return (
    <div className="payment-success-container">
      <div className="payment-success-box">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>Payment Successful!</h2>
        <p className="success-message">Your order has been placed and payment confirmed.</p>
        <p className="order-details-summary">
          Order ID: <strong>#{orderId || 'N/A'}</strong><br />
          Amount Paid: <strong>₹ {paymentAmount}</strong>
        </p>
        <p className="thank-you-message">Thank you for your purchase from AgriKart!</p>
        <button onClick={() => navigate('/')} className="go-home-btn">
          Continue Shopping
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
