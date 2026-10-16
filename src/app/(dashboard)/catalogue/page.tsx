"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Download,
  Upload,
  Layers,
  Clock,
  Archive,
  CheckCircle2,
  AlertTriangle,
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
  tax_rate_percent: number;
  item_type: "product" | "service";
  stock_quantity: number;
  track_inventory: boolean;
  is_available: boolean;
  status: string;
  service_duration_minutes?: number | null;
  service_booking_requirements?: string | null;
}

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "product" | "service">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  // New item form state
  const [itemType, setItemType] = useState<"product" | "service">("product");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("499");
  const [taxRate, setTaxRate] = useState("18");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [stockQuantity, setStockQuantity] = useState("50");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [bookingRequirements, setBookingRequirements] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalogue/products?status=all`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name,
        sku,
        price: parseFloat(price),
        tax_rate_percent: parseFloat(taxRate),
        category,
        description,
        item_type: itemType,
      };

      if (itemType === "product") {
        payload.stock_quantity = parseInt(stockQuantity, 10);
        payload.track_inventory = true;
      } else {
        payload.service_duration_minutes = parseInt(serviceDuration, 10);
        payload.service_booking_requirements = bookingRequirements;
      }

      const res = await fetch("/api/catalogue/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        // Reset form
        setName("");
        setSku("");
        setDescription("");
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create item");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText.trim()) return;
    setCsvStatus("Importing...");
    try {
      const res = await fetch("/api/catalogue/products/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        setCsvStatus(`Successfully imported ${data.importedCount} items!`);
        setTimeout(() => {
          setIsCsvModalOpen(false);
          setCsvStatus(null);
          setCsvText("");
          fetchProducts();
        }, 1500);
      } else {
        setCsvStatus(`Import failed: ${data.message || data.error}`);
      }
    } catch (err: any) {
      setCsvStatus(`Error: ${err.message}`);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (activeTab !== "all" && p.item_type !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
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
            <ShoppingBag className="h-6 w-6 text-emerald-500" />
            Business Catalogue & Services
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your tenant-isolated products, service bookings, variants, and stock rules.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/catalogue/products/csv"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("product")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              activeTab === "product"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Physical Products ({products.filter((p) => p.item_type === "product").length})
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              activeTab === "service"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Services & Bookings ({products.filter((p) => p.item_type === "service").length})
          </button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Product List Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted/50 text-xs uppercase text-foreground border-b border-border">
            <tr>
              <th className="px-6 py-3">Item Details</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Price & Tax</th>
              <th className="px-6 py-3">Stock / Duration</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm">
                  Loading catalogue items...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No products or services found. Click "Add Item" or "Import CSV" to get started.
                </td>
              </tr>
            ) : (
              filteredProducts.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      SKU: {item.sku} • {item.category}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-sm mt-1">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {item.item_type === "service" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                        <Clock className="h-3 w-3" />
                        Service
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        <Layers className="h-3 w-3" />
                        Product
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-foreground">
                      ₹{item.price.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      +{item.tax_rate_percent}% GST
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {item.item_type === "service" ? (
                      <div className="text-sm text-foreground">
                        {item.service_duration_minutes || 60} mins session
                      </div>
                    ) : item.track_inventory ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            item.stock_quantity > 0 ? "text-foreground" : "text-destructive"
                          }`}
                        >
                          {item.stock_quantity} in stock
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Add New Catalogue Item</h3>
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setItemType("product")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                  itemType === "product" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Physical Product
              </button>
              <button
                type="button"
                onClick={() => setItemType("service")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition ${
                  itemType === "service" ? "bg-card text-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Service / Consultation
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Consultation Session"
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">SKU *</label>
                  <input
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SRV-CONS-01"
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground uppercase font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Category</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {itemType === "product" ? (
                <div>
                  <label className="text-xs font-medium text-foreground">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Duration (Minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(e.target.value)}
                      className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Booking Requirements</label>
                    <input
                      value={bookingRequirements}
                      onChange={(e) => setBookingRequirements(e.target.value)}
                      placeholder="e.g. Phone number required"
                      className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Import Products / Services via CSV</h3>
            <p className="text-xs text-muted-foreground">
              Paste standard CSV content with columns: <code>name, sku, item_type, price, stock_quantity, category</code>
            </p>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="name,sku,item_type,price,stock_quantity,category&#10;Marketing Ebook,PRD-EB-01,product,499,100,Digital&#10;Setup Service,SRV-SETUP-02,service,1999,0,Services"
              className="w-full rounded-lg border border-border bg-background p-3 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {csvStatus && (
              <div className="text-xs p-2 rounded bg-muted text-foreground font-mono">
                {csvStatus}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCsvImport}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Run Import & Validate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
