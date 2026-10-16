// ============================================================
// CSV Import & Export for Products and Services
// Supports RFC 4180 compliant CSV parsing, validation,
// and in-batch / cross-database duplicate SKU detection.
// ============================================================

import { ProductCsvRow, CsvImportResult, TenantProduct } from "./types";
import { sanitizeSku, validateProductPayload } from "./validation";

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Serializes products and services into standard CSV format.
 */
export function exportProductsToCsv(products: TenantProduct[]): string {
  const headers = [
    "name",
    "sku",
    "item_type",
    "category",
    "price",
    "currency",
    "tax_rate_percent",
    "stock_quantity",
    "track_inventory",
    "is_available",
    "description",
    "service_duration_minutes",
    "service_booking_requirements",
  ];

  const rows = products.map((p) => [
    escapeCsvField(p.name),
    escapeCsvField(p.sku),
    escapeCsvField(p.item_type),
    escapeCsvField(p.category),
    escapeCsvField(p.price),
    escapeCsvField(p.currency),
    escapeCsvField(p.tax_rate_percent),
    escapeCsvField(p.stock_quantity),
    escapeCsvField(p.track_inventory),
    escapeCsvField(p.is_available),
    escapeCsvField(p.description || ""),
    escapeCsvField(p.service_duration_minutes ?? ""),
    escapeCsvField(p.service_booking_requirements || ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/**
 * Parses and validates CSV string into validated product/service rows,
 * identifying duplicate SKUs within the batch and syntax errors.
 */
export function parseAndValidateProductCsv(
  csvContent: string,
  existingDatabaseSkus: Set<string> = new Set()
): CsvImportResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { totalRows: 0, validRows: [], errors: [], duplicateSkus: [] };
  }

  const rawHeaders = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  const getCol = (cols: string[], name: string): string => {
    const idx = headerMap[name];
    return idx !== undefined && cols[idx] !== undefined ? cols[idx] : "";
  };

  const validRows: ProductCsvRow[] = [];
  const errors: Array<{ row: number; sku?: string; error: string }> = [];
  const duplicateSkus: string[] = [];
  const seenBatchSkus = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-indexed line in file
    const cols = parseCsvLine(lines[i]);
    const name = getCol(cols, "name");
    const rawSku = getCol(cols, "sku");

    if (!name && !rawSku) {
      continue; // skip blank rows
    }

    let sku = "";
    try {
      sku = sanitizeSku(rawSku);
    } catch (err: any) {
      errors.push({ row: rowNumber, error: `Invalid SKU '${rawSku}': ${err.message}` });
      continue;
    }

    // Check duplicate in current batch
    if (seenBatchSkus.has(sku)) {
      duplicateSkus.push(sku);
      errors.push({ row: rowNumber, sku, error: `Duplicate SKU '${sku}' found within CSV file` });
      continue;
    }
    seenBatchSkus.add(sku);

    // Check duplicate against existing database catalogue
    if (existingDatabaseSkus.has(sku)) {
      duplicateSkus.push(sku);
      errors.push({ row: rowNumber, sku, error: `SKU '${sku}' already exists in tenant catalogue` });
      continue;
    }

    const item_type = (getCol(cols, "item_type") || "product").toLowerCase();
    const price = parseFloat(getCol(cols, "price") || "0");
    const category = getCol(cols, "category") || "General";
    const currency = getCol(cols, "currency") || "INR";
    const taxRate = parseFloat(getCol(cols, "tax_rate_percent") || "0");
    const stockQty = parseInt(getCol(cols, "stock_quantity") || "0", 10);
    const trackInventory = getCol(cols, "track_inventory").toLowerCase() !== "false";
    const isAvailable = getCol(cols, "is_available").toLowerCase() !== "false";
    const description = getCol(cols, "description");
    const rawDuration = getCol(cols, "service_duration_minutes");
    const duration = rawDuration ? parseInt(rawDuration, 10) : undefined;
    const bookingReq = getCol(cols, "service_booking_requirements");

    try {
      const validated = validateProductPayload({
        name,
        sku,
        item_type,
        price,
        category,
        currency,
        tax_rate_percent: taxRate,
        stock_quantity: stockQty,
        track_inventory: trackInventory,
        is_available: isAvailable,
        description,
        service_duration_minutes: duration,
        service_booking_requirements: bookingReq,
      });

      validRows.push({
        name: validated.name,
        sku: validated.sku,
        item_type: validated.item_type,
        category: validated.category,
        price: validated.price,
        currency: validated.currency,
        tax_rate_percent: validated.tax_rate_percent,
        stock_quantity: validated.stock_quantity,
        track_inventory: validated.track_inventory,
        is_available: validated.is_available,
        description: validated.description ?? undefined,
        service_duration_minutes: validated.service_duration_minutes ?? undefined,
        service_booking_requirements: validated.service_booking_requirements ?? undefined,
      });
    } catch (err: any) {
      errors.push({ row: rowNumber, sku, error: err.message });
    }
  }

  return {
    totalRows: lines.length - 1,
    validRows,
    errors,
    duplicateSkus,
  };
}
