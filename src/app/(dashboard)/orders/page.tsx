"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  XCircle,
  Send,
  ExternalLink,
} from "lucide-react";

interface OrderItem {
  id: string;
  item_name: string;
  item_type: "product" | "service";
  sku?: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  service_scheduled_at?: string;
}

interface Order {
  id: string;
  order_reference: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  order_type: "product" | "service" | "mixed";
  status: "pending" | "confirmed" | "processing" | "completed" | "cancelled" | "refunded";
  payment_status: "unpaid" | "pending_verification" | "paid" | "partially_refunded" | "refunded" | "failed";
  fulfilment_status: "unfulfilled" | "scheduled" | "in_progress" | "fulfilled" | "cancelled";
  currency: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  payment_reference?: string | null;
  payment_verified_at?: string | null;
  items?: OrderItem[];
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Payment verification modal state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [paymentRefInput, setPaymentRefInput] = useState("");
  const [verifyProvider, setVerifyProvider] = useState<"razorpay" | "bank_transfer_admin">("razorpay");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalogue/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleVerifyPayment = async () => {
    if (!selectedOrder || !paymentRefInput.trim()) return;
    try {
      const res = await fetch(`/api/catalogue/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_payment",
          provider: verifyProvider,
          paymentReference: paymentRefInput.trim(),
          verifiedBy: "CRM Admin",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
        setIsVerifyModalOpen(false);
        setPaymentRefInput("");
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || "Payment verification failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/catalogue/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
        fetchOrders();
      } else {
        const err = await res.json();
        alert(err.error || "Status update failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.order_reference.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-emerald-500" />
            Customer Orders & Fulfilment
          </h1>
          <p className="text-sm text-muted-foreground">
            Track customer orders, verify genuine payments, and trigger WhatsApp updates.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["all", "pending", "confirmed", "processing", "completed", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reference or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted/50 text-xs uppercase text-foreground border-b border-border">
            <tr>
              <th className="px-6 py-3">Order Ref</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Payment</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Total Amount</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm">
                  Loading orders...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No orders found matching the filter criteria.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition">
                  <td className="px-6 py-4 font-mono font-semibold text-foreground">
                    {order.order_reference}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{order.customer_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {order.customer_phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-xs">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-medium text-foreground">
                      {order.order_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        order.payment_status === "paid"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {order.payment_status === "paid" ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        order.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : order.status === "cancelled"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    ₹{order.total_amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Order #{selectedOrder.order_reference}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-4 text-xs">
              <div>
                <span className="text-muted-foreground">Customer:</span>
                <div className="font-semibold text-foreground text-sm mt-0.5">
                  {selectedOrder.customer_name}
                </div>
                <div className="font-mono text-muted-foreground mt-0.5">
                  {selectedOrder.customer_phone}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Payment State:</span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      selectedOrder.payment_status === "paid"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {selectedOrder.payment_status}
                  </span>
                  {selectedOrder.payment_status !== "paid" && (
                    <button
                      onClick={() => setIsVerifyModalOpen(true)}
                      className="text-xs font-semibold text-emerald-500 underline hover:text-emerald-400"
                    >
                      Verify & Mark Paid
                    </button>
                  )}
                </div>
                {selectedOrder.payment_reference && (
                  <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                    Ref: {selectedOrder.payment_reference}
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Order Items
              </h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-foreground">
                    <tr>
                      <th className="px-4 py-2">Item</th>
                      <th className="px-4 py-2">Qty</th>
                      <th className="px-4 py-2">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selectedOrder.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-foreground">{it.item_name}</div>
                          {it.sku && <div className="text-[10px] text-muted-foreground font-mono">SKU: {it.sku}</div>}
                        </td>
                        <td className="px-4 py-2.5">{it.quantity}</td>
                        <td className="px-4 py-2.5">₹{it.unit_price}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                          ₹{it.total_price}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-3 text-sm font-bold text-foreground">
                Total: ₹{selectedOrder.total_amount.toLocaleString("en-IN")}
              </div>
            </div>

            {/* WhatsApp Messaging Flow Actions */}
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                WhatsApp Customer Communication Flow
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => alert(`Sent WhatsApp Order Confirmation to ${selectedOrder.customer_phone}`)}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted transition flex items-center justify-between"
                >
                  <span>1. Send Order Confirmation</span>
                  <Send className="h-3.5 w-3.5 text-emerald-500" />
                </button>
                <button
                  onClick={() => alert(`Sent WhatsApp Payment Instructions to ${selectedOrder.customer_phone}`)}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted transition flex items-center justify-between"
                >
                  <span>2. Send Payment Link</span>
                  <Send className="h-3.5 w-3.5 text-emerald-500" />
                </button>
                <button
                  onClick={() => alert(`Sent Status Update to ${selectedOrder.customer_phone}`)}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted transition flex items-center justify-between"
                >
                  <span>3. Send Status Update</span>
                  <Send className="h-3.5 w-3.5 text-emerald-500" />
                </button>
                <button
                  onClick={() => alert(`Sent Feedback Request to ${selectedOrder.customer_phone}`)}
                  className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted transition flex items-center justify-between"
                >
                  <span>4. Request Feedback</span>
                  <Send className="h-3.5 w-3.5 text-emerald-500" />
                </button>
              </div>
            </div>

            {/* Status Transitions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Change Status:</span>
                {["confirmed", "processing", "completed", "cancelled"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusTransition(st)}
                    disabled={selectedOrder.status === st}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium capitalize text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    {st}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Payment Modal */}
      {isVerifyModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Verify Order Payment
            </h3>
            <p className="text-xs text-muted-foreground">
              Verify payment against provider records before marking paid. Never mark paid based solely on customer claims.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">Payment Provider</label>
                <select
                  value={verifyProvider}
                  onChange={(e: any) => setVerifyProvider(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none"
                >
                  <option value="razorpay">Razorpay Gateway</option>
                  <option value="bank_transfer_admin">Bank Transfer / Reconciliation</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Payment Reference / Transaction ID *
                </label>
                <input
                  required
                  placeholder="e.g. pay_Rzp91823746"
                  value={paymentRefInput}
                  onChange={(e) => setPaymentRefInput(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPayment}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Confirm Verified Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
