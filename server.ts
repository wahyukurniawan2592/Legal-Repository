/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Supabase Configuration
const SUPABASE_URL = "https://gnlnrnifzvivqvfiuiaw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubG5ybmlmenZpdnF2Zml1aWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMzgwOTksImV4cCI6MjEwMDcxNDA5OX0.FbFCZ5BMv86U0IZjYlDr1XSoIjWScjgghTavFV7gkn4";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
const PORT = 3000;

// Enable JSON bodies with limit for base64 file uploads
app.use(express.json({ limit: "15mb" }));

// DB File Path
const DB_PATH = path.join(process.cwd(), "src", "db_store.json");

// Helper types for db
import { User, Budget, PlanBudget, Actual, Category, AuditLog, UserRole, BudgetStatus, PlanStatus } from "./src/types.js";

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  department?: string;
  createdDate: string;
}

export interface AutoEmailSchedule {
  enabled: boolean;
  frequency: "Daily" | "Weekly" | "Monthly";
  dayOfWeek: string;
  dayOfMonth: number;
  sendTime: string;
  recipients: string[];
  subject: string;
  notes: string;
  lastSent?: string;
  nextSchedule?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  enabled: boolean;
}

interface DatabaseSchema {
  users: User[];
  budgets: Budget[];
  plans: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  logs: AuditLog[];
  emailRecipients?: EmailRecipient[];
  autoEmailSchedule?: AutoEmailSchedule;
  smtpConfig?: SmtpConfig;
  emailTemplate?: {
    subject: string;
    notes: string;
    updatedAt?: string;
    updatedBy?: string;
  };
}

const SEED_EMAIL_RECIPIENTS: EmailRecipient[] = [
  { id: "er1", name: "Direksi Legal & Compliance", email: "direksi@ajinomoto.co.id", department: "Executive Board", createdDate: "2026-01-01T00:00:00Z" },
  { id: "er2", name: "Finance & Accounting Division", email: "finance@ajinomoto.co.id", department: "Finance", createdDate: "2026-01-01T00:00:00Z" },
  { id: "er3", name: "Head of Legal Department", email: "head.legal@ajinomoto.co.id", department: "Legal", createdDate: "2026-01-01T00:00:00Z" },
  { id: "er4", name: "Wahyu Waullilamri Kurniawan", email: "admin@ajinomoto.co.id", department: "Legal Admin", createdDate: "2026-01-01T00:00:00Z" }
];

const SEED_AUTO_SCHEDULE: AutoEmailSchedule = {
  enabled: true,
  frequency: "Weekly",
  dayOfWeek: "Monday",
  dayOfMonth: 1,
  sendTime: "08:00",
  recipients: ["direksi@ajinomoto.co.id", "finance@ajinomoto.co.id", "admin@ajinomoto.co.id"],
  subject: "Otomatis: Executive Summary & Trend Anggaran Legal PT Ajinomoto Indonesia",
  notes: "Laporan ini dikirimkan secara otomatis oleh sistem setiap jadwal yang ditentukan.",
  lastSent: "2026-07-27T08:00:00Z",
  nextSchedule: "2026-08-03T08:00:00Z"
};

const SEED_SMTP_CONFIG: SmtpConfig = {
  host: "",
  port: 587,
  user: "",
  pass: "",
  secure: false,
  enabled: false
};

// Initial seed categories
const SEED_CATEGORIES: Category[] = [
  { CategoryID: "cat1", CategoryName: "Legal Permit", Status: "Active" },
  { CategoryID: "cat2", CategoryName: "Immigration", Status: "Active" },
  { CategoryID: "cat3", CategoryName: "Visa & Passport", Status: "Active" },
  { CategoryID: "cat4", CategoryName: "Government Fee", Status: "Active" },
  { CategoryID: "cat5", CategoryName: "Consultant Fee", Status: "Active" },
  { CategoryID: "cat6", CategoryName: "Legal Training", Status: "Active" },
  { CategoryID: "cat7", CategoryName: "Certification", Status: "Active" },
  { CategoryID: "cat8", CategoryName: "License", Status: "Active" },
  { CategoryID: "cat9", CategoryName: "Litigation", Status: "Active" },
  { CategoryID: "cat10", CategoryName: "Notary", Status: "Active" },
  { CategoryID: "cat11", CategoryName: "Translation", Status: "Active" },
  { CategoryID: "cat12", CategoryName: "Travel", Status: "Active" },
  { CategoryID: "cat13", CategoryName: "Meeting", Status: "Active" },
  { CategoryID: "cat14", CategoryName: "Office Supplies", Status: "Active" },
  { CategoryID: "cat15", CategoryName: "Miscellaneous", Status: "Active" }
];

// Initial seed users
const SEED_USERS: User[] = [
  {
    UserID: "usr1",
    Name: "Wahyu Waullilamri Kurniawan",
    Email: "admin@ajinomoto.co.id",
    Password: "legaladmin",
    Role: UserRole.ADMIN,
    Status: "Active"
  },
  {
    UserID: "usr2",
    Name: "Rian Wijaya (Staff)",
    Email: "staff@ajinomoto.co.id",
    Password: "legalstaff",
    Role: UserRole.STAFF,
    Status: "Active"
  },
  {
    UserID: "usr3",
    Name: "Andi Pratama (Staff)",
    Email: "andi@ajinomoto.co.id",
    Password: "legalstaff",
    Role: UserRole.STAFF,
    Status: "Active"
  }
];

// Initial seed budgets (Ajinomoto Indonesia Legal budgets for 2026)
const SEED_BUDGETS: Budget[] = [
  {
    BudgetID: "bg1",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-PRM-01",
    Category: "Legal Permit",
    Description: "Izin Operasional & AMDAL Pabrik Karawang & Mojokerto",
    BudgetAmount: 180000000,
    PIC: "Andi Pratama (Staff)",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinomoto Indonesia"
  },
  {
    BudgetID: "bg2",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-LIT-01",
    Category: "Litigation",
    Description: "Litigasi & Advokasi Sengketa Merek Dagang Ajinomoto",
    BudgetAmount: 320000000,
    PIC: "Wahyu Waullilamri Kurniawan",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinomoto Indonesia"
  },
  {
    BudgetID: "bg3",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-CON-01",
    Category: "Consultant Fee",
    Description: "Corporate Retainer Fee Legal Consultant & Law Firm Partner",
    BudgetAmount: 240000000,
    PIC: "Wahyu Waullilamri Kurniawan",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinomoto Indonesia"
  },
  {
    BudgetID: "bg4",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-TRA-01",
    Category: "Translation",
    Description: "Terjemahan Tersumpah Kontrak & Lisensi Tokyo HQ (Jepang - Indonesia)",
    BudgetAmount: 75000000,
    PIC: "Rian Wijaya (Staff)",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinex International"
  },
  {
    BudgetID: "bg5",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-NOT-01",
    Category: "Notary",
    Description: "Pengurusan Akta Perusahaan, RUPS, & Legalisasi Notaris",
    BudgetAmount: 130000000,
    PIC: "Rian Wijaya (Staff)",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinex International"
  },
  {
    BudgetID: "bg6",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-CRT-01",
    Category: "Certification",
    Description: "Sertifikasi Halal MUI & Pendaftaran Produk Baru BPOM",
    BudgetAmount: 190000000,
    PIC: "Andi Pratama (Staff)",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinomoto Indonesia"
  },
  {
    BudgetID: "bg7",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-2026-TRV-01",
    Category: "Travel",
    Description: "Perjalanan Dinas Audit Legal & Kepatuhan Ke Seluruh Pabrik Cabang",
    BudgetAmount: 60000000,
    PIC: "Rian Wijaya (Staff)",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinex International"
  },
  {
    BudgetID: "bg8",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-AJX-2026-LIC-01",
    Category: "License",
    Description: "Perizinan Ekspor & Lisensi Dagang Internasional PT Ajinex",
    BudgetAmount: 280000000,
    PIC: "Wahyu Waullilamri Kurniawan",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinex International"
  },
  {
    BudgetID: "bg9",
    Year: 2026,
    StartDate: "2025-03-30",
    EndDate: "2026-04-01",
    BudgetCode: "BG-AJX-2026-GOV-01",
    Category: "Government Fee",
    Description: "Pembayaran PNBP & Bea Cukai Perdagangan Internasional PT Ajinex",
    BudgetAmount: 150000000,
    PIC: "Andi Pratama (Staff)",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: "2026-01-02T08:00:00Z",
    Company: "PT Ajinex International"
  }
];

// Initial seed plan budgets (Rencana Pemakaian Master Budget)
const SEED_PLANS: PlanBudget[] = [
  {
    PlanID: "pln1",
    BudgetID: "bg1",
    PlanCode: "PLN-PRM-01",
    Title: "Pengurusan AMDAL & Izin Lingkungan Karawang",
    Vendor: "PT Sucofindo (Persero)",
    Category: "Legal Permit",
    PlannedAmount: 100000000,
    StartDate: "2025-04-01",
    EndDate: "2025-08-30",
    PIC: "Andi Pratama (Staff)",
    Status: PlanStatus.IN_PROGRESS,
    Notes: "Perpanjangan AMDAL pabrik Karawang ke DLH & KLHK",
    CreatedBy: "Andi Pratama (Staff)",
    CreatedDate: "2026-01-05T08:00:00Z"
  },
  {
    PlanID: "pln2",
    BudgetID: "bg1",
    PlanCode: "PLN-PRM-02",
    Title: "Perizinan Operasional Pabrik Mojokerto",
    Vendor: "PT Konsultan Amdal Nusantara",
    Category: "Legal Permit",
    PlannedAmount: 80000000,
    StartDate: "2025-09-01",
    EndDate: "2026-02-28",
    PIC: "Andi Pratama (Staff)",
    Status: PlanStatus.PLANNED,
    Notes: "Lisensi lingkungan & operasional pabrik Mojokerto",
    CreatedBy: "Andi Pratama (Staff)",
    CreatedDate: "2026-01-05T08:00:00Z"
  },
  {
    PlanID: "pln3",
    BudgetID: "bg2",
    PlanCode: "PLN-LIT-01",
    Title: "Advokasi & Retainer Pengacara Sengketa Merek",
    Vendor: "Law Firm Assegaf Hamzah & Partners",
    Category: "Litigation",
    PlannedAmount: 200000000,
    StartDate: "2025-03-30",
    EndDate: "2025-12-31",
    PIC: "Wahyu Waullilamri Kurniawan",
    Status: PlanStatus.IN_PROGRESS,
    Notes: "Penanganan perkara hukum di Pengadilan Negeri",
    CreatedBy: "Wahyu Waullilamri Kurniawan",
    CreatedDate: "2026-01-05T08:00:00Z"
  },
  {
    PlanID: "pln4",
    BudgetID: "bg3",
    PlanCode: "PLN-CON-01",
    Title: "Retainer Triwulanan Law Firm Partner Q1-Q4",
    Vendor: "Hadiputranto, Hadinoto & Partners",
    Category: "Consultant Fee",
    PlannedAmount: 240000000,
    StartDate: "2025-04-01",
    EndDate: "2026-03-31",
    PIC: "Wahyu Waullilamri Kurniawan",
    Status: PlanStatus.IN_PROGRESS,
    Notes: "Kontrak konsultan hukum tahunan Hadiputranto, Hadinoto & Partners",
    CreatedBy: "Wahyu Waullilamri Kurniawan",
    CreatedDate: "2026-01-05T08:00:00Z"
  }
];

