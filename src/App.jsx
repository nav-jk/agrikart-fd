import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './routes/RequireAuth';
import RequireFarmer from './routes/RequireFarmer';
import Login from './pages/Login';
import SignupBuyer from './pages/SignupBuyer';
import SignupFarmer from './pages/SignupFarmer';
import Home from './pages/Home';
import Cart from './pages/Cart';
import Payment from './pages/Payment';
import FarmerDashboard from './pages/FarmerDashboard';
import Navbar from './components/Navbar';
import BuyerDashboard from './pages/BuyerDashboard';
import RequireBuyer from './routes/RequireBuyer';
import Me from './pages/Me';
import LogisticsMap from './pages/LogisticsMap';
import LogisticsDashboard from './pages/LogisticsDashboard';
import RequireLogistics from './routes/RequireLogistics';
import PaymentSuccess from './pages/PaymentSuccess'; 




function App() {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup/buyer" element={<SignupBuyer />} />
        <Route path="/signup/farmer" element={<SignupFarmer />} />
        <Route path="/" element={<Home />} />
        <Route path="/me" element={<RequireAuth><Me /></RequireAuth>} />
        <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="/payment" element={<RequireAuth><Payment /></RequireAuth>} />
        <Route path="/dashboard/farmer" element={
          <RequireAuth>
            <RequireFarmer>
              <FarmerDashboard />
            </RequireFarmer>
          </RequireAuth>
        } />
        <Route
          path="/dashboard/buyer"
          element={
            <RequireAuth>
              <RequireBuyer>
                <BuyerDashboard />
              </RequireBuyer>
            </RequireAuth>
          }
        />
        <Route
          path="/logistics/dashboard"
          element={
            <RequireAuth>
              <RequireLogistics>
                <LogisticsDashboard />
              </RequireLogistics>
            </RequireAuth>
          }
        />
        <Route path="/logistics/map" element={<LogisticsMap />} />
         <Route path="/payment-success" element={<PaymentSuccess />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
