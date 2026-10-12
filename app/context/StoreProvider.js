"use client";
// Global client store: cart state (localStorage) + public store settings + toasts.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const StoreContext = createContext(null);
const CART_KEY = "liziz_cart_v1";

// A unique line key = product + size + colour, so variants are separate lines.
function lineKey(productId, size, colour) {
  return `${productId}::${size || "-"}::${colour || "-"}`;
}

export function StoreProvider({ children, initialSettings }) {
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(
    initialSettings || {
      storeName: "Liziz",
      currency: "Rs.",
      whatsappNumber: "",
      paymentOptions: [],
    },
  );
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  // Load cart from localStorage once.
  useEffect(() => {
    try {
      localStorage.removeItem("vc_cart_v1");
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (Array.isArray(stored)) {
          setCart(stored.filter((line) =>
            line && Number.isFinite(line.qty) && line.qty > 0 &&
            Number.isFinite(line.price) && line.price >= 0,
          ));
        }
      }
    } catch {}
    setReady(true);
  }, []);

  // Persist cart.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Keep shopping in memory when browser storage is unavailable or full.
    }
  }, [cart, ready]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const addToCart = useCallback((item) => {
    setCart((prev) => {
      const key = lineKey(item.productId, item.size, item.colour);
      const idx = prev.findIndex((l) => l.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...item, key, qty: next[idx].qty + (item.qty || 1) };
        return next;
      }
      return [...prev, { ...item, key, qty: item.qty || 1 }];
    });
  }, []);

  const updateQty = useCallback((key, qty) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: Math.max(0, qty) } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const removeLine = useCallback((key) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const count = cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = cart.reduce((n, l) => n + l.qty * l.price, 0);

  const value = {
    cart,
    count,
    subtotal,
    ready,
    settings,
    setSettings,
    addToCart,
    updateQty,
    removeLine,
    clearCart,
    toast,
    showToast,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function formatMoney(amount, currency = "Rs.") {
  const n = Number(amount || 0);
  return `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