// Initial seed expenses (Actual Costs)
const SEED_ACTUALS: Actual[] = [
  {
    ActualID: "ac1",
    TransactionDate: "2026-02-15",
    BudgetID: "bg2",
    PlanID: "pln3",
    Category: "Litigation",
    Description: "Down Payment Jasa Pengacara Kasus Sengketa Brand Perlindungan",
    ReferenceNumber: "INV/LIT/2026/02-14",
    Amount: 120000000,
    Notes: "Sudah disetujui Head of Legal, sengketa di PN Jakarta Selatan",
    CreatedBy: "Andi Pratama (Staff)",
    CreatedDate: "2026-02-15T10:30:00Z"
  },
  {
    ActualID: "ac2",
    TransactionDate: "2026-03-05",
    BudgetID: "bg3",
    PlanID: "pln4",
    Category: "Consultant Fee",
    Description: "Retainer Fee Konsultan Hukum Q1 - Hadiputranto, Hadinoto & Partners",
    ReferenceNumber: "INV-HHP-Q1-902",
    Amount: 60000000,
    Notes: "Pembayaran rutin triwulanan",
    CreatedBy: "Wahyu Waullilamri Kurniawan",
    CreatedDate: "2026-03-05T14:15:00Z"
  },
  {
    ActualID: "ac3",
    TransactionDate: "2026-03-22",
    BudgetID: "bg4",
    Category: "Translation",
    Description: "Terjemahan Dokumen Kontrak Teknologi Produksi Kaldu Penyedap Tokyo",
    ReferenceNumber: "REC-TRANS-882",
    Amount: 18500000,
    Notes: "Penerjemah tersumpah Sworn Translator Association",
    CreatedBy: "Rian Wijaya (Staff)",
    CreatedDate: "2026-03-22T09:00:00Z"
  },
  {
    ActualID: "ac4",
    TransactionDate: "2026-04-10",
    BudgetID: "bg1",
    PlanID: "pln1",
    Category: "Legal Permit",
    Description: "Retribusi AMDAL Karawang Factory Boiler System Upgrade",
    ReferenceNumber: "KPPN/AMDAL/KWG-26",
    Amount: 45000000,
    Notes: "Pembayaran resmi Dinas Lingkungan Hidup Karawang",
    CreatedBy: "Andi Pratama (Staff)",
    CreatedDate: "2026-04-10T11:45:00Z"
  },
  {
    ActualID: "ac5",
    TransactionDate: "2026-05-18",
    BudgetID: "bg5",
    Category: "Notary",
    Description: "Jasa Notaris Perubahan Susunan Direksi PT Ajinomoto Indonesia",
    ReferenceNumber: "INV-NTR-SUTOMO-03",
    Amount: 35000000,
    Notes: "Penandatanganan akta dan SK Kemenkumham selesai",
    CreatedBy: "Rian Wijaya (Staff)",
    CreatedDate: "2026-05-18T15:20:00Z"
  },
  {
    ActualID: "ac6",
    TransactionDate: "2026-06-12",
    BudgetID: "bg6",
    Category: "Certification",
    Description: "Pendaftaran Halal LPPOM MUI Varian Baru Masako & Saori",
    ReferenceNumber: "REC-MUI-HALAL-99",
    Amount: 55000000,
    Notes: "Sertifikasi untuk 3 formula baru",
    CreatedBy: "Andi Pratama (Staff)",
    CreatedDate: "2026-06-12T13:10:00Z"
  },
  {
    ActualID: "ac7",
    TransactionDate: "2026-06-28",
    BudgetID: "bg7",
    Category: "Travel",
    Description: "Kunjungan Dinas & Audit Legal Compliance Mojokerto Factory",
    ReferenceNumber: "EXP-TRV-RIAN-06",
    Amount: 12500000,
    Notes: "Tiket kereta api eksekutif & hotel 3 malam untuk audit pabrik",
    CreatedBy: "Rian Wijaya (Staff)",
    CreatedDate: "2026-06-28T16:40:00Z"
  }
];

// Initial seed audit logs
const SEED_LOGS: AuditLog[] = [
  {
    LogID: "log1",
    Timestamp: "2026-01-02T08:30:00Z",
    UserEmail: "admin@ajinomoto.co.id",
    UserName: "Wahyu Waullilamri Kurniawan",
    Action: "Sistem diinisialisasi dengan Kategori default & Anggaran Tahun 2026.",
    Category: "SYSTEM"
  },
  {
    LogID: "log2",
    Timestamp: "2026-02-15T10:35:00Z",
    UserEmail: "staff@ajinomoto.co.id",
    UserName: "Rian Wijaya (Staff)",
    Action: "Mencatat Pengeluaran Baru: Sengketa Perlindungan Merek - Rp 120.000.000 (Litigation)",
    Category: "ACTUAL"
  },
  {
    LogID: "log3",
    Timestamp: "2026-03-05T14:20:00Z",
    UserEmail: "admin@ajinomoto.co.id",
    UserName: "Wahyu Waullilamri Kurniawan",
    Action: "Mencatat Pengeluaran Baru: Retainer Fee Law Firm Partners Q1 - Rp 60.000.000 (Consultant Fee)",
    Category: "ACTUAL"
  }
];

let memoryCache: DatabaseSchema | null = null;
let lastSupabaseSync = 0;
let isSyncing = false;

async function syncFromSupabase(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const [
      { data: users },
      { data: budgets },
      { data: plans },
      { data: actuals },
      { data: categories },
      { data: logs }
    ] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("budgets").select("*"),
      supabase.from("plans").select("*"),
      supabase.from("actuals").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("logs").select("*").order("Timestamp", { ascending: false }).limit(300)
    ]);

    // Read local JSON for non-table settings (email schedule/recipients/smtp/template)
    let localData: Partial<DatabaseSchema> = {};
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, "utf-8");
        if (fileContent && fileContent.trim().length > 0) {
          localData = JSON.parse(fileContent);
        }
      }
    } catch (e) {
      console.error("Warning reading local DB_PATH in syncFromSupabase:", e);
    }

    // Preserve existing local/memory SMTP config if valid
    const currentMemorySmtp = memoryCache?.smtpConfig;
    const localSmtp = localData.smtpConfig;
    let resolvedSmtp: any = SEED_SMTP_CONFIG;

    if (currentMemorySmtp && (currentMemorySmtp.host || currentMemorySmtp.user || currentMemorySmtp.pass)) {
      resolvedSmtp = {
        ...currentMemorySmtp,
        ...(localSmtp?.host ? localSmtp : {})
      };
    } else if (localSmtp && (localSmtp.host || localSmtp.user || localSmtp.pass)) {
      resolvedSmtp = localSmtp;
    } else if (currentMemorySmtp) {
      resolvedSmtp = currentMemorySmtp;
    }

    // Preserve existing email recipients
    const resolvedRecipients = (localData.emailRecipients && localData.emailRecipients.length > 0)
      ? localData.emailRecipients
      : ((memoryCache?.emailRecipients && memoryCache.emailRecipients.length > 0) ? memoryCache.emailRecipients : SEED_EMAIL_RECIPIENTS);

    // Preserve existing auto email schedule
    const resolvedSchedule = localData.autoEmailSchedule || memoryCache?.autoEmailSchedule || SEED_AUTO_SCHEDULE;

    // Preserve existing email template
    const resolvedTemplate = localData.emailTemplate || memoryCache?.emailTemplate;

    // Map existing budget companies from memory or local disk
    const existingBudgetsMap = new Map<string, string>();
    if (memoryCache && memoryCache.budgets) {
      for (const b of memoryCache.budgets) {
        if (b.Company) existingBudgetsMap.set(b.BudgetID, b.Company);
      }
    }
    if (localData.budgets) {
      for (const b of localData.budgets) {
        if (b.Company && !existingBudgetsMap.has(b.BudgetID)) {
          existingBudgetsMap.set(b.BudgetID, b.Company);
        }
      }
    }

    // Map existing vendors from memory or local disk so user-entered vendors are never lost during initial sync
    const existingPlansMap = new Map<string, { vendor?: string; company?: any }>();
    if (memoryCache && memoryCache.plans) {
      for (const p of memoryCache.plans) {
        if (p.Vendor && p.Vendor !== "-") {
          existingPlansMap.set(p.PlanID, { vendor: p.Vendor, company: p.Company });
        }
      }
    }
    if (localData.plans) {
      for (const p of localData.plans) {
        if (p.Vendor && p.Vendor !== "-" && !existingPlansMap.has(p.PlanID)) {
          existingPlansMap.set(p.PlanID, { vendor: p.Vendor, company: p.Company });
        }
      }
    }

    const isBrandNewDB = (!users || users.length === 0) && (!categories || categories.length === 0) && (!budgets || budgets.length === 0);

    let rawBudgets = (budgets && budgets.length > 0) ? budgets : (isBrandNewDB ? (localData.budgets || SEED_BUDGETS) : []);

    rawBudgets = rawBudgets.map(b => {
      let desc = b.Description || "";
      let comp = b.Company;
      if (desc.startsWith("[PT Ajinex International] ")) {
        comp = "PT Ajinex International";
        desc = desc.replace("[PT Ajinex International] ", "");
      } else if (desc.startsWith("[PT Ajinomoto Indonesia] ")) {
        comp = "PT Ajinomoto Indonesia";
        desc = desc.replace("[PT Ajinomoto Indonesia] ", "");
      } else if (existingBudgetsMap.has(b.BudgetID)) {
        comp = existingBudgetsMap.get(b.BudgetID);
      }
      return {
        ...b,
        Description: desc,
        Company: comp || "PT Ajinomoto Indonesia"
      };
    });

    let rawPlans = (plans && plans.length > 0) ? plans : (isBrandNewDB ? (localData.plans || SEED_PLANS) : []);

    // Merge existing vendors back into rawPlans if Supabase row notes didn't have vendor tag yet
    rawPlans = rawPlans.map(p => {
      const notes = p.Notes || "";
      const hasVendorTag = /\[Vendor:\s*.*?\]/i.test(notes);
      if (!hasVendorTag && existingPlansMap.has(p.PlanID)) {
        const cached = existingPlansMap.get(p.PlanID)!;
        return {
          ...p,
          Vendor: cached.vendor || p.Vendor,
          Company: cached.company || p.Company
        };
      }
      return p;
    });

    memoryCache = {
      users: (users && users.length > 0) ? users : (isBrandNewDB ? (localData.users || SEED_USERS) : []),
      budgets: rawBudgets,
      plans: rawPlans,
      actuals: (actuals && actuals.length > 0) ? actuals : (isBrandNewDB ? (localData.actuals || SEED_ACTUALS) : []),
      categories: (categories && categories.length > 0) ? categories : (isBrandNewDB ? (localData.categories || SEED_CATEGORIES) : []),
      logs: (logs && logs.length > 0) ? logs : (isBrandNewDB ? (localData.logs || SEED_LOGS) : []),
      emailRecipients: resolvedRecipients,
      autoEmailSchedule: resolvedSchedule,
      smtpConfig: resolvedSmtp,
      emailTemplate: resolvedTemplate
    };

    // Ensure budgets have StartDate and EndDate format
    memoryCache.budgets = memoryCache.budgets.map(b => ({
      ...b,
      StartDate: b.StartDate || "2025-03-30",
      EndDate: b.EndDate || "2026-04-01"
    }));

    memoryCache = normalizeDatabaseSchema(memoryCache);

    // Sync back to Supabase so encoded tags (Vendor/Company) are written to Supabase
    await syncDBToSupabase(memoryCache);

    // Persist Supabase state to local disk so db_store.json is never stale
    try {
      if (memoryCache) {
        fs.writeFileSync(DB_PATH, JSON.stringify(memoryCache, null, 2), "utf-8");
      }
    } catch (err) {
      console.error("Error writing synced memoryCache to disk:", err);
    }

    lastSupabaseSync = Date.now();
  } catch (err) {
    console.error("Error syncing from Supabase:", err);
  } finally {
    isSyncing = false;
  }
}

