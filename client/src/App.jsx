import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index.jsx";
import Auth from "./pages/Auth.jsx";
import Signup from "./pages/Signup.jsx";
import Product from "./pages/Product.jsx";
import Profile from "./pages/Profile.jsx";
import History from "./pages/History.jsx";
import Admin from "./pages/Admin.jsx";
import Privacy from "./pages/Privacy.jsx";
import OrderSuccess from "./pages/OrderSuccess.jsx";

function App() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (!res.ok) {
        setIsMaintenance(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setIsMaintenance(!data.ok);
    } catch {
      setIsMaintenance(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const id = setInterval(checkHealth, 30000);
    return () => clearInterval(id);
  }, [checkHealth]);

  return (
    <BrowserRouter>
      {isMaintenance && (
        <div className="maintenance-overlay" role="alert" aria-live="assertive">
          <div className="maintenance-card">
            <div className="maintenance-icon">⚠️</div>
            <h2>We're down for maintenance</h2>
            <p>We're refreshing the store data. Please try again in a few minutes.</p>
            <button className="cta" type="button" onClick={checkHealth} disabled={isChecking}>
              {isChecking ? "Checking" : "Try again"}
            </button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/product" element={<Product />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/history" element={<History />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/auth.html" element={<Navigate to="/auth" replace />} />
        <Route path="/signup.html" element={<Navigate to="/signup" replace />} />
        <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
        <Route path="/history.html" element={<Navigate to="/history" replace />} />
        <Route path="/profile.html" element={<Navigate to="/profile" replace />} />
        <Route path="/privacy.html" element={<Navigate to="/privacy" replace />} />
        <Route path="/product.html" element={<Navigate to="/product" replace />} />
        <Route path="/order-success.html" element={<Navigate to="/order-success" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
