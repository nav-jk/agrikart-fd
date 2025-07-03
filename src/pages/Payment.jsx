import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Payment.css';

// Import bank logos (you'll need to add these image files to your project)
import axisBankLogo from '../assets/bank-logos/axis_bank.png';
import hdfcBankLogo from '../assets/bank-logos/hdfc_bank.png';
import kotakBankLogo from '../assets/bank-logos/kotak_bank.png';
import sbiBankLogo from '../assets/bank-logos/sbi_bank.png';
import billdeskLogo from '../assets/bank-logos/billdesk_logo.png';
import upiQrCodePlaceholder from '../assets/bank-logos/upi_qr_placeholder.png'; // Placeholder for UPI QR code

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = new URLSearchParams(location.search).get('order_id');
  const initialAmount = new URLSearchParams(location.search).get('amount');

  const [loadingPayment, setLoadingPayment] = useState(false);
  const [totalAmount, setTotalAmount] = useState(initialAmount || '0.00');
  const [activePaymentMethod, setActivePaymentMethod] = useState('internet-banking');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [upiId, setUpiId] = useState('');
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!orderId) {
      setErrorMessage('No Order ID provided. Cannot proceed with payment.');
    }
    // Only set error message if amount is truly missing or invalid
    if (!initialAmount || isNaN(parseFloat(initialAmount))) {
      setErrorMessage(prev => prev ? prev + ' Also, no valid amount provided.' : 'No payment amount provided.');
      setTotalAmount('0.00'); // Default to 0 if invalid
    }
  }, [orderId, initialAmount]);

  const popularBanks = [
    { id: 'axis', name: 'Axis Bank', logo: axisBankLogo },
    { id: 'hdfc', name: 'HDFC Bank', logo: hdfcBankLogo },
    { id: 'kotak', name: 'Kotak Bank', logo: kotakBankLogo },
    { id: 'sbi', name: 'State Bank of India', logo: sbiBankLogo },
  ];

  const allBanks = [
    { value: '', label: '== Select your Bank ==' },
    { value: 'axis', label: 'Axis Bank' },
    { value: 'hdfc', label: 'HDFC Bank' },
    { value: 'kotak', label: 'Kotak Bank' },
    { value: 'sbi', label: 'State Bank of India' },
    { value: 'icici', label: 'ICICI Bank' },
    { value: 'pnb', label: 'Punjab National Bank' },
    { value: 'union', label: 'Union Bank of India' },
    { value: 'canara', label: 'Canara Bank' },
  ];

  const walletOptions = [
    { value: '', label: '== Select your Wallet ==' },
    { value: 'paytm', label: 'Paytm Wallet' },
    { value: 'phonepe', label: 'PhonePe Wallet' },
    { value: 'mobikwik', label: 'Mobikwik' },
    { value: 'amazonpay', label: 'Amazon Pay' },
  ];

  const merchantName = "AgriKart.ai - Fresh Produce Solutions Pvt. Ltd.";

  const handleBankSelect = (event) => {
    setSelectedBank(event.target.value);
  };

  const handleCardNumberChange = (e) => {
    const formatted = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setExpiryDate(value);
  };

  const handleUPIChange = (e) => {
    setUpiId(e.target.value);
  };

  const validateInputs = () => {
    switch (activePaymentMethod) {
      case 'internet-banking':
        if (!selectedBank || selectedBank === '== Select your Bank ==') {
          setErrorMessage("Please select a bank to proceed.");
          return false;
        }
        break;
      case 'credit-card':
      case 'debit-card':
      case 'debit-atm-pin':
        if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13 || !expiryDate || expiryDate.length !== 5 || !cvv || cvv.length < 3 || !cardHolderName) {
          setErrorMessage("Please fill in all card details correctly.");
          return false;
        }
        break;
      case 'upi':
        if (!upiId && !showUpiQr) {
          setErrorMessage("Please enter a valid UPI ID or click 'Show QR Code'.");
          return false;
        }
        if (upiId && !upiId.includes('@') && !showUpiQr) { // Only validate format if UPI ID is entered and QR not shown
          setErrorMessage("Please enter a valid UPI ID (e.g., yourname@bank).");
          return false;
        }
        break;
      case 'wallet-cash-cards':
        if (!selectedWallet || selectedWallet === '== Select your Wallet ==') {
          setErrorMessage("Please select a wallet to proceed.");
          return false;
        }
        break;
      default:
        setErrorMessage("Please select a payment method.");
        return false;
    }
    return true;
  };

  const confirmPayment = async () => {
    setErrorMessage('');
    if (!validateInputs()) {
      return;
    }

    setLoadingPayment(true);

    if (!orderId) {
      setErrorMessage("Order ID is missing. Cannot proceed with payment.");
      setLoadingPayment(false);
      return;
    }

    try {
      console.log(`Simulating payment for Order ID: ${orderId} via ${activePaymentMethod}`);
      if (activePaymentMethod === 'internet-banking') {
        console.log(`Selected Bank: ${selectedBank}`);
      } else if (activePaymentMethod === 'upi') {
        console.log(`UPI ID: ${upiId || 'QR Code Payment'}`);
      } else if (activePaymentMethod === 'credit-card' || activePaymentMethod === 'debit-card' || activePaymentMethod === 'debit-atm-pin') {
        console.log(`Card Type: ${activePaymentMethod}, Last 4 digits: ${cardNumber.slice(-4)}`);
      } else if (activePaymentMethod === 'wallet-cash-cards') {
        console.log(`Selected Wallet: ${selectedWallet}`);
      }
      console.log(`Total Amount: ₹${totalAmount}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Simulated payment successful. Navigating to success page.');
      navigate(`/payment-success?order_id=${orderId}&amount=${totalAmount}`);

    } catch (error) {
      console.error("Payment initiation failed (simulated):", error);
      setErrorMessage(`Payment initiation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Display error if orderId or amount are fundamentally missing
  if (errorMessage && (!orderId || isNaN(parseFloat(initialAmount)))) {
    return (
      <div className="payment-page-wrapper fallback-error-screen">
        <div className="payment-error-box">
          <p className="error-title">Payment Error</p>
          <p className="error-message-text">{errorMessage}</p>
          <button onClick={() => navigate('/')} className="back-to-home-btn">Go to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page-wrapper">
      <div className="payment-header-bar">
        <div className="merchant-info">
          <span className="merchant-label">Merchant Name</span>
          <span className="merchant-name">{merchantName}</span>
        </div>
        <div className="payment-amount-info">
          <span className="amount-label">Payment Amount</span>
          <span className="amount-value">₹ {totalAmount}</span>
        </div>
      </div>

      <div className="payment-container-billdesk">
        <div className="payment-methods-sidebar">
          <div
            className={`method-item ${activePaymentMethod === 'credit-card' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('credit-card')}
          >
            <i className="icon-credit-card"></i> Credit Card
          </div>
          <div
            className={`method-item ${activePaymentMethod === 'debit-card' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('debit-card')}
          >
            <i className="icon-debit-card"></i> Debit Card
          </div>
          <div
            className={`method-item ${activePaymentMethod === 'debit-atm-pin' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('debit-atm-pin')}
          >
            <i className="icon-atm-pin"></i> Debit Card + ATM PIN
          </div>
          <div
            className={`method-item ${activePaymentMethod === 'internet-banking' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('internet-banking')}
          >
            <i className="icon-internet-banking"></i> Internet Banking <span className="arrow-right">›</span>
          </div>
          <div
            className={`method-item ${activePaymentMethod === 'upi' ? 'active' : ''}`}
            onClick={() => { setActivePaymentMethod('upi'); setShowUpiQr(false); setUpiId(''); }} /* Reset UPI state on click */
          >
            <i className="icon-upi"></i> UPI
          </div>
          <div
            className={`method-item ${activePaymentMethod === 'wallet-cash-cards' ? 'active' : ''}`}
            onClick={() => setActivePaymentMethod('wallet-cash-cards')}
          >
            <i className="icon-wallet"></i> Wallet/ Cash Cards
          </div>
        </div>

        <div className="payment-main-content">
          {errorMessage && (orderId && !isNaN(parseFloat(initialAmount))) && ( /* Only show if specific input error, not general route error */
            <p className="payment-error-message">{errorMessage}</p>
          )}
          
          {activePaymentMethod === 'internet-banking' && (
            <div className="internet-banking-section payment-form-section">
              <h3>Select your Bank</h3>
              <p className="section-subtitle">Popular Banks</p>
              <div className="popular-banks-grid">
                {popularBanks.map((bank) => (
                  <label key={bank.id} className="bank-logo-item">
                    <input
                      type="radio"
                      name="bank-selection"
                      value={bank.name}
                      checked={selectedBank === bank.name}
                      onChange={handleBankSelect}
                      className="bank-radio-input"
                    />
                    <div className="bank-logo-container">
                      <img src={bank.logo} alt={bank.name} className="bank-logo" />
                      {selectedBank === bank.name && <div className="bank-radio-indicator"></div>}
                    </div>
                  </label>
                ))}
              </div>

              <p className="section-subtitle all-banks-label">All Banks</p>
              <div className="all-banks-dropdown-container">
                <select
                  className="all-banks-dropdown"
                  value={selectedBank}
                  onChange={handleBankSelect}
                >
                  {allBanks.map((bank) => (
                    <option key={bank.value} value={bank.name}>
                      {bank.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payment-actions">
                <button
                  className="make-payment-btn"
                  onClick={confirmPayment}
                  disabled={loadingPayment || !selectedBank || selectedBank === '== Select your Bank =='}
                >
                  {loadingPayment ? 'Processing...' : 'Make Payment'}
                </button>
                <button className="cancel-link" onClick={() => navigate('/')}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(activePaymentMethod === 'credit-card' || activePaymentMethod === 'debit-card' || activePaymentMethod === 'debit-atm-pin') && (
            <div className="card-payment-section payment-form-section">
              <h3>Pay with {activePaymentMethod === 'credit-card' ? 'Credit Card' : 'Debit Card'}</h3>
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number</label>
                <input
                  type="text"
                  id="cardNumber"
                  className="payment-input"
                  placeholder="XXXX XXXX XXXX XXXX"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength="19"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="expiryDate">Expiry Date (MM/YY)</label>
                  <input
                    type="text"
                    id="expiryDate"
                    className="payment-input"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    maxLength="5"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input
                    type="password"
                    id="cvv"
                    className="payment-input"
                    placeholder="XXX"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    maxLength="4"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="cardHolderName">Card Holder Name</label>
                <input
                  type="text"
                  id="cardHolderName"
                  className="payment-input"
                  placeholder="Name on Card"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value)}
                />
              </div>
              {activePaymentMethod === 'debit-atm-pin' && (
                <div className="form-group">
                  <label htmlFor="atmPin">ATM PIN (Simulated)</label>
                  <input
                    type="password"
                    id="atmPin"
                    className="payment-input"
                    placeholder="XXXX"
                    maxLength="4"
                  />
                </div>
              )}

              <div className="payment-actions">
                <button
                  className="make-payment-btn"
                  onClick={confirmPayment}
                  disabled={loadingPayment || !cardNumber || !expiryDate || !cvv || !cardHolderName}
                >
                  {loadingPayment ? 'Processing...' : 'Pay Now'}
                </button>
                <button className="cancel-link" onClick={() => navigate('/')}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activePaymentMethod === 'upi' && (
            <div className="upi-payment-section payment-form-section">
              <h3>Pay with UPI</h3>
              {!showUpiQr ? (
                <>
                  <div className="form-group">
                    <label htmlFor="upiId">Enter your UPI ID (VPA)</label>
                    <input
                      type="text"
                      id="upiId"
                      className="payment-input"
                      placeholder="example@bankname"
                      value={upiId}
                      onChange={handleUPIChange}
                    />
                  </div>
                  <p className="upi-or">OR</p>
                  <button className="show-qr-btn" onClick={() => setShowUpiQr(true)}>
                    Show QR Code
                  </button>
                </>
              ) : (
                <div className="upi-qr-container">
                  <img src={upiQrCodePlaceholder} alt="Scan to Pay" className="upi-qr-code" />
                  <p className="upi-qr-instruction">Scan this QR code with any UPI app to pay.</p>
                  <button className="back-to-upi-id-btn" onClick={() => setShowUpiQr(false)}>
                    Enter UPI ID manually
                  </button>
                </div>
              )}

              <div className="payment-actions">
                <button
                  className="make-payment-btn"
                  onClick={confirmPayment}
                  disabled={loadingPayment || (!upiId && !showUpiQr)}
                >
                  {loadingPayment ? 'Processing...' : 'Verify & Pay'}
                </button>
                <button className="cancel-link" onClick={() => navigate('/')}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activePaymentMethod === 'wallet-cash-cards' && (
            <div className="wallet-payment-section payment-form-section">
              <h3>Select your Wallet/Cash Card</h3>
              <div className="form-group">
                <select
                  className="payment-input wallet-dropdown"
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                >
                  {walletOptions.map(wallet => (
                    <option key={wallet.value} value={wallet.value}>{wallet.label}</option>
                  ))}
                </select>
              </div>
              <p className="wallet-note">
                You will be redirected to the selected wallet provider's page to complete the payment.
              </p>
              <div className="payment-actions">
                <button
                  className="make-payment-btn"
                  onClick={confirmPayment}
                  disabled={loadingPayment || !selectedWallet || selectedWallet === '== Select your Wallet =='}
                >
                  {loadingPayment ? 'Processing...' : 'Pay with Wallet'}
                </button>
                <button className="cancel-link" onClick={() => navigate('/')}>
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="payment-footer">
        {billdeskLogo && <img src={billdeskLogo} alt="BillDesk" className="billdesk-logo" />}
        {!billdeskLogo && <span className="billdesk-text-logo">BillDesk</span>}
      </div>
    </div>
  );
};

export default Payment;