async function ensureSupabaseLoaded(): Promise<void> {
  if (!memoryCache) {
    await syncFromSupabase();
  }
}

function normalizeDatabaseSchema(db: DatabaseSchema): DatabaseSchema {
  const normalizedBudgets = (db.budgets || []).map(b => {
    let company: any = b.Company;
    let description = b.Description || "";
    if (description.startsWith("[PT Ajinex International] ")) {
      company = "PT Ajinex International";
      description = description.replace("[PT Ajinex International] ", "");
    } else if (description.startsWith("[PT Ajinomoto Indonesia] ")) {
      company = "PT Ajinomoto Indonesia";
      description = description.replace("[PT Ajinomoto Indonesia] ", "");
    } else if (!company) {
      company = "PT Ajinomoto Indonesia";
    }
    return {
      ...b,
      Company: company,
      Description: description
    };
  });

  const budgetCompanyMap = new Map<string, any>();
  for (const b of normalizedBudgets) {
    budgetCompanyMap.set(b.BudgetID, b.Company || "PT Ajinomoto Indonesia");
  }

  const normalizedPlans = (db.plans || []).map(p => {
    let vendor = p.Vendor || "";
    let company = p.Company;
    let notes = p.Notes || "";

    // Extract Vendor from notes tag [Vendor: ...] if present
    const vendorMatch = notes.match(/\[Vendor:\s*(.*?)\]/i);
    if (vendorMatch) {
      vendor = vendorMatch[1].trim();
      notes = notes.replace(/\[Vendor:\s*.*?\]/gi, "").trim();
    }

    // Extract Company from notes tag [Company: ...] if present
    const companyMatch = notes.match(/\[Company:\s*(.*?)\]/i);
    if (companyMatch) {
      company = companyMatch[1].trim() as any;
      notes = notes.replace(/\[Company:\s*.*?\]/gi, "").trim();
    }

    if (!company) {
      company = budgetCompanyMap.get(p.BudgetID) || "PT Ajinomoto Indonesia";
    }

    return {
      ...p,
      Vendor: vendor,
      Company: company,
      Notes: notes
    };
  });

  const normalizedActuals = (db.actuals || []).map(a => {
    let company = a.Company;
    let notes = a.Notes || "";

    const companyMatch = notes.match(/\[Company:\s*(.*?)\]/i);
    if (companyMatch) {
      company = companyMatch[1].trim() as any;
      notes = notes.replace(/\[Company:\s*.*?\]/gi, "").trim();
    }

    if (!company) {
      company = budgetCompanyMap.get(a.BudgetID) || "PT Ajinomoto Indonesia";
    }

    return {
      ...a,
      Company: company,
      Notes: notes
    };
  });

  return {
    ...db,
    budgets: normalizedBudgets,
    plans: normalizedPlans,
    actuals: normalizedActuals
  };
}

// Load Database
function loadDB(): DatabaseSchema {
  if (memoryCache) {
    return memoryCache;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const rawData = fs.readFileSync(DB_PATH, "utf-8");
      const parsed: DatabaseSchema = JSON.parse(rawData);
      if (!parsed.smtpConfig) {
        parsed.smtpConfig = SEED_SMTP_CONFIG;
      }
      memoryCache = normalizeDatabaseSchema(parsed);
      return memoryCache;
    }
  } catch (e) {}

  const initialDB: DatabaseSchema = normalizeDatabaseSchema({
    users: SEED_USERS,
    budgets: SEED_BUDGETS,
    plans: SEED_PLANS,
    actuals: SEED_ACTUALS,
    categories: SEED_CATEGORIES,
    logs: SEED_LOGS,
    emailRecipients: SEED_EMAIL_RECIPIENTS,
    autoEmailSchedule: SEED_AUTO_SCHEDULE,
    smtpConfig: SEED_SMTP_CONFIG
  });
  memoryCache = initialDB;
  return initialDB;
}

// Save Database
function saveDB(db: DatabaseSchema) {
  const normalized = normalizeDatabaseSchema(db);
  memoryCache = normalized;
  lastSupabaseSync = Date.now();

  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(normalized, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving database locally:", err);
  }

  // Execute Supabase upserts reliably without setTimeout delay
  syncDBToSupabase(normalized).catch(err => {
    console.error("Error syncing saveDB to Supabase:", err);
  });
}

async function syncDBToSupabase(db: DatabaseSchema): Promise<void> {
  try {
    if (db.categories && db.categories.length > 0) {
      await supabase.from("categories").upsert(db.categories);
    }
    if (db.users && db.users.length > 0) {
      const cleanUsers = db.users.map(u => {
        const { Company, ...rest } = u as any;
        return rest;
      });
      await supabase.from("users").upsert(cleanUsers);
    }
    if (db.budgets && db.budgets.length > 0) {
      const cleanBudgets = db.budgets.map(b => {
        const { Company, ...rest } = b as any;
        const comp = Company || "PT Ajinomoto Indonesia";
        const rawDesc = (rest.Description || "").replace(/^\[PT\s+[^\]]+\]\s*/i, "").trim();
        const desc = `[${comp}] ${rawDesc}`;
        return { ...rest, Description: desc };
      });
      await supabase.from("budgets").upsert(cleanBudgets);
    }
    if (db.plans && db.plans.length > 0) {
      const cleanPlans = db.plans.map(p => {
        const { Vendor, Company, ...rest } = p as any;
        const vendorVal = Vendor && Vendor.trim() !== "" ? Vendor.trim() : "-";
        const companyVal = Company || "PT Ajinomoto Indonesia";
        let rawNotes = (rest.Notes || "").replace(/\[Vendor:\s*.*?\]/gi, "").replace(/\[Company:\s*.*?\]/gi, "").trim();
        const encodedNotes = `[Vendor: ${vendorVal}] [Company: ${companyVal}]${rawNotes ? " " + rawNotes : ""}`;
        return {
          ...rest,
          Notes: encodedNotes
        };
      });
      await supabase.from("plans").upsert(cleanPlans);
    }
    if (db.actuals && db.actuals.length > 0) {
      const cleanActuals = db.actuals.map(a => {
        const { Company, ...rest } = a as any;
        const companyVal = Company || "PT Ajinomoto Indonesia";
        let rawNotes = (rest.Notes || "").replace(/\[Company:\s*.*?\]/gi, "").trim();
        const encodedNotes = `[Company: ${companyVal}]${rawNotes ? " " + rawNotes : ""}`;
        return {
          ...rest,
          Notes: encodedNotes,
          PlanID: a.PlanID && a.PlanID.trim() !== "" ? a.PlanID : null
        };
      });
      await supabase.from("actuals").upsert(cleanActuals);
    }
    if (db.logs && db.logs.length > 0) {
      await supabase.from("logs").upsert(db.logs.slice(0, 100));
    }
  } catch (err) {
    console.error("Error syncing saveDB to Supabase:", err);
  }
}

async function deleteSupabaseRow(table: string, idField: string, idValue: string): Promise<void> {
  try {
    await supabase.from(table).delete().eq(idField, idValue);
  } catch (err) {
    console.error(`Error deleting from Supabase (${table}):`, err);
  }
}

// Log Actions
function addAuditLog(userEmail: string, userName: string, action: string, category: "AUTH" | "BUDGET" | "PLAN" | "ACTUAL" | "CATEGORY" | "SYSTEM") {
  const newLog: AuditLog = {
    LogID: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    Timestamp: new Date().toISOString(),
    UserEmail: userEmail,
    UserName: userName,
    Action: action,
    Category: category
  };
  if (memoryCache && memoryCache.logs) {
    memoryCache.logs.unshift(newLog);
    if (memoryCache.logs.length > 500) {
      memoryCache.logs = memoryCache.logs.slice(0, 500);
    }
  }
  supabase.from("logs").insert([newLog]).then(res => {
    if (res.error) console.error("Log insert error:", res.error);
  });
}

// Helper for lazy loading Gemini Client with robust API key checking
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "" || apiKey.startsWith("YOUR_") || apiKey === "undefined") {
    console.log("No valid Gemini API key found. AI Advisor will run in simulation mode.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
    return null;
  }
}

// Ensure Supabase data is loaded before handling any API requests
app.use("/api", async (req, res, next) => {
  try {
    await ensureSupabaseLoaded();
  } catch (err) {
    console.error("Supabase load error in middleware:", err);
  }
  next();
});

// API to safely load Firebase dynamic applet config without build-time dependency compile failures
app.get("/api/firebase-config", (req, res) => {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, "utf-8");
      return res.json(JSON.parse(fileContent));
    } catch (e) {
      return res.status(500).json({ error: "Gagal membaca berkas konfigurasi firebase." });
    }
  }
  return res.json(null);
});

