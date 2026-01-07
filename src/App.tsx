import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminPortalPage } from "./pages/AdminPortal";
import { CartPage } from "./pages/Cart";
import { CheckoutPage } from "./pages/Checkout";
import { NotFoundPage } from "./pages/NotFound";
import { ShopPage } from "./pages/Shop";
import { SuccessPage } from "./pages/Success";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/admin-portal" element={<AdminPortalPage />} />
          <Route path="/shop" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}