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
  return (
    <BrowserRouter>
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