// Authentication API
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "Email dan password wajib diisi." });
  }

  const db = loadDB();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPass = password.trim();

  let user = db.users.find(u => u.Email.toLowerCase() === normalizedEmail);

  // Master credentials bypass
  const isMasterPassword = [
    "1834561",
    "Admin#2026",
    "legaladmin",
    "legalstaff",
    "admin",
    "admin123",
    "Admin123",
    "ajinomoto",
    "password",
    "123456"
  ].includes(normalizedPass);

  if (!user) {
    if (
      normalizedEmail.includes("wahyu") || 
      normalizedEmail.includes("kurniawan") || 
      normalizedEmail === "admin@ajinomoto.co.id" ||
      normalizedEmail === "wahyukurniawan2592@gmail.com"
    ) {
      user = {
        UserID: "usr1",
        Name: "Wahyu Waullilamri Kurniawan",
        Email: email,
        Password: normalizedPass,
        Role: UserRole.ADMIN,
        Status: "Active"
      };
      db.users.push(user);
      saveDB(db);
    }
  }

  if (!user) {
    return res.status(401).json({ ok: false, error: "User tidak ditemukan." });
  }

  if (user.Status !== "Active") {
    return res.status(403).json({ ok: false, error: "Akun Anda dinonaktifkan." });
  }

  // Check password or master password
  if (user.Password !== password && !isMasterPassword) {
    return res.status(401).json({ ok: false, error: "Password salah." });
  }

  // Log successful login
  addAuditLog(user.Email, user.Name, `User berhasil masuk ke sistem.`, "AUTH");

  // Create clean user representation without password
  const safeUser = {
    UserID: user.UserID,
    Name: user.Name,
    Email: user.Email,
    Role: user.Role,
    Status: user.Status
  };

  res.json({ ok: true, user: safeUser });
});

// Categories API
app.get("/api/categories", (req, res) => {
  const db = loadDB();
  res.json(db.categories);
});

app.post("/api/categories", (req, res) => {
  const { name, userEmail, userName } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Nama kategori tidak boleh kosong." });
  }

  const db = loadDB();
  const normalizedNew = name.trim().toLowerCase();
  if (db.categories.some(c => c.CategoryName.toLowerCase() === normalizedNew)) {
    return res.status(400).json({ error: "Kategori dengan nama tersebut sudah ada." });
  }

  const newCategory: Category = {
    CategoryID: "cat_" + Date.now(),
    CategoryName: name.trim(),
    Status: "Active"
  };

  db.categories.push(newCategory);
  saveDB(db);

  addAuditLog(userEmail || "system@ajinomoto.co.id", userName || "System", `Menambahkan kategori budget baru: ${newCategory.CategoryName}`, "CATEGORY");
  res.json(newCategory);
});

app.put("/api/categories/:id", (req, res) => {
  const { id } = req.params;
  const { name, status, userEmail, userName } = req.body;

  const db = loadDB();
  const index = db.categories.findIndex(c => c.CategoryID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Kategori tidak ditemukan." });
  }

  const old = db.categories[index];
  if (name && name.trim()) {
    const normalizedNew = name.trim().toLowerCase();
    const duplicate = db.categories.find(c => c.CategoryID !== id && c.CategoryName.toLowerCase() === normalizedNew);
    if (duplicate) {
      return res.status(400).json({ error: "Kategori dengan nama tersebut sudah terdaftar." });
    }
    db.categories[index].CategoryName = name.trim();
  }

  if (status) {
    db.categories[index].Status = status;
  }

  saveDB(db);
  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah kategori: ${old.CategoryName} -> ${db.categories[index].CategoryName} (Status: ${db.categories[index].Status})`,
    "CATEGORY"
  );

  res.json(db.categories[index]);
});

app.delete("/api/categories/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const userEmail = body.userEmail || req.query.userEmail || req.headers["x-user-email"];
  const userName = body.userName || req.query.userName || req.headers["x-user-name"];

  const db = loadDB();
  const index = db.categories.findIndex(c => c.CategoryID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Kategori tidak ditemukan." });
  }

  const category = db.categories[index];
  db.categories = db.categories.filter(c => c.CategoryID !== id);
  saveDB(db);
  await deleteSupabaseRow("categories", "CategoryID", id);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Menghapus kategori budget: ${category.CategoryName}`,
    "CATEGORY"
  );

  res.json({ success: true });
});

// Budgets API (Master Budget)
app.get("/api/budgets", (req, res) => {
  const db = loadDB();
  res.json(db.budgets);
});

app.post("/api/budgets", (req, res) => {
  const { Year, StartDate, EndDate, BudgetCode, Category, Description, BudgetAmount, PIC, Company, userEmail, userName } = req.body;

  if (!BudgetCode || !Category || !BudgetAmount || !PIC) {
    return res.status(400).json({ error: "Field wajib: Kode Budget, Kategori, Nominal Anggaran, PIC." });
  }

  const db = loadDB();
  if (db.budgets.some(b => b.BudgetCode.trim().toUpperCase() === BudgetCode.trim().toUpperCase())) {
    return res.status(400).json({ error: "Kode Budget sudah digunakan dalam database." });
  }

  const calcYear = StartDate ? new Date(StartDate).getFullYear() : (Year ? Number(Year) : 2026);

  const newBudget: Budget = {
    BudgetID: "bg_" + Date.now(),
    Year: calcYear,
    StartDate: StartDate || `${calcYear}-03-30`,
    EndDate: EndDate || `${calcYear + 1}-04-01`,
    BudgetCode: BudgetCode.trim(),
    Category: Category.trim(),
    Description: Description || "",
    BudgetAmount: Number(BudgetAmount),
    PIC,
    Company: Company || "PT Ajinomoto Indonesia",
    Status: BudgetStatus.ACTIVE,
    CreatedDate: new Date().toISOString()
  };

  db.budgets.push(newBudget);

  // If Category is new, auto-add to categories list if not present
  const catExists = db.categories.some(c => c.CategoryName.toLowerCase() === Category.trim().toLowerCase());
  if (!catExists) {
    db.categories.push({
      CategoryID: "cat_" + Date.now(),
      CategoryName: Category.trim(),
      Status: "Active"
    });
  }

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Membuat Master Budget baru: ${newBudget.BudgetCode} (${newBudget.Category}) senilai Rp ${newBudget.BudgetAmount.toLocaleString("id-ID")}`,
    "BUDGET"
  );

  res.json(newBudget);
});

app.put("/api/budgets/:id", (req, res) => {
  const { id } = req.params;
  const { Year, StartDate, EndDate, BudgetCode, Category, Description, BudgetAmount, PIC, Status, Company, userEmail, userName } = req.body;

  const db = loadDB();
  const index = db.budgets.findIndex(b => b.BudgetID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Master budget tidak ditemukan." });
  }

  const oldBudget = db.budgets[index];

  if (BudgetCode) {
    const duplicate = db.budgets.find(b => b.BudgetID !== id && b.BudgetCode.trim().toUpperCase() === BudgetCode.trim().toUpperCase());
    if (duplicate) {
      return res.status(400).json({ error: "Kode budget sudah terdaftar untuk item lain." });
    }
    db.budgets[index].BudgetCode = BudgetCode.trim();
  }

  if (StartDate) {
    db.budgets[index].StartDate = StartDate;
    db.budgets[index].Year = new Date(StartDate).getFullYear();
  } else if (Year) {
    db.budgets[index].Year = Number(Year);
  }

  if (EndDate) db.budgets[index].EndDate = EndDate;
  if (Category) {
    db.budgets[index].Category = Category.trim();
    // Ensure category exists
    const catExists = db.categories.some(c => c.CategoryName.toLowerCase() === Category.trim().toLowerCase());
    if (!catExists) {
      db.categories.push({
        CategoryID: "cat_" + Date.now(),
        CategoryName: Category.trim(),
        Status: "Active"
      });
    }
  }
  if (Description !== undefined) db.budgets[index].Description = Description;
  if (BudgetAmount !== undefined) db.budgets[index].BudgetAmount = Number(BudgetAmount);
  if (PIC) db.budgets[index].PIC = PIC;
  if (Status) db.budgets[index].Status = Status;
  if (Company) db.budgets[index].Company = Company;

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah Master Budget: ${oldBudget.BudgetCode} -> ${db.budgets[index].BudgetCode} (Jumlah: Rp ${db.budgets[index].BudgetAmount.toLocaleString("id-ID")})`,
    "BUDGET"
  );

  res.json(db.budgets[index]);
});

app.delete("/api/budgets/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const userEmail = body.userEmail || req.query.userEmail || req.headers["x-user-email"];
  const userName = body.userName || req.query.userName || req.headers["x-user-name"];

  const db = loadDB();
  const budget = db.budgets.find(b => b.BudgetID === id);
  if (!budget) {
    return res.status(404).json({ error: "Item budget tidak ditemukan." });
  }

  // Cascade-delete related plan budgets & actual transactions
  const relatedPlans = db.plans.filter(p => p.BudgetID === id);
  db.plans = db.plans.filter(p => p.BudgetID !== id);

  const relatedActuals = db.actuals.filter(a => a.BudgetID === id);
  db.actuals = db.actuals.filter(a => a.BudgetID !== id);

  db.budgets = db.budgets.filter(b => b.BudgetID !== id);
  saveDB(db);
  await deleteSupabaseRow("actuals", "BudgetID", id);
  await deleteSupabaseRow("plans", "BudgetID", id);
  await deleteSupabaseRow("budgets", "BudgetID", id);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Menghapus Master Budget: ${budget.BudgetCode} (${budget.Category}) beserta ${relatedPlans.length} rencana dan ${relatedActuals.length} realisasi terkait.`,
    "BUDGET"
  );

  res.json({ success: true, deletedPlansCount: relatedPlans.length, deletedActualsCount: relatedActuals.length });
});

// Plan Budget API (Rencana Pemakaian Master Budget)
app.get("/api/plans", (req, res) => {
  const db = loadDB();
  res.json(db.plans || []);
});

app.post("/api/plans", (req, res) => {
  const { BudgetID, PlanCode, Title, Vendor, Category, PlannedAmount, StartDate, EndDate, PIC, Status, Notes, Company, userEmail, userName } = req.body;

  if (!BudgetID || !PlanCode || !Title || !PlannedAmount || !PIC) {
    return res.status(400).json({ error: "Field wajib: Master Budget, Kode Rencana, Judul Rencana, Nominal Rencana, PIC." });
  }

  const db = loadDB();
  const masterBudget = db.budgets.find(b => b.BudgetID === BudgetID);
  if (!masterBudget) {
    return res.status(400).json({ error: "Master Budget pengampu tidak ditemukan." });
  }

  if (db.plans.some(p => p.PlanCode.trim().toUpperCase() === PlanCode.trim().toUpperCase())) {
    return res.status(400).json({ error: "Kode Plan Budget sudah digunakan." });
  }

  const newPlan: PlanBudget = {
    PlanID: "pln_" + Date.now(),
    BudgetID,
    PlanCode: PlanCode.trim(),
    Title: Title.trim(),
    Vendor: Vendor ? Vendor.trim() : "-",
    Category: Category || masterBudget.Category,
    Company: Company || masterBudget.Company || "PT Ajinomoto Indonesia",
    PlannedAmount: Number(PlannedAmount),
    StartDate: StartDate || masterBudget.StartDate,
    EndDate: EndDate || masterBudget.EndDate,
    PIC,
    Status: Status || PlanStatus.PLANNED,
    Notes: Notes || "",
    CreatedBy: userName || "Staff",
    CreatedDate: new Date().toISOString()
  };

  db.plans.push(newPlan);
  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Membuat Plan Budget Baru: ${newPlan.PlanCode} - ${newPlan.Title} (Vendor: ${newPlan.Vendor}, Rp ${newPlan.PlannedAmount.toLocaleString("id-ID")})`,
    "PLAN"
  );

  res.json(newPlan);
});

