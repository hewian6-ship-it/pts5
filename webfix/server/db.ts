import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  BusinessSetting,
  Product,
  Category,
  InventoryMovement,
  Customer,
  Supplier,
  Invoice,
  Quotation,
  Deposit,
  Purchase,
  Expense,
  LedgerEntry,
  DailyClosing,
} from '../src/types';

export interface DatabaseSchema {
  users: User[];
  businessSettings: BusinessSetting;
  categories: { id: string; name: string }[];
  products: Product[];
  movements: InventoryMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  quotations: Quotation[];
  deposits: Deposit[];
  purchases: Purchase[];
  expenses: Expense[];
  ledgerEntries: LedgerEntry[];
  dailyClosings: DailyClosing[];
  counters: {
    invoiceYear: number;
    invoiceSeq: number;
    quotationYear: number;
    quotationSeq: number;
    purchaseYear: number;
    purchaseSeq: number;
    depositYear: number;
    depositSeq: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'pos_database.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;
  private isWriting = false;

  private constructor() {
    this.data = this.loadOrCreate();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private loadOrCreate(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        // Verify admin exists
        if (!parsed.users || parsed.users.length === 0) {
          parsed.users = this.getDefaultUsers();
        }
        return parsed;
      } catch (err) {
        console.error('Error reading database file, initializing default:', err);
      }
    }

    const defaultData = this.getInitialSeed();
    this.persist(defaultData);
    return defaultData;
  }

