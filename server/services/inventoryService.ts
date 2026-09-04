import { db } from '../db';
import { Product, ProductCategory, InventoryMovement, MovementType } from '../../src/types';
import { roundMoney, toDecimal } from '../../src/lib/finance';

export interface CreateProductPayload {
  sku: string;
  barcode?: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description?: string;
  supplierId?: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStock?: number;
  unit?: string;
  warranty?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  user: string;
}

export const createProduct = (payload: CreateProductPayload): Product => {
  const data = db.getRawData();

  // Check unique SKU
  const existingSku = data.products.find(
    (p) => p.sku.toLowerCase() === payload.sku.trim().toLowerCase()
  );
  if (existingSku) {
    throw new Error(`Product SKU "${payload.sku}" already exists.`);
  }

  // Check unique Barcode if provided
  if (payload.barcode && payload.barcode.trim()) {
    const existingBarcode = data.products.find(
      (p) => p.barcode && p.barcode.trim() === payload.barcode?.trim()
    );
    if (existingBarcode) {
      throw new Error(`Barcode "${payload.barcode}" already registered for product: ${existingBarcode.name}`);
    }
  }

  let supplierName = undefined;
  if (payload.supplierId) {
    const supplier = data.suppliers.find((s) => s.id === payload.supplierId);
    if (supplier) supplierName = supplier.companyName;
  }

  const nowIso = new Date().toISOString();
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialStock = payload.stockQuantity || 0;

  const product: Product = {
    id: productId,
    sku: payload.sku.trim().toUpperCase(),
    barcode: payload.barcode ? payload.barcode.trim() : '',
    name: payload.name.trim(),
    brand: payload.brand ? payload.brand.trim() : 'Peace Tech',
    category: payload.category,
    description: payload.description || '',
    supplierId: payload.supplierId,
    supplierName,
    costPrice: roundMoney(payload.costPrice),
    sellingPrice: roundMoney(payload.sellingPrice),
    stockQuantity: initialStock,
    minStock: payload.minStock !== undefined ? payload.minStock : 3,
    unit: payload.unit || 'Unit',
    warranty: payload.warranty || '1 Year',
    status: payload.status || 'ACTIVE',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  data.products.unshift(product);

  if (initialStock > 0) {
    data.movements.push({
      id: `mov_init_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'MANUAL_STOCK_IN',
      quantity: initialStock,
      beforeStock: 0,
      afterStock: initialStock,
      reason: 'Initial Opening Stock Entry',
      reference: 'INIT-PRODUCT',
      user: payload.user || '007',
      createdAt: nowIso,
    });
  }

  db.persist();
  return product;
};

export const updateProduct = (
  id: string,
  payload: Partial<CreateProductPayload>
): Product => {
  const data = db.getRawData();
  const product = data.products.find((p) => p.id === id);
  if (!product) throw new Error('Product not found.');

  if (payload.sku && payload.sku !== product.sku) {
    const dup = data.products.find(
      (p) => p.id !== id && p.sku.toLowerCase() === payload.sku?.trim().toLowerCase()
    );
    if (dup) throw new Error(`SKU "${payload.sku}" already in use by another product.`);
    product.sku = payload.sku.trim().toUpperCase();
  }

  if (payload.barcode !== undefined) {
    product.barcode = payload.barcode.trim();
  }
  if (payload.name) product.name = payload.name.trim();
  if (payload.brand) product.brand = payload.brand.trim();
  if (payload.category) product.category = payload.category;
  if (payload.description !== undefined) product.description = payload.description;
  if (payload.costPrice !== undefined) product.costPrice = roundMoney(payload.costPrice);
  if (payload.sellingPrice !== undefined) product.sellingPrice = roundMoney(payload.sellingPrice);
  if (payload.minStock !== undefined) product.minStock = payload.minStock;
  if (payload.unit) product.unit = payload.unit;
  if (payload.warranty) product.warranty = payload.warranty;
  if (payload.status) product.status = payload.status;
  if (payload.supplierId !== undefined) {
    product.supplierId = payload.supplierId;
    const sup = data.suppliers.find((s) => s.id === payload.supplierId);
    product.supplierName = sup ? sup.companyName : undefined;
  }

  product.updatedAt = new Date().toISOString();
  db.persist();
  return product;
};

export const adjustStock = (
  productId: string,
  type: 'ADJUSTMENT' | 'MANUAL_STOCK_IN' | 'MANUAL_STOCK_OUT' | 'RETURN',
  quantityChange: number,
  reason: string,
  user: string
): { product: Product; movement: InventoryMovement } => {
  const data = db.getRawData();
  const product = data.products.find((p) => p.id === productId);
  if (!product) throw new Error('Product not found.');

  const beforeStock = product.stockQuantity;
  const afterStock = beforeStock + quantityChange;

  if (afterStock < 0) {
    throw new Error(
      `Cannot reduce stock below 0. Current stock: ${beforeStock}, Requested change: ${quantityChange}`
    );
  }

  product.stockQuantity = afterStock;
  product.updatedAt = new Date().toISOString();

  const movement: InventoryMovement = {
    id: `mov_adj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    type: type as MovementType,
    quantity: quantityChange,
    beforeStock,
    afterStock,
    reason: reason || 'Manual Stock Adjustment',
    reference: `ADJ-${new Date().getFullYear()}`,
    user: user || '007',
    createdAt: new Date().toISOString(),
  };

  data.movements.unshift(movement);
  db.persist();
  return { product, movement };
};