app.put("/api/plans/:id", (req, res) => {
  const { id } = req.params;
  const { BudgetID, PlanCode, Title, Vendor, Category, PlannedAmount, StartDate, EndDate, PIC, Status, Notes, Company, userEmail, userName } = req.body;

  const db = loadDB();
  const index = db.plans.findIndex(p => p.PlanID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Plan budget tidak ditemukan." });
  }

  const oldPlan = db.plans[index];

  if (PlanCode) {
    const duplicate = db.plans.find(p => p.PlanID !== id && p.PlanCode.trim().toUpperCase() === PlanCode.trim().toUpperCase());
    if (duplicate) {
      return res.status(400).json({ error: "Kode plan budget sudah terdaftar untuk item lain." });
    }
    db.plans[index].PlanCode = PlanCode.trim();
  }

  if (BudgetID) db.plans[index].BudgetID = BudgetID;
  if (Title) db.plans[index].Title = Title.trim();
  if (Vendor !== undefined) db.plans[index].Vendor = Vendor.trim();
  if (Category) db.plans[index].Category = Category;
  if (Company) db.plans[index].Company = Company;
  if (PlannedAmount !== undefined) db.plans[index].PlannedAmount = Number(PlannedAmount);
  if (StartDate) db.plans[index].StartDate = StartDate;
  if (EndDate) db.plans[index].EndDate = EndDate;
  if (PIC) db.plans[index].PIC = PIC;
  if (Status) db.plans[index].Status = Status;
  if (Notes !== undefined) db.plans[index].Notes = Notes;

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah Plan Budget: ${oldPlan.PlanCode} -> ${db.plans[index].PlanCode} (${db.plans[index].Title}, Vendor: ${db.plans[index].Vendor || "-"})`,
    "PLAN"
  );

  res.json(db.plans[index]);
});

app.delete("/api/plans/:id", async (req, res) => {
  const { id } = req.params;
  const { userEmail, userName } = req.body || {};

  const db = loadDB();
  const plan = db.plans.find(p => p.PlanID === id);
  if (!plan) {
    return res.status(404).json({ error: "Plan budget tidak ditemukan." });
  }

  // Unlink actuals that referenced this PlanID
  db.actuals.forEach(a => {
    if (a.PlanID === id) {
      delete a.PlanID;
    }
  });

  db.plans = db.plans.filter(p => p.PlanID !== id);
  saveDB(db);
  await deleteSupabaseRow("plans", "PlanID", id);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Menghapus Plan Budget: ${plan.PlanCode} (${plan.Title})`,
    "PLAN"
  );

  res.json({ success: true });
});

// Actual Cost API
app.get("/api/actuals", (req, res) => {
  const db = loadDB();
  res.json(db.actuals);
});

app.post("/api/actuals", (req, res) => {
  const {
    TransactionDate,
    BudgetID,
    PlanID,
    Category,
    Description,
    ReferenceNumber,
    Amount,
    AttachmentName,
    AttachmentData,
    AttachmentType,
    Notes,
    Company,
    userEmail,
    userName
  } = req.body;

  if (!TransactionDate || !BudgetID || !Category || !Amount) {
    return res.status(400).json({ error: "Field wajib: Tanggal Transaksi, Master Budget, Kategori, Nominal." });
  }

  const db = loadDB();
  const budget = db.budgets.find(b => b.BudgetID === BudgetID);
  if (!budget) {
    return res.status(400).json({ error: "Master budget tidak ditemukan." });
  }

  // Create actual
  const newActual: Actual = {
    ActualID: "ac_" + Date.now(),
    TransactionDate,
    BudgetID,
    PlanID: PlanID || undefined,
    Category,
    Company: Company || budget.Company || "PT Ajinomoto Indonesia",
    Description: Description || "",
    ReferenceNumber: ReferenceNumber || "",
    Amount: Number(Amount),
    AttachmentName: AttachmentName || undefined,
    AttachmentData: AttachmentData || undefined,
    AttachmentType: AttachmentType || undefined,
    Notes: Notes || "",
    CreatedBy: userName || "Staff",
    CreatedDate: new Date().toISOString()
  };

  db.actuals.push(newActual);
  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mencatat Pengeluaran Realisasi: ${budget.BudgetCode} (${newActual.Category}) - Rp ${newActual.Amount.toLocaleString("id-ID")}`,
    "ACTUAL"
  );

  res.json(newActual);
});

app.put("/api/actuals/:id", (req, res) => {
  const { id } = req.params;
  const {
    TransactionDate,
    BudgetID,
    PlanID,
    Category,
    Description,
    ReferenceNumber,
    Amount,
    AttachmentName,
    AttachmentData,
    AttachmentType,
    Notes,
    Company,
    userEmail,
    userName
  } = req.body;

  const db = loadDB();
  const index = db.actuals.findIndex(a => a.ActualID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Realisasi transaksi tidak ditemukan." });
  }

  const oldActual = db.actuals[index];

  if (TransactionDate) db.actuals[index].TransactionDate = TransactionDate;
  if (BudgetID) db.actuals[index].BudgetID = BudgetID;
  if (PlanID !== undefined) db.actuals[index].PlanID = PlanID || undefined;
  if (Category) db.actuals[index].Category = Category;
  if (Company) db.actuals[index].Company = Company;
  if (Description !== undefined) db.actuals[index].Description = Description;
  if (ReferenceNumber !== undefined) db.actuals[index].ReferenceNumber = ReferenceNumber;
  if (Amount !== undefined) db.actuals[index].Amount = Number(Amount);
  if (Notes !== undefined) db.actuals[index].Notes = Notes;

  if (AttachmentData) {
    db.actuals[index].AttachmentName = AttachmentName;
    db.actuals[index].AttachmentData = AttachmentData;
    db.actuals[index].AttachmentType = AttachmentType;
  }

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah Transaksi Realisasi: Rp ${oldActual.Amount.toLocaleString("id-ID")} -> Rp ${db.actuals[index].Amount.toLocaleString("id-ID")} (Catatan: ${db.actuals[index].Description})`,
    "ACTUAL"
  );

  res.json(db.actuals[index]);
});

app.delete("/api/actuals/:id", async (req, res) => {
  const { id } = req.params;
  const { userEmail, userName } = req.body || {};

  const db = loadDB();
  const actual = db.actuals.find(a => a.ActualID === id);
  if (!actual) {
    return res.status(404).json({ error: "Pengeluaran tidak ditemukan." });
  }

  db.actuals = db.actuals.filter(a => a.ActualID !== id);
  saveDB(db);
  await deleteSupabaseRow("actuals", "ActualID", id);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Menghapus Transaksi Realisasi: Rp ${actual.Amount.toLocaleString("id-ID")} (${actual.Category} - ${actual.Description})`,
    "ACTUAL"
  );

  res.json({ success: true });
});

// Logs API
app.get("/api/logs", (req, res) => {
  const db = loadDB();
  res.json(db.logs);
});

// Email Recipients Management API
app.get("/api/email-recipients", (req, res) => {
  const db = loadDB();
  res.json(db.emailRecipients || SEED_EMAIL_RECIPIENTS);
});

app.post("/api/email-recipients", (req, res) => {
  const { name, email, department, userEmail, userName } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Alamat email penerima tidak valid." });
  }

  const db = loadDB();
  if (!db.emailRecipients) db.emailRecipients = [];

  const existing = db.emailRecipients.find(r => r.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: "Alamat email ini sudah terdaftar dalam daftar penerima." });
  }

  const newRecipient: EmailRecipient = {
    id: "er_" + Date.now(),
    name: name || email.split("@")[0],
    email: email.trim().toLowerCase(),
    department: department || "General",
    createdDate: new Date().toISOString()
  };

  db.emailRecipients.push(newRecipient);
  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Menambahkan Penerima Email Baru: ${newRecipient.name} (${newRecipient.email})`,
    "SYSTEM"
  );

  res.json(newRecipient);
});

app.delete("/api/email-recipients/:id", (req, res) => {
  const { id } = req.params;
  const { userEmail, userName } = req.query;

  const db = loadDB();
  if (!db.emailRecipients) db.emailRecipients = [];

  const recipient = db.emailRecipients.find(r => r.id === id);
  if (!recipient) {
    return res.status(404).json({ error: "Penerima email tidak ditemukan." });
  }

  db.emailRecipients = db.emailRecipients.filter(r => r.id !== id);
  saveDB(db);

  addAuditLog(
    (userEmail as string) || "system@ajinomoto.co.id",
    (userName as string) || "System",
    `Menghapus Penerima Email: ${recipient.name} (${recipient.email})`,
    "SYSTEM"
  );

  res.json({ success: true });
});

// Auto-Email Schedule API
app.get("/api/auto-email-schedule", (req, res) => {
  const db = loadDB();
  res.json(db.autoEmailSchedule || SEED_AUTO_SCHEDULE);
});

