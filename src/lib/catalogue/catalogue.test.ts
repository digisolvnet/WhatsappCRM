import { describe, it, expect } from "vitest";
import {
  validateProductPayload,
  validateOrderPayload,
  sanitizeSku,
  ValidationError,
} from "./validation";
import {
  exportProductsToCsv,
  parseAndValidateProductCsv,
} from "./csv";
import {
  checkItemStock,
  deductProductStock,
  restoreProductStock,
  InsufficientStockError,
} from "./inventory";
import {
  generateOrderReference,
  calculateOrderTotals,
  transitionOrderStatus,
  verifyAndMarkOrderPaid,
  renderOrderConfirmationMessage,
  renderPaymentInstructionsMessage,
  computeTenantCatalogueMetrics,
  OrderStateTransitionError,
  UnverifiedPaymentError,
} from "./order-engine";
import { assertTenantScope, CrossTenantViolationError } from "@/lib/auth/tenant-guard";
import type { TenantProduct, TenantOrder } from "./types";

const mockProduct: TenantProduct = {
  id: "prod-1",
  account_id: "tenant-alpha",
  name: "Automation Book",
  sku: "PRD-BK-01",
  description: "Complete guide",
  category: "Books",
  images: [],
  price: 500,
  currency: "INR",
  tax_rate_percent: 18,
  item_type: "product",
  stock_quantity: 10,
  track_inventory: true,
  is_available: true,
  status: "active",
  variants: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockService: TenantProduct = {
  id: "srv-1",
  account_id: "tenant-alpha",
  name: "API Setup Consultation",
  sku: "SRV-SETUP-01",
  description: "1-on-1 setup session",
  category: "Services",
  images: [],
  price: 2000,
  currency: "INR",
  tax_rate_percent: 18,
  item_type: "service",
  stock_quantity: 0,
  track_inventory: false,
  is_available: true,
  status: "active",
  variants: [],
  service_duration_minutes: 60,
  service_booking_requirements: "Admin rights to WhatsApp business",
  service_terms: "Non-refundable once session starts",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("Phase 5: Business Catalogue & Order Management", () => {
  describe("Product & Service Validation", () => {
    it("sanitizes and validates correct SKU format", () => {
      expect(sanitizeSku("prd-test-123")).toBe("PRD-TEST-123");
      expect(() => sanitizeSku("")).toThrow(ValidationError);
      expect(() => sanitizeSku("invalid sku with spaces")).toThrow(ValidationError);
    });

    it("validates valid physical product payload", () => {
      const valid = validateProductPayload({
        name: "Test Gadget",
        sku: "TEST-GADGET-1",
        price: 999,
        tax_rate_percent: 18,
        stock_quantity: 20,
        item_type: "product",
      });

      expect(valid.name).toBe("Test Gadget");
      expect(valid.sku).toBe("TEST-GADGET-1");
      expect(valid.price).toBe(999);
      expect(valid.tax_rate_percent).toBe(18);
      expect(valid.track_inventory).toBe(true);
      expect(valid.stock_quantity).toBe(20);
    });

    it("validates valid service payload and disables inventory tracking", () => {
      const valid = validateProductPayload({
        name: "Business Audit",
        sku: "SRV-AUDIT-1",
        price: 4999,
        item_type: "service",
        service_duration_minutes: 90,
        service_booking_requirements: "Access credentials",
      });

      expect(valid.item_type).toBe("service");
      expect(valid.track_inventory).toBe(false);
      expect(valid.stock_quantity).toBe(0);
      expect(valid.service_duration_minutes).toBe(90);
    });

    it("rejects negative price and invalid tax boundaries", () => {
      expect(() =>
        validateProductPayload({
          name: "Invalid Item",
          sku: "INV-1",
          price: -50,
        })
      ).toThrow(ValidationError);

      expect(() =>
        validateProductPayload({
          name: "Invalid Item",
          sku: "INV-2",
          price: 100,
          tax_rate_percent: 150, // exceeds 100%
        })
      ).toThrow(ValidationError);
    });
  });

  describe("CSV Import, Export & Duplicate Detection", () => {
    it("exports products to standard RFC 4180 CSV", () => {
      const csv = exportProductsToCsv([mockProduct, mockService]);
      expect(csv).toContain("name,sku,item_type,category,price");
      expect(csv).toContain("Automation Book,PRD-BK-01,product,Books,500");
      expect(csv).toContain("API Setup Consultation,SRV-SETUP-01,service,Services,2000");
    });

    it("detects in-file duplicate SKUs during CSV import", () => {
      const csvContent = `name,sku,item_type,price,stock_quantity,category
Item 1,SKU-DUP-1,product,100,10,Test
Item 2,SKU-DUP-1,product,200,20,Test`;

      const result = parseAndValidateProductCsv(csvContent);
      expect(result.duplicateSkus).toContain("SKU-DUP-1");
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validRows.length).toBe(1); // Only the first row is accepted
    });

    it("detects duplicate SKU against existing database catalogue", () => {
      const existingSkus = new Set(["PRD-BK-01"]);
      const csvContent = `name,sku,item_type,price,stock_quantity,category
New Book,PRD-BK-01,product,450,5,Books`;

      const result = parseAndValidateProductCsv(csvContent, existingSkus);
      expect(result.duplicateSkus).toContain("PRD-BK-01");
      expect(result.validRows.length).toBe(0);
    });
  });

  describe("Stock Consistency & Inventory Rules", () => {
    it("deducts stock correctly for physical products", () => {
      const updated = deductProductStock(mockProduct, 3);
      expect(updated.stock_quantity).toBe(7);
    });

    it("throws InsufficientStockError when requested quantity exceeds available stock", () => {
      expect(() => checkItemStock(mockProduct, 15, false)).toThrow(InsufficientStockError);
    });

    it("restores stock upon cancellation or refund", () => {
      const restored = restoreProductStock(mockProduct, 5);
      expect(restored.stock_quantity).toBe(15);
    });

    it("service items completely bypass inventory deduction", () => {
      expect(() => checkItemStock(mockService, 50, false)).not.toThrow();
      const updatedService = deductProductStock(mockService, 50);
      expect(updatedService.stock_quantity).toBe(0); // remains untouched
    });
  });

  describe("Order Engine, State Transitions & Strict Payment Verification", () => {
    it("generates formatted order reference", () => {
      const ref = generateOrderReference();
      expect(ref).toMatch(/^ORD-\d{8}-[A-F0-9]{4}$/);
    });

    it("calculates subtotal, tax amount, and total correctly", () => {
      const items = [
        { unit_price: 100, quantity: 2, tax_rate_percent: 18 },
        { unit_price: 50, quantity: 1, tax_rate_percent: 0 },
      ];
      const { subtotal, taxAmount, total } = calculateOrderTotals(items);
      expect(subtotal).toBe(250);
      expect(taxAmount).toBe(36); // 18% of 200 = 36
      expect(total).toBe(286);
    });

    it("enforces valid lifecycle state transitions", () => {
      expect(transitionOrderStatus("pending", "confirmed")).toBe("confirmed");
      expect(transitionOrderStatus("confirmed", "processing")).toBe("processing");
      expect(transitionOrderStatus("processing", "completed")).toBe("completed");
      expect(transitionOrderStatus("completed", "refunded")).toBe("refunded");

      // Illegal transition from cancelled to completed
      expect(() => transitionOrderStatus("cancelled", "completed")).toThrow(
        OrderStateTransitionError
      );
    });

    it("rejects marking order as paid without valid payment reference", () => {
      const sampleOrder: TenantOrder = {
        id: "ord-test",
        account_id: "tenant-alpha",
        order_reference: "ORD-20261016-AAAA",
        customer_name: "John Doe",
        customer_phone: "+919876543210",
        order_type: "product",
        status: "pending",
        payment_status: "unpaid",
        fulfilment_status: "unfulfilled",
        currency: "INR",
        subtotal_amount: 500,
        tax_amount: 90,
        total_amount: 590,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Customer screenshot or empty ref must fail
      expect(() =>
        verifyAndMarkOrderPaid(sampleOrder, {
          provider: "razorpay",
          paymentReference: "",
          verifiedBy: "Agent",
        })
      ).toThrow(UnverifiedPaymentError);

      // Failed cryptographic signature must fail
      expect(() =>
        verifyAndMarkOrderPaid(sampleOrder, {
          provider: "razorpay",
          paymentReference: "pay_test_123",
          verifiedBy: "Agent",
          signatureValid: false,
        })
      ).toThrow(UnverifiedPaymentError);

      // Verified provider reference succeeds
      const paidOrder = verifyAndMarkOrderPaid(sampleOrder, {
        provider: "razorpay",
        paymentReference: "pay_verified_999",
        verifiedBy: "Razorpay Webhook",
        signatureValid: true,
      });

      expect(paidOrder.payment_status).toBe("paid");
      expect(paidOrder.payment_reference).toBe("pay_verified_999");
      expect(paidOrder.payment_verified_at).toBeDefined();
    });

    it("renders personalized WhatsApp order confirmation message", () => {
      const sampleOrder: TenantOrder = {
        id: "ord-msg",
        account_id: "tenant-alpha",
        order_reference: "ORD-20261016-1234",
        customer_name: "Alice Smith",
        customer_phone: "+919876543210",
        order_type: "product",
        status: "confirmed",
        payment_status: "paid",
        fulfilment_status: "unfulfilled",
        currency: "INR",
        subtotal_amount: 500,
        tax_amount: 0,
        total_amount: 500,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const msg = renderOrderConfirmationMessage(sampleOrder);
      expect(msg).toContain("Alice Smith");
      expect(msg).toContain("#ORD-20261016-1234");
      expect(msg).toContain("INR 500.00");
    });
  });

  describe("Tenant Isolation & Admin Privacy Safeguards", () => {
    it("rejects cross-tenant data requests", () => {
      const tenantContext = { accountId: "tenant-alpha", role: "owner" as const, userId: "user-1" };

      // Scoped access allowed
      expect(() => assertTenantScope("tenant-alpha", tenantContext as any)).not.toThrow();

      // Foreign tenant access forbidden
      expect(() => assertTenantScope("tenant-beta", tenantContext as any)).toThrow(
        CrossTenantViolationError
      );
    });

    it("computes privacy-safe aggregate catalogue metrics without leaking customer details", () => {
      const sampleOrders: TenantOrder[] = [
        {
          id: "ord-1",
          account_id: "tenant-alpha",
          order_reference: "ORD-1",
          customer_name: "Secret VIP Customer",
          customer_phone: "+919999999999",
          order_type: "product",
          status: "completed",
          payment_status: "paid",
          fulfilment_status: "fulfilled",
          currency: "INR",
          subtotal_amount: 1000,
          tax_amount: 180,
          total_amount: 1180,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const metrics = computeTenantCatalogueMetrics(
        "tenant-alpha",
        sampleOrders,
        [mockProduct, mockService]
      );

      expect(metrics.totalOrders).toBe(1);
      expect(metrics.totalOrderVolume).toBe(1180);
      expect(metrics.totalProductsCount).toBe(1);
      expect(metrics.totalServicesCount).toBe(1);
      expect(metrics.ordersByStatus.completed).toBe(1);

      // Verify ZERO customer personal details or message contents are present in aggregate metrics
      const serialized = JSON.stringify(metrics);
      expect(serialized).not.toContain("Secret VIP Customer");
      expect(serialized).not.toContain("+919999999999");
    });
  });
});
