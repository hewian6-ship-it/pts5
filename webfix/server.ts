import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db';
import {
  requireAuth,
  signToken,
  comparePassword,
  hashPassword,
  AuthenticatedRequest,
} from './server/auth';
import { processCheckout, cancelInvoice } from './server/services/posService';
import {
  createQuotation,
  updateQuotationStatus,
  convertQuotationToInvoice,
} from './server/services/quotationService';
import { createDeposit, addDepositPayment } from './server/services/depositService';
import {
  createProduct,
  updateProduct,
  adjustStock,
} from './server/services/inventoryService';
import { createPurchase } from './server/services/purchaseService';
import {
  getDailyClosingPreview,
  closeBusinessDay,
} from './server/services/closingService';
import {
  getDashboardStats,
  getProfitAndLoss,
  getInventoryValuation,
} from './server/services/accountingService';
import { roundMoney } from './src/lib/finance';

export async function createApp() {
  const app = express();
  const PORT = 3000;

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // ==========================================
  // 1. AUTHENTICATION ROUTES
  // ==========================================
  app.post('/api/auth/login', (req, res) => {
    try {
      const { userId, password } = req.body;
      if (!userId || !password) {
        res.status(400).json({ error: 'User ID and password are required.' });
        return;
      }

      const data = db.getRawData();
      const user = data.users.find((u) => u.userId === userId.trim());

      // In initial seed or updated password verification
      // Default initial password: peacetech001101@
      let isValid = false;
      if (user) {
        // If password starts with $2b$ or $2a$ it's bcrypt hash
        if ((user as any).passwordHash) {
          isValid = comparePassword(password, (user as any).passwordHash);
        } else {
          // Verify default password
          isValid = password === 'peacetech001101@';
        }
      }

      if (!isValid || !user) {
        res.status(401).json({ error: 'Invalid User ID or Password.' });
        return;
      }

      const token = signToken(user);

      // Set secure HTTP-only cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          userId: user.userId,
          name: user.name,
          role: user.role,
        },
        token,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message || 'Internal login error.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const data = db.getRawData();
    const user = data.users.find((u) => u.id === req.user?.id) || req.user;
    res.json({ user });
  });

  app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        return;
      }

      const data = db.getRawData();
      const user = data.users.find((u) => u.id === req.user?.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      let isCurrentValid = false;
      if ((user as any).passwordHash) {
        isCurrentValid = comparePassword(currentPassword, (user as any).passwordHash);
      } else {
        isCurrentValid = currentPassword === 'peacetech001101@';
      }

      if (!isCurrentValid) {
        res.status(400).json({ error: 'Incorrect current password.' });
        return;
      }

      (user as any).passwordHash = hashPassword(newPassword);
      db.persist();

      res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 2. POS & CHECKOUT ROUTES
  // ==========================================
  app.post('/api/pos/checkout', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const payload = {
        ...req.body,
        user: req.user?.userId || '007',
      };
      const result = processCheckout(payload);
      res.json(result);
    } catch (err: any) {
      console.error('Checkout error:', err);
      res.status(400).json({ error: err.message || 'Checkout failed.' });
    }
  });

  app.get('/api/pos/search', requireAuth, (req, res) => {
    try {
      const q = (req.query.q as string || '').trim().toLowerCase();
      if (!q) {
        res.json({ products: [] });
        return;
      }

      const data = db.getRawData();
      // Match barcode exact first, then sku or name partial
      const exactBarcode = data.products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === q
      );

      if (exactBarcode) {
        res.json({ matchType: 'EXACT_BARCODE', product: exactBarcode, products: [exactBarcode] });
        return;
      }

      const results = data.products.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      );

      res.json({ matchType: 'LIST', products: results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 3. INVOICES ROUTES
  // ==========================================
  app.get('/api/invoices', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { status, paymentMethod, search, startDate, endDate } = req.query;

      let list = [...data.invoices];

      if (status && status !== 'ALL') {
        list = list.filter((i) => i.paymentStatus === status);
      }
      if (paymentMethod && paymentMethod !== 'ALL') {
        list = list.filter((i) => i.paymentMethod === paymentMethod);
      }
      if (startDate) {
        list = list.filter((i) => i.date >= (startDate as string));
      }
      if (endDate) {
        list = list.filter((i) => i.date.split('T')[0] <= (endDate as string));
      }
      if (search) {
        const term = (search as string).toLowerCase();
        list = list.filter(
          (i) =>
            i.invoiceNo.toLowerCase().includes(term) ||
            i.customerName.toLowerCase().includes(term) ||
            (i.customerPhone && i.customerPhone.includes(term))
        );
      }

      res.json({ invoices: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/invoices/:id', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const invoice = data.invoices.find((i) => i.id === req.params.id || i.invoiceNo === req.params.id);
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found.' });
        return;
      }
      res.json({ invoice });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/invoices/:id/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const user = req.user?.userId || '007';
      const cancelledInvoice = cancelInvoice(req.params.id, reason || 'Customer requested void', user);
      res.json({ success: true, invoice: cancelledInvoice });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 4. QUOTATIONS ROUTES
  // ==========================================
  app.get('/api/quotations', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ quotations: data.quotations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/quotations', requireAuth, (req, res) => {
    try {
      const quotation = createQuotation(req.body);
      res.json({ success: true, quotation });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/quotations/:id/status', requireAuth, (req, res) => {
    try {
      const quotation = updateQuotationStatus(req.params.id, req.body.status);
      res.json({ success: true, quotation });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/quotations/:id/convert', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { paymentMethod, cashReceived } = req.body;
      const user = req.user?.userId || '007';
      const result = convertQuotationToInvoice(
        req.params.id,
        paymentMethod || 'CASH',
        user,
        cashReceived
      );
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. DEPOSITS ROUTES
  // ==========================================
  app.get('/api/deposits', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ deposits: data.deposits });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/deposits', requireAuth, (req, res) => {
    try {
      const deposit = createDeposit(req.body);
      res.json({ success: true, deposit });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/deposits/:id/payments', requireAuth, (req, res) => {
    try {
      const { amount, method, reference } = req.body;
      const deposit = addDepositPayment(req.params.id, amount, method, reference);
      res.json({ success: true, deposit });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. INVENTORY & PRODUCTS ROUTES
  // ==========================================
  app.get('/api/products', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { category, search, lowStock } = req.query;

      let list = [...data.products];

      if (category && category !== 'ALL') {
        list = list.filter((p) => p.category === category);
      }
      if (lowStock === 'true') {
        list = list.filter((p) => p.category !== 'Services' && p.stockQuantity <= p.minStock);
      }
      if (search) {
        const term = (search as string).toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.sku.toLowerCase().includes(term) ||
            (p.barcode && p.barcode.includes(term)) ||
            (p.brand && p.brand.toLowerCase().includes(term))
        );
      }

      res.json({ products: list, categories: data.categories });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user?.userId || '007';
      const product = createProduct({ ...req.body, user });
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/products/:id', requireAuth, (req, res) => {
    try {
      const product = updateProduct(req.params.id, req.body);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/products/:id', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const index = data.products.findIndex((p) => p.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      data.products.splice(index, 1);
      db.persist();
      res.json({ success: true, message: 'Product deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/products/:id/adjust-stock', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { type, quantityChange, reason } = req.body;
      const user = req.user?.userId || '007';
      const result = adjustStock(req.params.id, type, quantityChange, reason, user);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/inventory/movements', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { productId } = req.query;
      let list = data.movements;
      if (productId) {
        list = list.filter((m) => m.productId === productId);
      }
      res.json({ movements: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 7. PURCHASES / STOCK IN
  // ==========================================
  app.get('/api/purchases', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ purchases: data.purchases });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/purchases', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user?.userId || '007';
      const purchase = createPurchase({ ...req.body, user });
      res.json({ success: true, purchase });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 8. SUPPLIERS & CUSTOMERS
  // ==========================================
  app.get('/api/suppliers', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ suppliers: data.suppliers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppliers', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { companyName, contactPerson, phone, email, address, notes, paymentTerms } = req.body;
      const supplier = {
        id: `sup_${Date.now()}`,
        companyName: companyName.trim(),
        contactPerson: contactPerson || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        notes: notes || '',
        paymentTerms: paymentTerms || '30 Days',
        totalPurchases: 0,
        outstandingBalance: 0,
        outstandingPayable: 0,
        createdAt: new Date().toISOString(),
      };
      data.suppliers.push(supplier);
      db.persist();
      res.json({ success: true, supplier });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/customers', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ customers: data.customers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customers', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { name, phone, email, address, notes, creditLimit } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Customer name is required.' });
        return;
      }
      const customer = {
        id: `cust_${Date.now()}`,
        name: name.trim(),
        phone: phone || '',
        email: email || '',
        address: address || '',
        notes: notes || '',
        creditLimit: creditLimit || 0,
        balance: 0,
        outstandingBalance: 0,
        totalSpent: 0,
        totalInvoices: 0,
        createdAt: new Date().toISOString(),
      };
      data.customers.push(customer);
      db.persist();
      res.json({ success: true, customer });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 9. DAILY CLOSING
  // ==========================================
  app.get('/api/closing/preview', requireAuth, (req, res) => {
    try {
      const dateStr = req.query.date as string | undefined;
      const preview = getDailyClosingPreview(dateStr);
      res.json({ preview });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/closing', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { businessDate, actualCashCounted, notes } = req.body;
      const user = req.user?.userId || '007';
      const closing = closeBusinessDay(businessDate, actualCashCounted, notes, user);
      res.json({ success: true, closing });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/closing/history', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ closings: data.dailyClosings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 10. EXPENSES
  // ==========================================
  app.get('/api/expenses', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ expenses: data.expenses });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/expenses', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { category, description, amount, paymentMethod, reference, notes } = req.body;
      const amt = roundMoney(amount);
      if (amt <= 0) {
        res.status(400).json({ error: 'Expense amount must be greater than 0.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const expenseId = `exp_${Date.now()}`;
      const expense = {
        id: expenseId,
        date: nowIso,
        category,
        description,
        amount: amt,
        paymentMethod: paymentMethod || 'CASH',
        reference: reference || '',
        notes: notes || '',
        createdAt: nowIso,
      };

      data.expenses.unshift(expense);

      // Create Ledger Entry (Debit EXPENSES, Credit Cash/Bank)
      const payAcct =
        paymentMethod === 'CASH'
          ? 'CASH'
          : paymentMethod === 'QR'
          ? 'BANK_QR'
          : 'CARD_CLEARING';

      data.ledgerEntries.push({
        id: `ledg_exp_${Date.now()}`,
        date: nowIso,
        description: `Expense: [${category}] ${description}`,
        account: 'EXPENSES',
        debit: amt,
        credit: 0,
        referenceType: 'EXPENSE',
        referenceId: expenseId,
        createdAt: nowIso,
      });

      data.ledgerEntries.push({
        id: `ledg_exp_pay_${Date.now()}`,
        date: nowIso,
        description: `Payment for Expense: ${description}`,
        account: payAcct,
        debit: 0,
        credit: amt,
        referenceType: 'EXPENSE',
        referenceId: expenseId,
        createdAt: nowIso,
      });

      db.persist();
      res.json({ success: true, expense });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 11. ACCOUNTING & REPORTS
  // ==========================================
  app.get('/api/accounting/dashboard', requireAuth, (req, res) => {
    try {
      const stats = getDashboardStats();
      res.json({ stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/ledger', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      const { account } = req.query;
      let list = data.ledgerEntries;
      if (account && account !== 'ALL') {
        list = list.filter((l) => l.account === account);
      }
      res.json({ ledgerEntries: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/profit-loss', requireAuth, (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const report = getProfitAndLoss(startDate as string, endDate as string);
      res.json({ report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/accounting/inventory-valuation', requireAuth, (req, res) => {
    try {
      const valuation = getInventoryValuation();
      res.json({ valuation });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 12. GLOBAL SEARCH
  // ==========================================
  app.get('/api/search', requireAuth, (req, res) => {
    try {
      const q = (req.query.q as string || '').trim().toLowerCase();
      if (!q) {
        res.json({ results: { products: [], invoices: [], quotations: [], customers: [], suppliers: [] } });
        return;
      }

      const data = db.getRawData();
      const products = data.products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q))
      ).slice(0, 5);

      const invoices = data.invoices.filter(
        (i) =>
          i.invoiceNo.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q)
      ).slice(0, 5);

      const quotations = data.quotations.filter(
        (qt) =>
          qt.quotationNo.toLowerCase().includes(q) ||
          qt.customerName.toLowerCase().includes(q)
      ).slice(0, 5);

      const customers = data.customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      ).slice(0, 5);

      const suppliers = data.suppliers.filter(
        (s) =>
          s.companyName.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
      ).slice(0, 5);

      res.json({
        results: { products, invoices, quotations, customers, suppliers },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 13. BUSINESS SETTINGS
  // ==========================================
  app.get('/api/settings', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      res.json({ settings: data.businessSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/settings', requireAuth, (req, res) => {
    try {
      const data = db.getRawData();
      data.businessSettings = {
        ...data.businessSettings,
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      db.persist();
      res.json({ success: true, settings: data.businessSettings });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // Vite Integration & Production Static Fallback
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// Local development keeps the original Vite/Express server experience.
// On Vercel, the API is exported through api/index.ts as a serverless function.
if (!process.env.VERCEL) {
  createApp().then((app) => {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Peace Tech Solution POS server listening on http://0.0.0.0:${PORT}`);
    });
  }).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