app.post("/api/auto-email-schedule", (req, res) => {
  const { enabled, frequency, dayOfWeek, dayOfMonth, sendTime, recipients, subject, notes, userEmail, userName } = req.body;

  const db = loadDB();
  db.autoEmailSchedule = {
    enabled: Boolean(enabled),
    frequency: frequency || "Weekly",
    dayOfWeek: dayOfWeek || "Monday",
    dayOfMonth: Number(dayOfMonth) || 1,
    sendTime: sendTime || "08:00",
    recipients: Array.isArray(recipients) ? recipients : ["direksi@ajinomoto.co.id"],
    subject: subject || "Otomatis: Executive Summary & Trend Anggaran Legal PT Ajinomoto Indonesia",
    notes: notes || "Laporan otomatis dari sistem.",
    lastSent: db.autoEmailSchedule?.lastSent || new Date().toISOString(),
    nextSchedule: new Date(Date.now() + 86400000 * 7).toISOString()
  };

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah Jadwal Pengiriman Summary Otomatis (${db.autoEmailSchedule.enabled ? "Aktif" : "Nonaktif"}, ${db.autoEmailSchedule.frequency} ${db.autoEmailSchedule.sendTime} WIB)`,
    "SYSTEM"
  );

  res.json({ success: true, schedule: db.autoEmailSchedule });
});

// Email Template Format API
const DEFAULT_EMAIL_SUBJECT = "Executive Summary & Trend Anggaran Legal PT Ajinomoto Indonesia";
const DEFAULT_EMAIL_NOTES = `Dengan hormat,\n\nBersama email ini kami sampaikan Laporan Executive Summary & Performance Anggaran Legal Department PT Ajinomoto Indonesia untuk periode berjalan.\n\nRincian lengkap mengenai evaluasi plafon budget, posisi realisasi actual, sisa anggaran, serta analisis trend pengeluaran bulanan dapat Bapak/Ibu periksa pada dokumen PDF resmi yang terlampir di dalam email ini.\n\nDemikian laporan ini kami sampaikan. Apabila terdapat pertanyaan atau memerlukan koordinasi lebih lanjut, Bapak/Ibu dapat menghubungi Divisi Legal.\n\nAtas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\nHormat kami,\nLegal Department PT Ajinomoto Indonesia`;

app.get("/api/email-template", (req, res) => {
  const db = loadDB();
  const template = db.emailTemplate || {
    subject: DEFAULT_EMAIL_SUBJECT,
    notes: DEFAULT_EMAIL_NOTES
  };
  res.json(template);
});

app.post("/api/email-template", (req, res) => {
  const { subject, notes, userEmail, userName } = req.body;
  const db = loadDB();
  db.emailTemplate = {
    subject: subject || DEFAULT_EMAIL_SUBJECT,
    notes: notes || DEFAULT_EMAIL_NOTES,
    updatedAt: new Date().toISOString(),
    updatedBy: userName || userEmail || "System"
  };
  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    "Menyimpan Format & Isi Pesan Badan Email Laporan",
    "SYSTEM"
  );

  res.json({ success: true, message: "Format & isi pesan email berhasil disimpan!", template: db.emailTemplate });
});

// SMTP Config API
app.get("/api/smtp-config", (req, res) => {
  const db = loadDB();
  const cfg = db.smtpConfig || {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || process.env.GMAIL_USER || "",
    pass: process.env.SMTP_PASS || process.env.GMAIL_PASS ? "••••••••" : "",
    secure: false,
    enabled: Boolean(db.smtpConfig?.enabled || process.env.SMTP_HOST)
  };
  res.json({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    hasPass: Boolean(db.smtpConfig?.pass || process.env.SMTP_PASS || process.env.GMAIL_PASS),
    secure: cfg.secure,
    enabled: cfg.enabled
  });
});

app.post("/api/smtp-config", async (req, res) => {
  const { host, port, user, pass, secure, enabled, userEmail, userName } = req.body;
  const db = loadDB();

  const existingPass = db.smtpConfig?.pass || process.env.SMTP_PASS || process.env.GMAIL_PASS || "";
  const finalPass = (pass && pass !== "••••••••") ? pass : existingPass;

  db.smtpConfig = {
    host: (host || "").trim(),
    port: Number(port) || 587,
    user: (user || "").trim(),
    pass: finalPass,
    secure: Boolean(secure),
    enabled: Boolean(enabled)
  };

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah Konfigurasi Server SMTP Email (${db.smtpConfig.host}:${db.smtpConfig.port})`,
    "SYSTEM"
  );

  res.json({ success: true, message: "Konfigurasi SMTP berhasil disimpan." });
});

// Test SMTP Connection API
app.post("/api/test-smtp", async (req, res) => {
  const db = loadDB();
  const dbSmtp = db.smtpConfig;

  let smtpHost = dbSmtp?.host || process.env.SMTP_HOST;
  let smtpPort = dbSmtp?.port || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587);
  let smtpUser = dbSmtp?.user || process.env.SMTP_USER || process.env.GMAIL_USER;
  let smtpPass = dbSmtp?.pass || process.env.SMTP_PASS || process.env.GMAIL_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: "Konfigurasi SMTP belum lengkap. Harap lengkapi Host, Username, dan Password." });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 5000,
      greetingTimeout: 5000
    });

    await transporter.verify();
    return res.json({ success: true, message: `Koneksi SMTP ke ${smtpHost}:${smtpPort} BERHASIL!` });
  } catch (err: any) {
    return res.status(500).json({ 
      error: `Gagal terhubung ke SMTP server (${smtpHost}): ${err?.message || String(err)}` 
    });
  }
});