  private getDefaultUsers(): User[] {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('peacetech001101@', salt);

    return [
      {
        id: 'usr_admin_007',
        userId: '007',
        name: 'Administrator',
        role: 'ADMIN',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  private getInitialSeed(): DatabaseSchema {
    const currentYear = 2026;

    return {
      users: this.getDefaultUsers(),
      businessSettings: {
        id: 'setting_main',
        businessName: 'Peace Tech Solution',
        regNumber: '202601019876 (1489001-V)',
        phone: '+60 3-2148 8888 / +60 12-882 1101',
        email: 'sales@peacetech.com.my',
        address: 'Lot 3.18, Level 3, Plaza Low Yat, Jalan Bukit Bintang, 55100 Kuala Lumpur, Malaysia',
        currency: 'MYR',
        timezone: 'Asia/Kuala_Lumpur',
        dateFormat: 'DD/MM/YYYY',
        invoicePrefix: 'INV',
        quotationPrefix: 'QT',
        purchasePrefix: 'PO',
        invoiceFooter: 'Thank you for choosing Peace Tech Solution! Hardware warranty subject to manufacturer terms.',
        warrantyTerms: '1. Original invoice required for all warranty claims.\n2. Physical damage, liquid damage, lightning, and unauthorized modification void warranty.\n3. Turnaround time for manufacturer RMA is 7-21 working days.',
        paymentInfo: 'Payment accepted via Cash, DuitNow QR, Debit/Credit Card, and Instant Online Transfer.',
        qrBankName: 'Maybank Berhad',
        qrAccountNo: '5142 8900 1234',
        qrAccountHolder: 'PEACE TECH SOLUTION',
        duitNowQrUrl: '',
        updatedAt: new Date().toISOString(),
      },
      categories: [
        { id: 'cat_1', name: 'Laptop' },
        { id: 'cat_2', name: 'Desktop' },
        { id: 'cat_3', name: 'CPU' },
        { id: 'cat_4', name: 'GPU' },
        { id: 'cat_5', name: 'RAM' },
        { id: 'cat_6', name: 'SSD' },
        { id: 'cat_7', name: 'HDD' },
        { id: 'cat_8', name: 'Motherboard' },
        { id: 'cat_9', name: 'PSU' },
        { id: 'cat_10', name: 'PC Case' },
        { id: 'cat_11', name: 'Monitor' },
        { id: 'cat_12', name: 'Keyboard' },
        { id: 'cat_13', name: 'Mouse' },
        { id: 'cat_14', name: 'Cable' },
        { id: 'cat_15', name: 'Adapter' },
        { id: 'cat_16', name: 'Printer' },
        { id: 'cat_17', name: 'CCTV' },
        { id: 'cat_18', name: 'Networking' },
        { id: 'cat_19', name: 'Software' },
        { id: 'cat_20', name: 'Accessories' },
        { id: 'cat_21', name: 'Services' },
        { id: 'cat_22', name: 'Other' },
      ],
      products: [
        {
          id: 'prod_1',
          sku: 'SSD-KNG-NV3-1TB',
          barcode: '740617342988',
          name: 'Kingston NV3 1TB PCIe 4.0 NVMe M.2 SSD',
          brand: 'Kingston',
          category: 'SSD',
          description: 'PCIe 4.0 x4 NVMe SSD with up to 6,000MB/s Read and 4,000MB/s Write.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 210.0,
          sellingPrice: 269.0,
          stockQuantity: 28,
          minStock: 5,
          unit: 'Unit',
          warranty: '3 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_2',
          sku: 'RAM-KNG-FB-16GB',
          barcode: '740617325608',
          name: 'Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz RAM',
          brand: 'Kingston',
          category: 'RAM',
          description: 'High performance DDR4 desktop gaming memory kit with low-profile heat spreader.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 120.0,
          sellingPrice: 165.0,
          stockQuantity: 20,
          minStock: 5,
          unit: 'Kit',
          warranty: 'Limited Lifetime',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_3',
          sku: 'KBM-LOG-MK295',
          barcode: '097855160355',
          name: 'Logitech MK295 Silent Wireless Keyboard & Mouse Combo',
          brand: 'Logitech',
          category: 'Keyboard',
          description: 'SilentTouch technology reduces 90% click & typing noise. 2.4GHz wireless.',
          supplierId: 'sup_2',
          supplierName: 'Ingram Micro Distribution',
          costPrice: 95.0,
          sellingPrice: 139.0,
          stockQuantity: 15,
          minStock: 3,
          unit: 'Set',
          warranty: '1 Year',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_4',
          sku: 'MOU-LOG-G502',
          barcode: '097855140685',
          name: 'Logitech G502 HERO High Performance Gaming Mouse',
          brand: 'Logitech',
          category: 'Mouse',
          description: 'HERO 25K Sensor, 11 programmable buttons, adjustable weights, LIGHTSYNC RGB.',
          supplierId: 'sup_2',
          supplierName: 'Ingram Micro Distribution',
          costPrice: 145.0,
          sellingPrice: 199.0,
          stockQuantity: 12,
          minStock: 3,
          unit: 'Unit',
          warranty: '2 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_5',
          sku: 'NET-TPL-AX73',
          barcode: '6935364010386',
          name: 'TP-Link Archer AX73 AX5400 Dual-Band Gigabit Wi-Fi 6 Router',
          brand: 'TP-Link',
          category: 'Networking',
          description: 'Ultra-fast Wi-Fi 6 speeds up to 5400Mbps with 6 high-gain antennas and OneMesh.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 330.0,
          sellingPrice: 429.0,
          stockQuantity: 8,
          minStock: 2,
          unit: 'Unit',
          warranty: '3 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_6',
          sku: 'MON-ASU-24VG',
          barcode: '4711387224198',
          name: 'ASUS TUF Gaming VG249Q3A 24-inch 180Hz Fast IPS Gaming Monitor',
          brand: 'ASUS',
          category: 'Monitor',
          description: 'FHD 1920x1080, 180Hz, 1ms (GTG), FreeSync Premium, sRGB 99%.',
          supplierId: 'sup_2',
          supplierName: 'Ingram Micro Distribution',
          costPrice: 410.0,
          sellingPrice: 529.0,
          stockQuantity: 6,
          minStock: 3,
          unit: 'Unit',
          warranty: '3 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_7',
          sku: 'CAB-BAS-HDMI2M',
          barcode: '6953156221192',
          name: 'Baseus High Density Braided 4K 60Hz HDMI 2.0 Cable 2M',
          brand: 'Baseus',
          category: 'Cable',
          description: 'Gold-plated connectors with nylon braided jacket, 18Gbps bandwidth.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 12.0,
          sellingPrice: 25.0,
          stockQuantity: 45,
          minStock: 10,
          unit: 'Pcs',
          warranty: '6 Months',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_8',
          sku: 'CAB-UGR-USBC100W',
          barcode: '6957303891482',
          name: 'UGREEN 100W PD USB-C to USB-C Fast Charging Cable 1.5M',
          brand: 'UGREEN',
          category: 'Cable',
          description: 'E-Marker chip, 5A 100W Power Delivery fast charging with durable nylon braid.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 14.0,
          sellingPrice: 29.0,
          stockQuantity: 38,
          minStock: 8,
          unit: 'Pcs',
          warranty: '1 Year',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_9',
          sku: 'CCT-HIK-4CH-2TB',
          barcode: '6941264089912',
          name: 'Hikvision 4-Channel 1080P Smart CCTV Kit (2TB Surveillance HDD Included)',
          brand: 'Hikvision',
          category: 'CCTV',
          description: 'Includes 4x 2MP Night Vision Outdoor/Indoor Bullet Cameras, 4CH DVR & 2TB Seagate SkyHawk.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 680.0,
          sellingPrice: 950.0,
          stockQuantity: 4,
          minStock: 2,
          unit: 'Set',
          warranty: '2 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_10',
          sku: 'CPU-AMD-R5-7600',
          barcode: '730143314541',
          name: 'AMD Ryzen 5 7600 6-Core 12-Thread AM5 Processor',
          brand: 'AMD',
          category: 'CPU',
          description: 'Socket AM5, 5.1GHz Max Boost, 38MB Cache, with AMD Wraith Stealth Cooler.',
          supplierId: 'sup_1',
          supplierName: 'Synnex Metrodata Technology',
          costPrice: 690.0,
          sellingPrice: 849.0,
          stockQuantity: 5,
          minStock: 2,
          unit: 'Unit',
          warranty: '3 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_11',
          sku: 'PSU-MSI-650BN',
          barcode: '4719072844111',
          name: 'MSI MAG A650BN 650W 80 PLUS Bronze Power Supply',
          brand: 'MSI',
          category: 'PSU',
          description: '80 Plus Bronze certified, 120mm low noise fan, DC-to-DC circuit design.',
          supplierId: 'sup_2',
          supplierName: 'Ingram Micro Distribution',
          costPrice: 170.0,
          sellingPrice: 239.0,
          stockQuantity: 7,
          minStock: 3,
          unit: 'Unit',
          warranty: '5 Years',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prod_12',
          sku: 'SRV-PC-CLEAN-REP',
          barcode: '9990001001',
          name: 'Professional PC Dust Cleaning, Thermal Paste Re-application & Diagnostics',
          brand: 'Peace Tech',
          category: 'Services',
          description: 'Full dust clean out, Arctic MX-4 thermal paste re-paste, fan lubrication, and thermal stress test.',
          supplierId: undefined,
          costPrice: 15.0,
          sellingPrice: 80.0,
          stockQuantity: 999,
          minStock: 0,
          unit: 'Job',
          warranty: '30 Days',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      movements: [
        {
          id: 'mov_init_1',
          productId: 'prod_1',
          productName: 'Kingston NV3 1TB PCIe 4.0 NVMe M.2 SSD',
          sku: 'SSD-KNG-NV3-1TB',
          type: 'MANUAL_STOCK_IN',
          quantity: 28,
          beforeStock: 0,
          afterStock: 28,
          reason: 'Initial Opening Inventory Stock In',
          reference: 'INIT-2026',
          user: '007',
          createdAt: new Date().toISOString(),
        },
      ],
      customers: [
        {
          id: 'cust_walkin',
          name: 'Walk-in Customer',
          phone: '-',
          email: '',
          address: 'Counter Retail',
          notes: 'Standard Walk-in Retail Client',
          balance: 0,
          outstandingBalance: 0,
          totalSpent: 0,
          totalInvoices: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'cust_techflow',
          name: 'TechFlow Studio Sdn Bhd',
          phone: '+60 16-889 1234',
          email: 'admin@techflow.my',
          address: 'Unit 8-2, Tower A, Vertical Business Suites, Bangsar South, 59200 Kuala Lumpur',
          notes: 'Corporate IT & Design Agency. Net 14 Terms.',
          balance: 0,
          outstandingBalance: 0,
          totalSpent: 0,
          totalInvoices: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      suppliers: [
        {
          id: 'sup_1',
          companyName: 'Synnex Metrodata Technology Sdn Bhd',
          contactPerson: 'Kevin Tan (Key Account Manager)',
          phone: '+60 3-7848 1000',
          email: 'orders.my@synnex-metrodata.com',
          address: 'No. 3, Jalan Pelukis U1/46, Temasya Industrial Park, 40150 Shah Alam, Selangor',
          notes: 'Authorized distributor for Kingston, AMD, TP-Link, Hikvision, Baseus.',
          paymentTerms: '30 Days',
          totalPurchases: 0,
          outstandingBalance: 0,
          outstandingPayable: 0,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sup_2',
          companyName: 'Ingram Micro Distribution Malaysia Sdn Bhd',
          contactPerson: 'Melissa Wong',
          phone: '+60 3-7952 8188',
          email: 'sales.my@ingrammicro.com',
          address: 'Lot 11, Jalan 219, Section 51A, 46100 Petaling Jaya, Selangor',
          notes: 'Authorized distributor for Logitech, ASUS, MSI, Intel, Corsair.',
          paymentTerms: '30 Days',
          totalPurchases: 0,
          outstandingBalance: 0,
          outstandingPayable: 0,
          createdAt: new Date().toISOString(),
        },
      ],
      invoices: [],
      quotations: [],
      deposits: [],
      purchases: [],
      expenses: [],
      ledgerEntries: [],
      dailyClosings: [],
      counters: {
        invoiceYear: currentYear,
        invoiceSeq: 0,
        quotationYear: currentYear,
        quotationSeq: 0,
        purchaseYear: currentYear,
        purchaseSeq: 0,
        depositYear: currentYear,
        depositSeq: 0,
      },
    };
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public persist(customData?: DatabaseSchema): void {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      const payload = customData || this.data;
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    } finally {
      this.isWriting = false;
    }
  }

  // Next sequence number generator
  public getNextInvoiceNumber(prefix = 'INV'): string {
    const currentYear = new Date().getFullYear();
    if (this.data.counters.invoiceYear !== currentYear) {
      this.data.counters.invoiceYear = currentYear;
      this.data.counters.invoiceSeq = 0;
    }
    this.data.counters.invoiceSeq += 1;
    const numStr = this.data.counters.invoiceSeq.toString().padStart(6, '0');
    this.persist();
    return `${prefix}-${currentYear}-${numStr}`;
  }

  public getNextQuotationNumber(prefix = 'QT'): string {
    const currentYear = new Date().getFullYear();
    if (this.data.counters.quotationYear !== currentYear) {
      this.data.counters.quotationYear = currentYear;
      this.data.counters.quotationSeq = 0;
    }
    this.data.counters.quotationSeq += 1;
    const numStr = this.data.counters.quotationSeq.toString().padStart(6, '0');
    this.persist();
    return `${prefix}-${currentYear}-${numStr}`;
  }

  public getNextPurchaseNumber(prefix = 'PO'): string {
    const currentYear = new Date().getFullYear();
    if (this.data.counters.purchaseYear !== currentYear) {
      this.data.counters.purchaseYear = currentYear;
      this.data.counters.purchaseSeq = 0;
    }
    this.data.counters.purchaseSeq += 1;
    const numStr = this.data.counters.purchaseSeq.toString().padStart(6, '0');
    this.persist();
    return `${prefix}-${currentYear}-${numStr}`;
  }

  public getNextDepositNumber(prefix = 'DEP'): string {
    const currentYear = new Date().getFullYear();
    if (this.data.counters.depositYear !== currentYear) {
      this.data.counters.depositYear = currentYear;
      this.data.counters.depositSeq = 0;
    }
    this.data.counters.depositSeq += 1;
    const numStr = this.data.counters.depositSeq.toString().padStart(6, '0');
    this.persist();
    return `${prefix}-${currentYear}-${numStr}`;
  }
}

export const db = Database.getInstance();
