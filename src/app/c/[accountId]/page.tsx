"use client";

import { useState, useEffect, use } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  item_type: "product" | "service";
  stock_quantity: number | null;
  service_duration_minutes?: number | null;
}

export default function CustomerStorefrontPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = use(params);
  const [storeName, setStoreName] = useState("Store");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadStore() {
      try {
        const res = await fetch(`/api/catalogue/public/${accountId}`);
        if (res.ok) {
          const data = await res.json();
          setStoreName(data.storeName || "Store");
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error("Failed to load storefront", err);
      } finally {
        setLoading(false);
      }
    }
    loadStore();
  }, [accountId]);

  const updateCart = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const prod = products.find((p) => p.id === id);
      if (!prod) return null;
      return { ...prod, quantity: qty, total: prod.price * qty };
    })
    .filter(Boolean) as Array<Product & { quantity: number; total: number }>;

  const cartTotal = cartItems.reduce((acc, it) => acc + it.total, 0);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0 || !customerName.trim() || !customerPhone.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cartItems.map((it) => ({
          product_id: it.id,
          item_type: it.item_type,
          item_name: it.name,
          sku: it.sku,
          unit_price: it.price,
          quantity: it.quantity,
        })),
      };

      const res = await fetch(`/api/catalogue/public/${accountId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setOrderSubmitted(data);
        setCart({});
      } else {
        const err = await res.json();
        alert(err.error || "Failed to place order");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground animate-pulse">Loading catalogue...</p>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold">Order Received!</h2>
          <p className="text-xs text-muted-foreground">
            Order Reference: <span className="font-mono font-bold text-foreground">{orderSubmitted.orderReference}</span>
          </p>
          <div className="rounded-xl bg-muted/40 p-4 text-sm text-left font-mono">
            <div>Total: ₹{orderSubmitted.totalAmount}</div>
            <div className="text-xs text-emerald-400 mt-2">
              WhatsApp Confirmation: You will receive an instant message on {customerPhone} with complete order and payment details.
            </div>
          </div>
          <button
            onClick={() => setOrderSubmitted(null)}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Browse More Items
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Store Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-500" />
            <h1 className="font-bold text-lg text-foreground">{storeName}</h1>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"} in cart
          </div>
        </div>
      </header>

      {/* Main catalogue grid */}
      <main className="flex-1 mx-auto max-w-4xl w-full p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base text-foreground">{item.name}</h3>
                  <span className="text-xs font-semibold text-emerald-400 font-mono">
                    ₹{item.price}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{item.category}</span>
                  {item.item_type === "service" && (
                    <span className="inline-flex items-center gap-1 text-blue-400">
                      <Clock className="h-3 w-3" />
                      {item.service_duration_minutes || 60}m
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {item.item_type === "service" ? "Appointment" : "In Stock"}
                </span>
                <div className="flex items-center gap-2">
                  {cart[item.id] ? (
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => updateCart(item.id, -1)}
                        className="h-6 w-6 rounded bg-card flex items-center justify-center text-foreground hover:bg-background"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold px-1">{cart[item.id]}</span>
                      <button
                        onClick={() => updateCart(item.id, 1)}
                        className="h-6 w-6 rounded bg-card flex items-center justify-center text-foreground hover:bg-background"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateCart(item.id, 1)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                    >
                      Add to Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Drawer when cart is not empty */}
        {cartItems.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center justify-between">
              <span>Your Selected Order</span>
              <span className="text-emerald-500 font-mono">₹{cartTotal.toLocaleString("en-IN")}</span>
            </h2>

            <div className="divide-y divide-border text-xs">
              {cartItems.map((it) => (
                <div key={it.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-foreground">{it.name}</span>
                    <span className="text-muted-foreground ml-2">x {it.quantity}</span>
                  </div>
                  <span className="font-mono">₹{it.total}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmitOrder} className="pt-4 border-t border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Your Name *</label>
                  <input
                    required
                    placeholder="Enter your full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">WhatsApp Phone Number *</label>
                  <input
                    required
                    placeholder="+91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-md"
              >
                <span>{isSubmitting ? "Submitting Order..." : "Submit Order via WhatsApp"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