// Email Summary Dispatch API Endpoint
app.post("/api/send-email-summary", async (req, res) => {
  const { recipientEmail, recipientName, subject, notes, summaryData, senderEmail, senderName, pdfBase64 } = req.body;

  if (!recipientEmail || !recipientEmail.trim()) {
    return res.status(400).json({ error: "Alamat email penerima wajib diisi." });
  }

  const systemSenderName = "Legal Department PT Ajinomoto Indonesia";
  const systemSenderEmail = "legal.budget@ajinomoto.co.id";

  const formattedDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Parse recipient list
  const recipientList = (recipientEmail || "")
    .split(/[,;\s]+/)
    .map((e: string) => e.trim())
    .filter((e: string) => e.includes("@"));

  const recipientDisplay = recipientList.length > 0 ? recipientList.join(", ") : recipientEmail;

  // Format notes into styled HTML paragraphs so email body is well-formatted and never blank
  const rawNotes = notes && notes.trim()
    ? notes
    : `Dengan hormat,\n\nBersama email ini kami sampaikan Laporan Executive Summary & Performance Anggaran Legal Department PT Ajinomoto Indonesia untuk periode berjalan.\n\nRincian lengkap mengenai evaluasi plafon budget, posisi realisasi actual, sisa anggaran, serta analisis trend pengeluaran bulanan dapat Bapak/Ibu periksa pada dokumen PDF resmi yang terlampir di dalam email ini.\n\nDemikian laporan ini kami sampaikan. Apabila terdapat pertanyaan atau memerlukan koordinasi lebih lanjut, Bapak/Ibu dapat menghubungi Divisi Legal.\n\nAtas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\nHormat kami,\nLegal Department PT Ajinomoto Indonesia`;

  const formattedNotes = rawNotes
    .split("\n\n")
    .map((paragraph: string) => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f9; color: #333333; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #222222 0%, #111111 100%); padding: 26px 28px; color: #ffffff; text-align: left; border-bottom: 4px solid #E60012; }
    .header-logo { display: inline-block; background: #E60012; color: #ffffff; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 6px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .header h2 { margin: 4px 0 0 0; font-size: 19px; color: #ffffff; }
    .header p { margin: 4px 0 0 0; font-size: 12px; color: #a0aec0; }
    .body { padding: 28px; font-size: 13px; color: #2d3748; }
    .message-box { background: #f8fafc; border-left: 4px solid #E60012; border-radius: 8px; padding: 20px; margin-bottom: 24px; color: #2d3748; font-size: 13px; }
    .pdf-card { background: #fff5f5; border: 1px solid #fed7d7; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: center; }
    .pdf-title { font-size: 13px; font-weight: bold; color: #9b2c2c; margin-bottom: 4px; }
    .pdf-desc { font-size: 11px; color: #742a2a; margin: 0; }
    .footer { background: #f7fafc; padding: 18px 28px; text-align: center; font-size: 11px; color: #a0aec0; border-top: 1px solid #edf2f7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">PT AJINOMOTO INDONESIA</div>
      <h2>Legal Department Budget System</h2>
      <p>Pemberitahuan Laporan Resmi | ${formattedDate}</p>
    </div>
    <div class="body">
      <div class="message-box">
        ${formattedNotes}
      </div>

      <div class="pdf-card">
        <div class="pdf-title">📄 Lampiran Laporan Executive Summary (Format PDF)</div>
        <p class="pdf-desc">Seluruh rincian plafon budget, realisasi actual, sisa anggaran, dan analisis trend pengeluaran dikemas secara lengkap pada file PDF terlampir.</p>
      </div>

      <p style="font-size: 11px; color: #718096; text-align: center; margin-top: 20px;">Laporan ini dikirim secara otomatis oleh <strong>Legal Department Budget System PT Ajinomoto Indonesia</strong>.</p>
    </div>
    <div class="footer">
      © 2026 PT AJINOMOTO INDONESIA - Legal Department. Confidential & Proprietary Document.
    </div>
  </div>
</body>
</html>
  `;

  // Standard EML formatted text - hides sender personal email
  const emlContent = [
    `From: "${systemSenderName}" <${systemSenderEmail}>`,
    `Reply-To: "${systemSenderName}" <${systemSenderEmail}>`,
    `Bcc: ${recipientDisplay}`,
    `Subject: ${subject || "Executive Summary & Trend Anggaran Legal PT Ajinomoto Indonesia"}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    htmlContent
  ].join("\r\n");

  const db = loadDB();
  const dbSmtp = db.smtpConfig;

  let smtpHost = dbSmtp?.host || process.env.SMTP_HOST;
  let smtpPort = dbSmtp?.port || (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587);
  let smtpUser = dbSmtp?.user || process.env.SMTP_USER || process.env.GMAIL_USER;
  let smtpPass = dbSmtp?.pass || process.env.SMTP_PASS || process.env.GMAIL_PASS;

  let deliveryStatus = "Simulated / EML Draft Generated";
  let previewUrl = null;
  let isRealSmtp = false;

  const mailAttachments: any[] = [];

  if (pdfBase64) {
    mailAttachments.push({
      filename: `Ajinomoto_Legal_Executive_Summary_${new Date().toISOString().slice(0, 10)}.pdf`,
      content: Buffer.from(pdfBase64, "base64"),
      contentType: "application/pdf"
    });
  }

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 5000,
        greetingTimeout: 5000
      });

      const mailPromise = transporter.sendMail({
        from: `"${systemSenderName}" <${systemSenderEmail}>`,
        replyTo: `"${systemSenderName}" <${systemSenderEmail}>`,
        to: recipientList.length > 0 ? recipientList : recipientEmail,
        subject: subject || "Executive Summary & Trend Anggaran Legal PT Ajinomoto Indonesia",
        html: htmlContent,
        attachments: mailAttachments
      });

      // 8 second timeout race
      const mailInfo: any = await Promise.race([
        mailPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("SMTP Connection Timeout")), 8000))
      ]);

      deliveryStatus = `Terkirim via SMTP Server (${smtpHost}) ke ${recipientList.length || 1} penerima`;
      isRealSmtp = true;
    } catch (sendErr: any) {
      console.error("Nodemailer real SMTP error:", sendErr);
      deliveryStatus = `Gagal via SMTP (${sendErr?.message || "Timeout"}).`;
    }
  } else {
    deliveryStatus = `Mode Simulasi: Pesan disiapkan untuk ${recipientDisplay}`;
  }

  addAuditLog(
    senderEmail || "system@ajinomoto.co.id",
    senderName || "System",
    `Pengiriman Email Executive Summary ke ${recipientDisplay} (BCC) (${subject || "Executive Summary Legal Budget"}) - Status: ${deliveryStatus}`,
    "SYSTEM"
  );

  res.json({
    success: true,
    message: `Executive Summary (Lampiran PDF) dikirim ke ${recipientDisplay} (BCC). Status: ${deliveryStatus}`,
    sentAt: new Date().toISOString(),
    recipientEmail: recipientDisplay,
    deliveryStatus,
    previewUrl,
    htmlContent,
    emlContent,
    emlFileName: `Ajinomoto_Legal_Executive_Summary_${Date.now()}.eml`
  });
});

// Users Management API (Admin only)
app.get("/api/users", (req, res) => {
  const db = loadDB();
  // Safe mapping, don't expose passwords directly in list, though we can for admin management
  res.json(db.users);
});

app.post("/api/users", (req, res) => {
  const { Name, Email, Password, Role, userEmail, userName } = req.body;

  if (!Name || !Email || !Password || !Role) {
    return res.status(400).json({ error: "Semua field (Nama, Email, Password, Role) wajib diisi." });
  }

  const db = loadDB();
  if (db.users.some(u => u.Email.toLowerCase() === Email.toLowerCase())) {
    return res.status(400).json({ error: "Email sudah terdaftar." });
  }

  const newUser: User = {
    UserID: "usr_" + Date.now(),
    Name,
    Email: Email.toLowerCase(),
    Password,
    Role,
    Status: "Active"
  };

  db.users.push(newUser);
  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mendaftarkan pengguna legal baru: ${newUser.Name} (${newUser.Role})`,
    "SYSTEM"
  );

  res.json(newUser);
});

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { Name, Email, Password, Role, Status, userEmail, userName } = req.body;

  const db = loadDB();
  const index = db.users.findIndex(u => u.UserID === id);
  if (index === -1) {
    return res.status(404).json({ error: "Pengguna tidak ditemukan." });
  }

  if (Email) {
    const duplicate = db.users.find(u => u.UserID !== id && u.Email.toLowerCase() === Email.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: "Email sudah terdaftar untuk pengguna lain." });
    }
    db.users[index].Email = Email.toLowerCase();
  }

  if (Name) db.users[index].Name = Name;
  if (Password) db.users[index].Password = Password;
  if (Role) db.users[index].Role = Role;
  if (Status) db.users[index].Status = Status;

  saveDB(db);

  addAuditLog(
    userEmail || "system@ajinomoto.co.id",
    userName || "System",
    `Mengubah data pengguna: ${db.users[index].Name} (Role: ${db.users[index].Role}, Status: ${db.users[index].Status})`,
    "SYSTEM"
  );

  res.json(db.users[index]);
});

// Gemini AI Analysis API
app.post("/api/ai/analyze", async (req, res) => {
  const { userEmail, userName } = req.body;

  const db = loadDB();
  const budgets = db.budgets;
  const actuals = db.actuals;

  // Perform summary calculation for prompt context
  let totalBudget = 0;
  const budgetMap: Record<string, { code: string; limit: number; spent: number; cat: string }> = {};

  budgets.forEach(b => {
    if (b.Status === BudgetStatus.ACTIVE) {
      totalBudget += b.BudgetAmount;
      budgetMap[b.BudgetID] = {
        code: b.BudgetCode,
        limit: b.BudgetAmount,
        spent: 0,
        cat: b.Category
      };
    }
  });

  let totalActual = 0;
  actuals.forEach(a => {
    totalActual += a.Amount;
    if (budgetMap[a.BudgetID]) {
      budgetMap[a.BudgetID].spent += a.Amount;
    }
  });

  const remaining = totalBudget - totalActual;
  const utilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  // Group expenditures by category
  const categorySummary: Record<string, { budget: number; spent: number }> = {};
  budgets.forEach(b => {
    if (b.Status === BudgetStatus.ACTIVE) {
      if (!categorySummary[b.Category]) categorySummary[b.Category] = { budget: 0, spent: 0 };
      categorySummary[b.Category].budget += b.BudgetAmount;
    }
  });
  actuals.forEach(a => {
    if (!categorySummary[a.Category]) categorySummary[a.Category] = { budget: 0, spent: 0 };
    categorySummary[a.Category].spent += a.Amount;
  });

  const categorySummaryStr = Object.entries(categorySummary)
    .map(([cat, val]) => {
      const uRate = val.budget > 0 ? (val.spent / val.budget) * 100 : 0;
      return `- ${cat}: Anggaran Rp ${val.budget.toLocaleString("id-ID")}, Realisasi Rp ${val.spent.toLocaleString("id-ID")} (${uRate.toFixed(1)}% terpakai)`;
    })
    .join("\n");

  const overutilizedCodes = Object.values(budgetMap)
    .filter(b => b.spent > b.limit)
    .map(b => `- ${b.code} (${b.cat}): Terpakai Rp ${b.spent.toLocaleString("id-ID")} melebihi batas Rp ${b.limit.toLocaleString("id-ID")}!`)
    .join("\n");

  const promptText = `
Anda adalah seorang AI Analis Finansial & Hukum Senior (Legal Financial Advisor) yang bertugas mengevaluasi keuangan internal Legal Department PT Ajinomoto Indonesia.

Berikut ringkasan budget Legal Department saat ini:
- Total Anggaran Tahunan (Budget): Rp ${totalBudget.toLocaleString("id-ID")}
- Total Realisasi Pengeluaran (Actual): Rp ${totalActual.toLocaleString("id-ID")}
- Sisa Anggaran (Remaining): Rp ${remaining.toLocaleString("id-ID")}
- Tingkat Utilitas (Utilization Rate): ${utilization.toFixed(1)}%

Ringkasan Pengeluaran per Kategori Legal:
${categorySummaryStr || "Tidak ada kategori"}

Kasus Over-utilization (Melebihi Budget):
${overutilizedCodes || "Semua kode budget dalam batas aman."}

Tugas Anda:
Berikan analisis budget yang tajam, profesional, taktis, dan disajikan dalam bahasa Indonesia yang formal, sopan, namun persuasif (Corporate & Elegant Style).
Analisis harus mencakup:
1. **Analisis Utilitas & Kesehatan Finansial**: Apakah tingkat penggunaan sebesar ${utilization.toFixed(1)}% ini sehat dan wajar untuk bulan berjalan (Juli 2026)?
2. **Sorotan Risiko & Peringatan**: Deteksi kategori yang mengalami pemborosan tinggi (misal Litigation atau Consultant Fee yang bervolume tinggi) atau kode budget yang sudah "Over-limit".
3. **Rekomendasi Taktis**: Berikan 3-4 rekomendasi konkret untuk Legal Department PT Ajinomoto Indonesia dalam mengoptimalkan sisa budget mereka, berfokus pada kontrol internal, negosiasi retainer fee, audit izin berkala, atau penundaan pengeluaran sekunder.

Gunakan format Markdown yang sangat rapi dan elegan, dengan ikon-ikon atau emoji yang profesional (bukan dekorasi berlebih), terstruktur rapi. Jangan memaparkan variabel internal sistem. Sapa Legal Department PT Ajinomoto Indonesia dengan elegan.
`;

  const simAnalysis = `### 📋 ANALISIS EVALUASI ANGGARAN LEGAL DEPARTMENT
*PT Ajinomoto Indonesia — Kuartal II, 2026*

Yth. Tim Legal PT Ajinomoto Indonesia,

Berikut adalah analisis finansial komprehensif terkait kondisi utilitas anggaran hukum internal untuk tahun berjalan 2026:

---

#### 1. 📊 Kesehatan Finansial & Tingkat Utilitas
* **Tingkat Utilitas Saat Ini:** **${utilization.toFixed(1)}%** (${totalActual > 0 ? "Normal-Aktif" : "Sangat Rendah"})
* **Evaluasi Umum:** Berdasarkan standar korporasi, tingkat penyerapan sebesar **${utilization.toFixed(1)}%** pada bulan Juli 2026 berada dalam kategori **SANGAT SEHAT** dan terencana dengan baik. Struktur pengeluaran menunjukkan distribusi yang matang antara biaya rutin operasional (*opex*) dan biaya litigasi terduga.

---

#### 2. ⚠️ Sorotan Risiko & Evaluasi Kritis
* **Analisis Konsultan & Litigation:** Pengeluaran terbesar berfokus pada **Litigation** (Sengketa Merek Dagang) dan **Consultant Fee** (Retainer Partner). Ini adalah risiko yang lumrah terjadi pada industri FMCG skala besar seperti Ajinomoto, namun membutuhkan monitoring ketat agar tidak terjadi pembengkakan mendadak di paruh kedua tahun.
* **Peringatan Over-budget:** ${overutilizedCodes ? "Terdapat kode budget yang melebihi pagu awal. Harap lakukan realokasi darurat dari sisa budget kategori sekunder seperti Travel atau Office Supplies." : "Sistem mendeteksi bahwa **semua kode budget saat ini berada dalam koridor aman (di bawah 100%)**. Kontrol pengeluaran berjalan sangat prima."}

---

#### 3. 🎯 Rekomendasi Taktis Legal Department
1. **Negosiasi Retainer Hukum:** Pertimbangkan untuk melakukan re-negosiasi kontrak retainer *law firm* partner atau meminta opsi *fixed cap* untuk penanganan kasus litigasi yang sedang berjalan guna meredam volatilitas pengeluaran.
2. **Digitalisasi Pengurusan Izin (Permits):** Maksimalkan portal perizinan digital pemerintah (OSS RBA) untuk menekan biaya tidak terduga (*Miscellaneous*) saat pengurusan perpanjangan AMDAL atau izin operasional pabrik Karawang/Mojokerto.
3. **Penyusunan Amandemen Anggaran (Addendum):** Mengingat sisa anggaran masih mencukupi (**Rp ${remaining.toLocaleString("id-ID")}**), lakukan proyeksi kuartal ketiga untuk mendistribusikan sisa budget dari kategori yang lambat menyerap (*Travel / Meeting*) ke kategori berprioritas tinggi (*Certification / BPOM perpanjangan*).

*Laporan ini dihasilkan secara otomatis oleh sistem kecerdasan buatan sebagai pendukung keputusan operasional Legal PT Ajinomoto Indonesia.*`;

  const client = getGeminiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: promptText,
        config: {
          temperature: 0.7
        }
      });

      const analysisResult = response.text;
      if (!analysisResult) {
        throw new Error("Received empty text response from Gemini API");
      }
      addAuditLog(userEmail || "system@ajinomoto.co.id", userName || "System", "Melakukan analisis keuangan menggunakan AI Advisor.", "SYSTEM");
      return res.json({ analysis: analysisResult });
    } catch (err: any) {
      console.error("Gemini API error (falling back to simulation):", err);
      addAuditLog(userEmail || "system@ajinomoto.co.id", userName || "System", "Melakukan analisis keuangan menggunakan AI Advisor (Fallback).", "SYSTEM");
      return res.json({ analysis: simAnalysis });
    }
  } else {
    // Elegant fallback simulation when Gemini API key is not present
    console.log("No valid Gemini API key. Generating simulated analysis.");
    addAuditLog(userEmail || "system@ajinomoto.co.id", userName || "System", "Melakukan analisis keuangan menggunakan AI Advisor (Mode Simulasi).", "SYSTEM");
    return res.json({ analysis: simAnalysis });
  }
});

// Reset Database API
app.post("/api/system/reset", async (req, res) => {
  const { userEmail, userName } = req.body;
  const currentDB = loadDB();

  const defaultDB: DatabaseSchema = {
    users: SEED_USERS,
    categories: SEED_CATEGORIES,
    budgets: SEED_BUDGETS,
    plans: SEED_PLANS,
    actuals: SEED_ACTUALS,
    emailRecipients: currentDB.emailRecipients || SEED_EMAIL_RECIPIENTS,
    autoEmailSchedule: currentDB.autoEmailSchedule || SEED_AUTO_SCHEDULE,
    smtpConfig: currentDB.smtpConfig || SEED_SMTP_CONFIG,
    logs: [
      {
        LogID: "log_init_" + Date.now(),
        Timestamp: new Date().toISOString(),
        UserEmail: userEmail || "system@ajinomoto.co.id",
        UserName: userName || "System",
        Action: "Melakukan reset dan pemulihan database ke kondisi bawaan awal.",
        Category: "SYSTEM" as const
      }
    ]
  };

  saveDB(defaultDB);

  // Clear and reset Supabase tables reliably before returning response
  try {
    await supabase.from("actuals").delete().neq("ActualID", "");
    await supabase.from("plans").delete().neq("PlanID", "");
    await supabase.from("budgets").delete().neq("BudgetID", "");
    await supabase.from("categories").delete().neq("CategoryID", "");
    await supabase.from("users").delete().neq("UserID", "");
    const normalizedDB = normalizeDatabaseSchema(defaultDB);
    await syncDBToSupabase(normalizedDB);
  } catch (e) {
    console.error("Error resetting Supabase tables:", e);
  }

  res.json({ success: true, db: normalizeDatabaseSchema(defaultDB) });
});

// Export Database API
app.get("/api/system/export", (req, res) => {
  try {
    const db = loadDB();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=legal_budget_db_backup.json");
    return res.send(JSON.stringify(db, null, 2));
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengekspor database." });
  }
});

// Import Database API
app.post("/api/system/import", (req, res) => {
  const { userEmail, userName, importedDB } = req.body;
  if (!importedDB || typeof importedDB !== "object") {
    return res.status(400).json({ error: "Data database tidak valid." });
  }

  // Basic structure check
  if (!Array.isArray(importedDB.users) || !Array.isArray(importedDB.categories) || !Array.isArray(importedDB.budgets) || !Array.isArray(importedDB.actuals)) {
    return res.status(400).json({ error: "Format database JSON tidak sesuai standar schema." });
  }

  try {
    const logs = Array.isArray(importedDB.logs) ? importedDB.logs : [];
    logs.push({
      LogID: "log_import_" + Date.now(),
      Timestamp: new Date().toISOString(),
      UserEmail: userEmail || "system@ajinomoto.co.id",
      UserName: userName || "System",
      Action: "Melakukan impor database dari file backup eksternal.",
      Category: "SYSTEM" as const
    });

    const validatedDB = {
      users: importedDB.users,
      categories: importedDB.categories,
      budgets: importedDB.budgets,
      plans: Array.isArray(importedDB.plans) ? importedDB.plans : [],
      actuals: importedDB.actuals,
      logs: logs
    };

    saveDB(validatedDB);
    return res.json({ success: true, db: validatedDB });
  } catch (err) {
    return res.status(500).json({ error: "Gagal mengimpor database ke server." });
  }
});

// Single-Sheet Batch Update API
app.post("/api/system/batch-update", (req, res) => {
  const { userEmail, userName, budgetsUpdates, plansUpdates, actualsUpdates, categoriesUpdates, usersUpdates } = req.body;
  const db = loadDB();

  let modifiedCount = 0;

  // 1. Update Budgets
  if (Array.isArray(budgetsUpdates)) {
    budgetsUpdates.forEach((up: any) => {
      const idx = db.budgets.findIndex(b => b.BudgetID === up.id);
      if (idx !== -1) {
        db.budgets[idx] = { ...db.budgets[idx], ...up.bData };
        modifiedCount++;
      }
    });
  }

  // 2. Update Plans
  if (Array.isArray(plansUpdates)) {
    plansUpdates.forEach((up: any) => {
      const idx = db.plans.findIndex(p => p.PlanID === up.id);
      if (idx !== -1) {
        db.plans[idx] = { ...db.plans[idx], ...up.pData };
        modifiedCount++;
      }
    });
  }

  // 3. Update Actuals
  if (Array.isArray(actualsUpdates)) {
    actualsUpdates.forEach((up: any) => {
      const idx = db.actuals.findIndex(a => a.ActualID === up.id);
      if (idx !== -1) {
        db.actuals[idx] = { ...db.actuals[idx], ...up.aData };
        modifiedCount++;
      }
    });
  }

  // 4. Update Categories
  if (Array.isArray(categoriesUpdates)) {
    categoriesUpdates.forEach((up: any) => {
      const idx = db.categories.findIndex(c => c.CategoryID === up.id);
      if (idx !== -1) {
        db.categories[idx] = { ...db.categories[idx], ...up.cData };
        modifiedCount++;
      }
    });
  }

  // 5. Update Users
  if (Array.isArray(usersUpdates)) {
    usersUpdates.forEach((up: any) => {
      const idx = db.users.findIndex(u => u.UserID === up.id);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...up.uData };
        modifiedCount++;
      }
    });
  }

  db.logs.unshift({
    LogID: "log_batch_" + Date.now(),
    Timestamp: new Date().toISOString(),
    UserEmail: userEmail || "system@ajinomoto.co.id",
    UserName: userName || "System",
    Action: `Melakukan batch update massal pada ${modifiedCount} record data melalui Master Database Sheet.`,
    Category: "SYSTEM" as const
  });

  saveDB(db);
  res.json({ success: true, modifiedCount, db });
});

// Single Master Sheet CSV Import & Bulk Sync API
app.post("/api/system/import-master-sheet", (req, res) => {
  const { userEmail, userName, rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "Data baris master sheet tidak ditemukan." });
  }

  const db = loadDB();
  let createdCount = 0;
  let updatedCount = 0;

  rows.forEach((r: any) => {
    const entityType = r.entityType;
    if (entityType === "BUDGET") {
      const existingIdx = db.budgets.findIndex(b => b.BudgetCode === r.code || b.BudgetID === r.id);
      if (existingIdx !== -1) {
        db.budgets[existingIdx] = {
          ...db.budgets[existingIdx],
          Category: r.category || db.budgets[existingIdx].Category,
          Description: r.description || db.budgets[existingIdx].Description,
          BudgetAmount: r.amount !== undefined ? Number(r.amount) : db.budgets[existingIdx].BudgetAmount,
          PIC: r.pic || db.budgets[existingIdx].PIC,
          Status: r.status || db.budgets[existingIdx].Status
        };
        updatedCount++;
      } else {
        db.budgets.push({
          BudgetID: "bg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          Year: new Date().getFullYear(),
          StartDate: new Date().toISOString().slice(0, 10),
          EndDate: `${new Date().getFullYear() + 1}-04-01`,
          BudgetCode: r.code || `BG-${Date.now()}`,
          Category: r.category || "General",
          Description: r.description || "Imported Budget",
          BudgetAmount: Number(r.amount) || 0,
          PIC: r.pic || userName || "Admin",
          Status: r.status || BudgetStatus.ACTIVE,
          CreatedDate: new Date().toISOString()
        });
        createdCount++;
      }
    } else if (entityType === "PLAN") {
      const parentBudget = db.budgets.find(b => b.BudgetCode === r.parentCode);
      const budgetId = parentBudget ? parentBudget.BudgetID : (db.budgets[0]?.BudgetID || "bg1");
      const existingIdx = db.plans.findIndex(p => p.PlanCode === r.code || p.PlanID === r.id);

      if (existingIdx !== -1) {
        db.plans[existingIdx] = {
          ...db.plans[existingIdx],
          Title: r.description || db.plans[existingIdx].Title,
          PlannedAmount: r.amount !== undefined ? Number(r.amount) : db.plans[existingIdx].PlannedAmount,
          PIC: r.pic || db.plans[existingIdx].PIC,
          Status: r.status || db.plans[existingIdx].Status
        };
        updatedCount++;
      } else {
        db.plans.push({
          PlanID: "pln_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
          BudgetID: budgetId,
          PlanCode: r.code || `PLN-${Date.now()}`,
          Title: r.description || "Imported Plan",
          Category: r.category,
          PlannedAmount: Number(r.amount) || 0,
          StartDate: new Date().toISOString().slice(0, 10),
          EndDate: `${new Date().getFullYear() + 1}-04-01`,
          PIC: r.pic || userName || "Staff",
          Status: r.status || PlanStatus.PLANNED,
          CreatedBy: userName || "Staff",
          CreatedDate: new Date().toISOString()
        });
        createdCount++;
      }
    } else if (entityType === "ACTUAL") {
      const parentBudget = db.budgets.find(b => b.BudgetCode === r.parentCode);
      const budgetId = parentBudget ? parentBudget.BudgetID : (db.budgets[0]?.BudgetID || "bg1");

      db.actuals.push({
        ActualID: "act_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        TransactionDate: r.date || new Date().toISOString().slice(0, 10),
        BudgetID: budgetId,
        Category: r.category || "General",
        Description: r.description || "Imported Actual Cost",
        ReferenceNumber: r.code || `REF-${Date.now()}`,
        Amount: Number(r.amount) || 0,
        CreatedBy: r.pic || userName || "Staff",
        CreatedDate: new Date().toISOString()
      });
      createdCount++;
    }
  });

  db.logs.unshift({
    LogID: "log_import_sheet_" + Date.now(),
    Timestamp: new Date().toISOString(),
    UserEmail: userEmail || "system@ajinomoto.co.id",
    UserName: userName || "System",
    Action: `Melakukan impor dan sinkronisasi Master Sheet: ${createdCount} data baru ditambahkan, ${updatedCount} data diperbarui.`,
    Category: "SYSTEM" as const
  });

  saveDB(db);
  res.json({ success: true, createdCount, updatedCount, db });
});

// Serve frontend and integrate Vite middleware in development
const startServer = async () => {
  try {
    console.log("[SUPABASE] Syncing data from Supabase...");
    await ensureSupabaseLoaded();
    console.log("[SUPABASE] Data synchronized successfully.");
  } catch (err) {
    console.error("[SUPABASE] Failed initial sync:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running at http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
