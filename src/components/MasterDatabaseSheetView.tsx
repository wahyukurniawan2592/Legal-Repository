/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Save, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  Edit3, 
  Trash2, 
  Plus, 
  Layers, 
  Database, 
  Check, 
  X, 
  AlertCircle, 
  FileText, 
  Sliders, 
  ArrowUpDown, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Target,
  Users,
  Tag,
  FileType,
  AlertTriangle,
  UploadCloud,
  ExternalLink,
  Link,
  Cloud,
  Share2,
  Globe
} from "lucide-react";
import { User, Budget, PlanBudget, Actual, Category, UserRole, BudgetStatus, PlanStatus } from "../types";
import { connectGoogleSheets, disconnectGoogleSheets } from "../lib/firebase";
import { getLocalDb, saveLocalDb, addAuditLogLocal } from "../services/apiClient";
import { 
  createGoogleSpreadsheet, 
  updateGoogleSpreadsheet, 
  fetchRowsFromGoogleSheet, 
  downloadOfflineGoogleSheetExcel,
  downloadCategoryMultiSheetExcel,
  downloadCategoryMultiSheetTemplate
} from "../lib/googleSheetsService";

interface MasterDatabaseSheetViewProps {
  budgets: Budget[];
  plans: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  users: User[];
  currentUser: User;
  onRefreshData: () => void;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
  activeCompany?: string;
}

// Flat row model for the Consolidated Single Sheet
export interface ConsolidatedRow {
  rowId: string;
  entityType: "BUDGET" | "PLAN" | "ACTUAL" | "CATEGORY" | "USER";
  id: string;
  code: string;
  parentCode: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  pic: string;
  status: string;
  rawObject: Budget | PlanBudget | Actual | Category | User;
  isModified?: boolean;
}

export default function MasterDatabaseSheetView({
  budgets,
  plans,
  actuals,
  categories,
  users,
  currentUser,
  onRefreshData,
  addToast
}: MasterDatabaseSheetViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"flat-sheet" | "matrix-sheet" | "batch-editor" | "import-export" | "google-sheets">("flat-sheet");
  
  // Google Sheets Integration States
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("ajinomoto_google_sheet_id") || "";
  });
  const [googleSpreadsheetUrl, setGoogleSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem("ajinomoto_google_sheet_url") || "";
  });
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [customSheetInput, setCustomSheetInput] = useState("");
  const [isFetchingGoogleSheet, setIsFetchingGoogleSheet] = useState(false);

  // Connect Google Account
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await connectGoogleSheets();
      if (res) {
        setGoogleAccessToken(res.accessToken);
        setGoogleUser(res.user);
        addToast(`Berhasil terhubung ke akun Google (${res.user.email})!`, "success");
      }
    } catch (err: any) {
      addToast(err.message || "Gagal menghubungkan ke Google Sheets.", "error");
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Disconnect Google Account
  const handleDisconnectGoogle = async () => {
    await disconnectGoogleSheets();
    setGoogleAccessToken(null);
    setGoogleUser(null);
    addToast("Koneksi Google Sheets berhasil diputus.", "info");
  };

  // Create Google Spreadsheet in Google Drive
  const handleCreateGoogleSheetInDrive = async () => {
    if (!googleAccessToken) {
      addToast("Silakan hubungkan akun Google terlebih dahulu.", "error");
      return;
    }

    setIsSyncingGoogle(true);
    try {
      const result = await createGoogleSpreadsheet(
        googleAccessToken,
        `Ajinomoto_Master_Database_${new Date().toISOString().slice(0, 10)}`,
        { budgets, plans, actuals, categories, users }
      );

      setGoogleSpreadsheetId(result.spreadsheetId);
      setGoogleSpreadsheetUrl(result.spreadsheetUrl);
      localStorage.setItem("ajinomoto_google_sheet_id", result.spreadsheetId);
      localStorage.setItem("ajinomoto_google_sheet_url", result.spreadsheetUrl);

      addToast("Berhasil membuat Spreadsheet Google Sheets baru di Google Drive Anda!", "success");
    } catch (err: any) {
      addToast(err.message || "Gagal membuat Google Sheet.", "error");
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Sync / Push Data to Existing Google Sheet
  const handleSyncDataToGoogleSheet = async () => {
    if (!googleAccessToken) {
      addToast("Silakan hubungkan akun Google terlebih dahulu.", "error");
      return;
    }
    if (!googleSpreadsheetId) {
      addToast("Belum ada Google Sheet yang terhubung. Buat Google Sheet baru terlebih dahulu.", "error");
      return;
    }

    setIsSyncingGoogle(true);
    try {
      await updateGoogleSpreadsheet(
        googleAccessToken,
        googleSpreadsheetId,
        { budgets, plans, actuals, categories, users }
      );
      addToast("Data Master Database berhasil disinkronkan ke Google Sheet!", "success");
    } catch (err: any) {
      addToast(err.message || "Gagal menyinkronkan data ke Google Sheet.", "error");
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Convert raw Google Sheet 2D matrix into ConsolidatedRow objects for preview
  const processGoogleSheetRowsToImport = (matrixRows: any[][]) => {
    if (matrixRows.length <= 1) {
      addToast("Google Sheet tidak memiliki baris data setelah header.", "error");
      return;
    }

    const dataRows = matrixRows.slice(1);
    const parsed: ConsolidatedRow[] = [];

    dataRows.forEach((row, idx) => {
      if (!row || row.length === 0 || !row[0]) return;

      const entityTypeRaw = String(row[0] || "BUDGET").toUpperCase();
      const validEntityType: "BUDGET" | "PLAN" | "ACTUAL" | "CATEGORY" | "USER" =
        ["BUDGET", "PLAN", "ACTUAL", "CATEGORY", "USER"].includes(entityTypeRaw)
          ? (entityTypeRaw as any)
          : "BUDGET";

      const code = String(row[1] || `CODE-${idx + 1}`);
      const parentCode = String(row[2] || "-");
      const category = String(row[3] || "General");
      const description = String(row[4] || `Item ${idx + 1}`);
      const amountRaw = String(row[5] || "0");
      const amountParsed = parseFloat(amountRaw.replace(/[^0-9.-]+/g, "")) || 0;
      const date = String(row[6] || new Date().toISOString().slice(0, 10));
      const pic = String(row[7] || currentUser.Name);
      const status = String(row[8] || "Active");

      parsed.push({
        rowId: `GSHEET_IMP_${idx}_${Date.now()}`,
        entityType: validEntityType,
        id: `IMP_${idx}`,
        code,
        parentCode,
        category,
        description,
        amount: amountParsed,
        date,
        pic,
        status,
        rawObject: {} as any
      });
    });

    setParsedImportRows(parsed);
    setActiveSubTab("import-export");
    addToast(`Berhasil menarik ${parsed.length} data dari Google Sheet! Silakan periksa preview lalu klik Konfirmasi Impor.`, "success");
  };

  // Import / Fetch Data from Google Sheet URL or ID
  const handleImportFromGoogleSheetId = async (inputStr?: string) => {
    const rawInput = inputStr || customSheetInput || googleSpreadsheetId;
    if (!rawInput.trim()) {
      addToast("Masukkan Google Sheet ID atau URL terlebih dahulu.", "error");
      return;
    }

    let sheetId = rawInput.trim();
    if (sheetId.includes("docs.google.com/spreadsheets/d/")) {
      const match = sheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        sheetId = match[1];
      }
    }

    if (!googleAccessToken) {
      addToast("Hubungkan ke akun Google Anda untuk membaca data Google Sheet.", "error");
      return;
    }

    setIsFetchingGoogleSheet(true);
    try {
      const rows = await fetchRowsFromGoogleSheet(googleAccessToken, sheetId, "All_Master_Database!A1:Z1000");

      if (!rows || rows.length <= 1) {
        addToast("Sheet 'All_Master_Database' tidak ditemukan atau kosong. Mencoba tab pertama...", "info");
        const fallbackRows = await fetchRowsFromGoogleSheet(googleAccessToken, sheetId, "A1:Z1000");
        if (!fallbackRows || fallbackRows.length <= 1) {
          addToast("Tidak ditemukan baris data pada Google Sheet.", "error");
          return;
        }
        processGoogleSheetRowsToImport(fallbackRows);
      } else {
        processGoogleSheetRowsToImport(rows);
      }
    } catch (err: any) {
      addToast(`Gagal membaca Google Sheet: ${err.message}`, "error");
    } finally {
      setIsFetchingGoogleSheet(false);
    }
  };
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEntityType, setFilterEntityType] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterYear, setFilterYear] = useState<string>("ALL");

  // Selection & Batch Operations
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: keyof ConsolidatedRow } | null>(null);

  // Local draft changes storage before saving to server
  const [modifiedRows, setModifiedRows] = useState<Record<string, Partial<ConsolidatedRow>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Matrix View expansion states
  const [expandedBudgets, setExpandedBudgets] = useState<Record<string, boolean>>({});

  // Import preview state
  const [importCsvText, setImportCsvText] = useState("");
  const [parsedImportRows, setParsedImportRows] = useState<ConsolidatedRow[]>([]);
  const [importingLoading, setImportingLoading] = useState(false);

  // File upload input ref & states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [importInputMode, setImportInputMode] = useState<"file" | "paste">("file");

  // Format IDR Helper
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Convert raw database entities into a single flat consolidated sheet array
  const allConsolidatedRows = useMemo<ConsolidatedRow[]>(() => {
    const rows: ConsolidatedRow[] = [];

    // 1. Master Budgets
    budgets.forEach(b => {
      rows.push({
        rowId: `BUDGET_${b.BudgetID}`,
        entityType: "BUDGET",
        id: b.BudgetID,
        code: b.BudgetCode,
        parentCode: "-",
        category: b.Category,
        description: b.Description,
        amount: b.BudgetAmount,
        date: `${b.StartDate} s/d ${b.EndDate}`,
        pic: b.PIC,
        status: b.Status,
        rawObject: b
      });
    });

    // 2. Plan Budgets (Rencana Kerja)
    plans.forEach(p => {
      const parentBudget = budgets.find(b => b.BudgetID === p.BudgetID);
      rows.push({
        rowId: `PLAN_${p.PlanID}`,
        entityType: "PLAN",
        id: p.PlanID,
        code: p.PlanCode || `PLN-${p.PlanID.substring(0, 5)}`,
        parentCode: parentBudget ? parentBudget.BudgetCode : p.BudgetID,
        category: p.Category || parentBudget?.Category || "-",
        description: p.Title,
        amount: p.PlannedAmount,
        date: `${p.StartDate} s/d ${p.EndDate}`,
        pic: p.PIC,
        status: p.Status,
        rawObject: p
      });
    });

    // 3. Actual Costs (Realisasi Pengeluaran)
    actuals.forEach(a => {
      const parentBudget = budgets.find(b => b.BudgetID === a.BudgetID);
      const parentPlan = plans.find(p => p.PlanID === a.PlanID);
      rows.push({
        rowId: `ACTUAL_${a.ActualID}`,
        entityType: "ACTUAL",
        id: a.ActualID,
        code: a.ReferenceNumber || `ACT-${a.ActualID.substring(0, 5)}`,
        parentCode: parentPlan ? parentPlan.PlanCode : (parentBudget ? parentBudget.BudgetCode : a.BudgetID),
        category: a.Category,
        description: a.Description,
        amount: a.Amount,
        date: a.TransactionDate,
        pic: a.CreatedBy,
        status: "Completed",
        rawObject: a
      });
    });

    // 4. Categories
    categories.forEach(c => {
      rows.push({
        rowId: `CATEGORY_${c.CategoryID}`,
        entityType: "CATEGORY",
        id: c.CategoryID,
        code: c.CategoryID,
        parentCode: "-",
        category: c.CategoryName,
        description: `Kategori Master: ${c.CategoryName}`,
        amount: 0,
        date: "-",
        pic: "System",
        status: c.Status,
        rawObject: c
      });
    });

    // 5. Users
    users.forEach(u => {
      rows.push({
        rowId: `USER_${u.UserID}`,
        entityType: "USER",
        id: u.UserID,
        code: u.Email,
        parentCode: "-",
        category: u.Role,
        description: `User: ${u.Name} (${u.Role})`,
        amount: 0,
        date: "-",
        pic: u.Name,
        status: u.Status,
        rawObject: u
      });
    });

    return rows;
  }, [budgets, plans, actuals, categories, users]);

  // Apply active filters to consolidated rows
  const filteredRows = useMemo(() => {
    return allConsolidatedRows.filter(row => {
      // Entity Type filter
      if (filterEntityType !== "ALL" && row.entityType !== filterEntityType) {
        return false;
      }

      // Category filter
      if (filterCategory !== "ALL" && row.category !== filterCategory) {
        return false;
      }

      // Status filter
      if (filterStatus !== "ALL" && row.status !== filterStatus) {
        return false;
      }

      // Search keyword
      if (searchTerm.trim() !== "") {
        const q = searchTerm.toLowerCase();
        const matchCode = row.code.toLowerCase().includes(q);
        const matchParent = row.parentCode.toLowerCase().includes(q);
        const matchDesc = row.description.toLowerCase().includes(q);
        const matchCategory = row.category.toLowerCase().includes(q);
        const matchPic = row.pic.toLowerCase().includes(q);

        if (!matchCode && !matchParent && !matchDesc && !matchCategory && !matchPic) {
          return false;
        }
      }

      return true;
    });
  }, [allConsolidatedRows, filterEntityType, filterCategory, filterStatus, searchTerm]);

  // Helper to handle inline value updates in state
  const handleCellChange = (rowId: string, field: keyof ConsolidatedRow, value: any) => {
    setModifiedRows(prev => {
      const current = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  // Get effective cell value (either modified or original)
  const getCellValue = (row: ConsolidatedRow, field: keyof ConsolidatedRow) => {
    if (modifiedRows[row.rowId] && modifiedRows[row.rowId][field] !== undefined) {
      return modifiedRows[row.rowId][field];
    }
    return row[field];
  };

  // Check if a row has pending modified changes
  const isRowModified = (rowId: string) => {
    return !!modifiedRows[rowId] && Object.keys(modifiedRows[rowId]).length > 0;
  };

  // Save all draft edits to backend server in a single batch
  const handleSaveAllBatchChanges = async () => {
    const rowIdsToSave = Object.keys(modifiedRows);
    if (rowIdsToSave.length === 0) {
      addToast("Tidak ada perubahan sel yang perlu disimpan.", "info");
      return;
    }

    setIsSaving(true);
    try {
      const budgetsUpdates: any[] = [];
      const plansUpdates: any[] = [];
      const actualsUpdates: any[] = [];
      const categoriesUpdates: any[] = [];
      const usersUpdates: any[] = [];

      rowIdsToSave.forEach(rowId => {
        const row = allConsolidatedRows.find(r => r.rowId === rowId);
        if (!row) return;

        const mod = modifiedRows[rowId];

        if (row.entityType === "BUDGET") {
          budgetsUpdates.push({
            id: row.id,
            bData: {
              ...(mod.code ? { BudgetCode: mod.code } : {}),
              ...(mod.category ? { Category: mod.category } : {}),
              ...(mod.description ? { Description: mod.description } : {}),
              ...(mod.amount !== undefined ? { BudgetAmount: Number(mod.amount) } : {}),
              ...(mod.pic ? { PIC: mod.pic } : {}),
              ...(mod.status ? { Status: mod.status as BudgetStatus } : {})
            }
          });
        } else if (row.entityType === "PLAN") {
          plansUpdates.push({
            id: row.id,
            pData: {
              ...(mod.code ? { PlanCode: mod.code } : {}),
              ...(mod.description ? { Title: mod.description } : {}),
              ...(mod.amount !== undefined ? { PlannedAmount: Number(mod.amount) } : {}),
              ...(mod.pic ? { PIC: mod.pic } : {}),
              ...(mod.status ? { Status: mod.status as PlanStatus } : {})
            }
          });
        } else if (row.entityType === "ACTUAL") {
          actualsUpdates.push({
            id: row.id,
            aData: {
              ...(mod.category ? { Category: mod.category } : {}),
              ...(mod.description ? { Description: mod.description } : {}),
              ...(mod.amount !== undefined ? { Amount: Number(mod.amount) } : {})
            }
          });
        } else if (row.entityType === "CATEGORY") {
          categoriesUpdates.push({
            id: row.id,
            cData: {
              ...(mod.category ? { CategoryName: mod.category } : {}),
              ...(mod.status ? { Status: mod.status as "Active" | "Inactive" } : {})
            }
          });
        } else if (row.entityType === "USER") {
          usersUpdates.push({
            id: row.id,
            uData: {
              ...(mod.pic ? { Name: mod.pic } : {}),
              ...(mod.status ? { Status: mod.status as "Active" | "Inactive" } : {})
            }
          });
        }
      });

      try {
        const res = await fetch("/api/system/batch-update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: currentUser.Email,
            userName: currentUser.Name,
            budgetsUpdates,
            plansUpdates,
            actualsUpdates,
            categoriesUpdates,
            usersUpdates
          })
        });

        if (res.ok) {
          addToast(`Berhasil memperbarui ${rowIdsToSave.length} data pada Master Sheet!`, "success");
          setModifiedRows({});
          onRefreshData();
          return;
        }
      } catch (err) {
        // Fallback to local DB execution
      }

      // Smart Client-Side Fallback for Batch Update
      const db = getLocalDb();
      budgetsUpdates.forEach(u => {
        const idx = db.budgets.findIndex(b => b.BudgetID === u.id);
        if (idx !== -1) db.budgets[idx] = { ...db.budgets[idx], ...u.bData };
      });
      plansUpdates.forEach(u => {
        db.plans = db.plans || [];
        const idx = db.plans.findIndex(p => p.PlanID === u.id);
        if (idx !== -1) db.plans[idx] = { ...db.plans[idx], ...u.pData };
      });
      actualsUpdates.forEach(u => {
        db.actuals = db.actuals || [];
        const idx = db.actuals.findIndex(a => a.ActualID === u.id);
        if (idx !== -1) db.actuals[idx] = { ...db.actuals[idx], ...u.aData };
      });
      categoriesUpdates.forEach(u => {
        const idx = db.categories.findIndex(c => c.CategoryID === u.id);
        if (idx !== -1) db.categories[idx] = { ...db.categories[idx], ...u.cData };
      });
      usersUpdates.forEach(u => {
        const idx = db.users.findIndex(us => us.UserID === u.id);
        if (idx !== -1) db.users[idx] = { ...db.users[idx], ...u.uData };
      });
      saveLocalDb(db);
      addAuditLogLocal("BATCH_UPDATE_SHEET", `Menyimpan ${rowIdsToSave.length} perubahan baris Master Sheet [Mode Client/Vercel]`, currentUser);
      addToast(`Berhasil memperbarui ${rowIdsToSave.length} data pada Master Sheet!`, "success");
      setModifiedRows({});
      onRefreshData();
    } catch (e) {
      addToast("Terjadi kesalahan saat menyimpan batch update.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle row selection for mass operations
  const toggleSelectRow = (rowId: string) => {
    setSelectedRowIds(prev => 
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredRows.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredRows.map(r => r.rowId));
    }
  };

  // Mass Bulk Operations (e.g., mass change status, category, or PIC)
  const handleMassChangeStatus = (newStatus: string) => {
    if (selectedRowIds.length === 0) {
      addToast("Pilih minimal satu baris untuk mengubah status secara massal.", "info");
      return;
    }

    selectedRowIds.forEach(rowId => {
      handleCellChange(rowId, "status", newStatus);
    });

    addToast(`Memperbarui status ${selectedRowIds.length} baris menjadi "${newStatus}". Klik "Simpan Batch" untuk menetapkan.`, "success");
  };

  const handleMassChangePIC = (newPic: string) => {
    if (!newPic || selectedRowIds.length === 0) return;
    selectedRowIds.forEach(rowId => {
      handleCellChange(rowId, "pic", newPic);
    });
    addToast(`Memperbarui PIC ${selectedRowIds.length} baris menjadi "${newPic}".`, "success");
  };

  const handleMassChangeCategory = (newCat: string) => {
    if (!newCat || selectedRowIds.length === 0) return;
    selectedRowIds.forEach(rowId => {
      handleCellChange(rowId, "category", newCat);
    });
    addToast(`Memperbarui Kategori ${selectedRowIds.length} baris menjadi "${newCat}".`, "success");
  };

  // Export Consolidated Single Sheet as CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        "Entity Type",
        "ID / Code",
        "Parent Code",
        "Category",
        "Description / Title",
        "Amount (IDR)",
        "Date / Period",
        "PIC / User",
        "Status"
      ];

      const csvRows = [headers.join(",")];

      allConsolidatedRows.forEach(row => {
        const descEscaped = `"${row.description.replace(/"/g, '""')}"`;
        const catEscaped = `"${row.category.replace(/"/g, '""')}"`;
        const picEscaped = `"${row.pic.replace(/"/g, '""')}"`;
        const dateEscaped = `"${row.date.replace(/"/g, '""')}"`;

        const line = [
          row.entityType,
          row.code,
          row.parentCode,
          catEscaped,
          descEscaped,
          row.amount,
          dateEscaped,
          picEscaped,
          row.status
        ].join(",");

        csvRows.push(line);
      });

      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Ajinomoto_Master_Database_Sheet_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast("Sheet Master Database berhasil diunduh sebagai file CSV!", "success");
    } catch (err) {
      addToast("Gagal melakukan ekspor CSV.", "error");
    }
  };

  // Download Pre-formatted Single Sheet Master Template (Excel .xlsx & CSV)
  const handleDownloadExcelTemplate = () => {
    try {
      const templateData = [
        {
          "Entity Type": "BUDGET",
          "ID / Code": "BG-2026-MKT-01",
          "Parent Code": "-",
          "Category": "Promosi & Marketing",
          "Description / Title": "Program Promosi Nasional Brand Mascot Ajinomoto",
          "Amount (IDR)": 250000000,
          "Date / Period": "2026-01-01 s/d 2026-12-31",
          "PIC / User": "Wahyu Waullilamri Kurniawan",
          "Status": "Active"
        },
        {
          "Entity Type": "PLAN",
          "ID / Code": "PLN-MKT-01-A",
          "Parent Code": "BG-2026-MKT-01",
          "Category": "Promosi & Marketing",
          "Description / Title": "Kampanye TV & Digital Media Social Q1",
          "Amount (IDR)": 100000000,
          "Date / Period": "2026-01-15 s/d 2026-03-31",
          "PIC / User": "Rian Wijaya (Staff)",
          "Status": "Planned"
        },
        {
          "Entity Type": "ACTUAL",
          "ID / Code": "ACT-2026-001",
          "Parent Code": "PLN-MKT-01-A",
          "Category": "Promosi & Marketing",
          "Description / Title": "Downpayment Slot Iklan Primetime TV",
          "Amount (IDR)": 45000000,
          "Date / Period": "2026-02-01",
          "PIC / User": "Rian Wijaya (Staff)",
          "Status": "Completed"
        },
        {
          "Entity Type": "CATEGORY",
          "ID / Code": "CAT-MKT",
          "Parent Code": "-",
          "Category": "Promosi & Marketing",
          "Description / Title": "Kategori Master: Promosi & Marketing",
          "Amount (IDR)": 0,
          "Date / Period": "-",
          "PIC / User": "System Admin",
          "Status": "Active"
        },
        {
          "Entity Type": "USER",
          "ID / Code": "rian.wijaya@ajinomoto.co.id",
          "Parent Code": "-",
          "Category": "Staff",
          "Description / Title": "User: Rian Wijaya (Staff)",
          "Amount (IDR)": 0,
          "Date / Period": "-",
          "PIC / User": "Rian Wijaya",
          "Status": "Active"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master_Database_Template");

      // Auto size column widths
      worksheet["!cols"] = [
        { wch: 15 }, // Entity Type
        { wch: 22 }, // ID / Code
        { wch: 20 }, // Parent Code
        { wch: 24 }, // Category
        { wch: 45 }, // Description
        { wch: 18 }, // Amount
        { wch: 28 }, // Date
        { wch: 28 }, // PIC
        { wch: 15 }  // Status
      ];

      XLSX.writeFile(workbook, `Ajinomoto_Unified_Master_Database_Template_${new Date().toISOString().slice(0,10)}.xlsx`);
      addToast("Template Excel Master Database berhasil diunduh!", "success");
    } catch (e) {
      addToast("Gagal membuat file template Excel.", "error");
    }
  };

  // Parse Excel / CSV File (Supports Multi-Sheet per Category & Single Sheet)
  const handleParseFile = (file: File) => {
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetNames = workbook.SheetNames;

        if (!sheetNames || sheetNames.length === 0) {
          addToast("File spreadsheet kosong atau tidak terdeteksi sheet.", "error");
          return;
        }

        const parsed: ConsolidatedRow[] = [];
        let globalIdx = 0;

        // Iterate through all sheets in the Excel workbook
        sheetNames.forEach(sheetName => {
          // Skip overview/summary sheets if other data sheets exist
          const lowerName = sheetName.toLowerCase().trim();
          if (sheetNames.length > 1 && (lowerName.includes("ringkasan") || lowerName.includes("summary"))) {
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          if (!rawRows || rawRows.length === 0) return;

          rawRows.forEach((rowObj) => {
            globalIdx++;
            const keys = Object.keys(rowObj);

            const getKeyVal = (possibleKeys: string[], defaultVal = "") => {
              const foundKey = keys.find(k => possibleKeys.some(pk => k.toLowerCase().trim().includes(pk.toLowerCase())));
              return foundKey ? String(rowObj[foundKey]).trim() : defaultVal;
            };

            const entityTypeRaw = getKeyVal(["entity type", "tipe entitas", "tipe", "entity", "type"], "BUDGET").toUpperCase();
            const validEntityType: "BUDGET" | "PLAN" | "ACTUAL" | "CATEGORY" | "USER" = 
              ["BUDGET", "PLAN", "ACTUAL", "CATEGORY", "USER"].includes(entityTypeRaw) ? (entityTypeRaw as any) : "BUDGET";

            const code = getKeyVal(["id / code", "kode id / ref", "code", "kode", "ref", "reference", "id"], `CODE-${globalIdx}`);
            const parentCode = getKeyVal(["parent code", "kode induk", "induk", "parent"], "-");

            // Category fallback to sheet name if not present in row
            let category = getKeyVal(["category", "kategori"], "");
            if (!category || category === "General" || category === "-") {
              if (sheetName !== "All_Master_Database" && sheetName !== "Sheet1") {
                category = sheetName;
              } else {
                category = "General";
              }
            }

            const description = getKeyVal(["description / title", "deskripsi / nama items", "description", "title", "deskripsi", "uraian", "nama"], `Imported Item ${globalIdx}`);

            // Specific column detection for Plafon / Rencana / Realisasi / Amount
            let amountRaw = "0";
            if (validEntityType === "BUDGET") {
              amountRaw = getKeyVal(["plafon budget", "plafon", "amount (idr)", "amount", "nominal", "budget", "jumlah"], "0");
            } else if (validEntityType === "PLAN") {
              amountRaw = getKeyVal(["rencana budget", "rencana", "planned", "amount (idr)", "amount", "nominal"], "0");
            } else if (validEntityType === "ACTUAL") {
              amountRaw = getKeyVal(["realisasi cost", "realisasi", "actual", "amount (idr)", "amount", "nominal"], "0");
            } else {
              amountRaw = getKeyVal(["amount (idr)", "amount", "nominal", "budget"], "0");
            }

            const amountParsed = parseFloat(amountRaw.replace(/[^0-9.-]+/g, "")) || 0;
            const date = getKeyVal(["date / period", "tanggal / periode", "date", "period", "tanggal", "periode"], new Date().toISOString().slice(0,10));
            const pic = getKeyVal(["pic / user", "pic", "user", "penanggung jawab", "author"], currentUser.Name);
            const status = getKeyVal(["status", "state"], "Active");

            parsed.push({
              rowId: `IMPORT_FILE_${globalIdx}_${Date.now()}`,
              entityType: validEntityType,
              id: `IMP_FILE_${globalIdx}`,
              code,
              parentCode,
              category,
              description,
              amount: amountParsed,
              date,
              pic,
              status,
              rawObject: {} as any
            });
          });
        });

        if (parsed.length === 0) {
          addToast("Tidak ada baris data valid yang terdeteksi dari sheet dalam file.", "error");
          return;
        }

        setParsedImportRows(parsed);
        addToast(`Berhasil membaca ${parsed.length} record dari ${sheetNames.length} sheet pada "${file.name}". Periksa preview lalu konfirmasi impor!`, "success");
      } catch (err) {
        addToast("Gagal membaca file spreadsheet. Harap pastikan format file .xlsx, .xls, atau .csv valid.", "error");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Dropzone Handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleParseFile(file);
    }
  };

  // CSV Import Parser & Processing from Textarea
  const handleProcessImportCsv = () => {
    if (!importCsvText.trim()) {
      addToast("Tempel atau unggah isi file CSV Sheet terlebih dahulu.", "error");
      return;
    }

    try {
      const lines = importCsvText.trim().split("\n");
      if (lines.length < 2) {
        addToast("File CSV tidak memiliki baris data yang cukup.", "error");
        return;
      }

      const parsed: ConsolidatedRow[] = [];
      // Skip header (line 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Basic CSV regex split taking into account quotes
        const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        if (cols.length >= 5) {
          const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());
          const entityType = (cleanCols[0]?.toUpperCase() || "BUDGET") as any;
          const code = cleanCols[1] || `CODE-${i}`;
          const parentCode = cleanCols[2] || "-";
          const category = cleanCols[3] || "General";
          const description = cleanCols[4] || "Imported Item";
          const amount = parseFloat(cleanCols[5]) || 0;
          const date = cleanCols[6] || new Date().toISOString().slice(0,10);
          const pic = cleanCols[7] || currentUser.Name;
          const status = cleanCols[8] || "Active";

          parsed.push({
            rowId: `IMPORT_${i}_${Date.now()}`,
            entityType: ["BUDGET", "PLAN", "ACTUAL", "CATEGORY", "USER"].includes(entityType) ? entityType : "BUDGET",
            id: `IMP_${i}`,
            code,
            parentCode,
            category,
            description,
            amount,
            date,
            pic,
            status,
            rawObject: {} as any
          });
        }
      }

      setParsedImportRows(parsed);
      addToast(`Berhasil membaca ${parsed.length} baris data dari teks CSV. Silakan periksa preview lalu konfirmasi impor!`, "info");
    } catch (e) {
      addToast("Gagal membaca format CSV. Harap pastikan format sesuai standar.", "error");
    }
  };

  // Submit Bulk Import to Server
  const handleCommitBulkImport = async () => {
    if (parsedImportRows.length === 0) {
      addToast("Tidak ada data preview impor yang siap diproses.", "error");
      return;
    }

    setImportingLoading(true);
    try {
      try {
        const res = await fetch("/api/system/import-master-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userEmail: currentUser.Email,
            userName: currentUser.Name,
            rows: parsedImportRows
          })
        });

        if (res.ok) {
          addToast(`Sukses memperbarui & mengimpor ${parsedImportRows.length} data ke dalam Master Database!`, "success");
          setParsedImportRows([]);
          setImportCsvText("");
          setUploadedFileName("");
          onRefreshData();
          return;
        }
      } catch (err) {
        // Fallback to client-side import
      }

      // Smart Client-Side Fallback for Master Sheet Import
      const db = getLocalDb();
      parsedImportRows.forEach(row => {
        if (row.entityType === "BUDGET") {
          const idx = db.budgets.findIndex(b => b.BudgetID === row.id);
          if (idx !== -1) {
            db.budgets[idx] = {
              ...db.budgets[idx],
              BudgetCode: row.code || db.budgets[idx].BudgetCode,
              Category: row.category || db.budgets[idx].Category,
              Description: row.description || db.budgets[idx].Description,
              PIC: row.pic || db.budgets[idx].PIC,
              BudgetAmount: row.amount || db.budgets[idx].BudgetAmount,
              Status: (row.status as any) || db.budgets[idx].Status
            };
          } else {
            db.budgets.push({
              BudgetID: row.id || `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              BudgetCode: row.code || `BGT-${new Date().getFullYear()}-XXX`,
              Category: row.category || "Litigation",
              Description: row.description || "Imported Budget",
              Year: new Date().getFullYear(),
              StartDate: `${new Date().getFullYear()}-01-01`,
              EndDate: `${new Date().getFullYear()}-12-31`,
              BudgetAmount: row.amount || 0,
              PIC: row.pic || currentUser.Name,
              Status: (row.status as any) || BudgetStatus.ACTIVE,
              CreatedDate: new Date().toISOString()
            });
          }
        } else if (row.entityType === "PLAN") {
          db.plans = db.plans || [];
          const idx = db.plans.findIndex(p => p.PlanID === row.id);
          if (idx !== -1) {
            db.plans[idx] = {
              ...db.plans[idx],
              Title: row.description || db.plans[idx].Title,
              Category: row.category || db.plans[idx].Category,
              PIC: row.pic || db.plans[idx].PIC,
              PlannedAmount: row.amount || db.plans[idx].PlannedAmount,
              Status: (row.status as any) || db.plans[idx].Status
            };
          }
        } else if (row.entityType === "ACTUAL") {
          db.actuals = db.actuals || [];
          const idx = db.actuals.findIndex(a => a.ActualID === row.id);
          if (idx !== -1) {
            db.actuals[idx] = {
              ...db.actuals[idx],
              Description: row.description || db.actuals[idx].Description,
              Category: row.category || db.actuals[idx].Category,
              Amount: row.amount || db.actuals[idx].Amount
            };
          }
        }
      });
      saveLocalDb(db);
      addAuditLogLocal("IMPORT_MASTER_SHEET", `Mengimpor ${parsedImportRows.length} data Master Sheet [Mode Client/Vercel]`, currentUser);
      addToast(`Sukses memperbarui & mengimpor ${parsedImportRows.length} data ke dalam Master Database!`, "success");
      setParsedImportRows([]);
      setImportCsvText("");
      setUploadedFileName("");
      onRefreshData();
    } catch (e) {
      addToast("Terjadi kesalahan saat memproses impor master sheet.", "error");
    } finally {
      setImportingLoading(false);
    }
  };

  // Statistics Summary Metrics
  const totalBudgetSum = useMemo(() => budgets.reduce((acc, b) => acc + b.BudgetAmount, 0), [budgets]);
  const totalPlanSum = useMemo(() => plans.reduce((acc, p) => acc + p.PlannedAmount, 0), [plans]);
  const totalActualSum = useMemo(() => actuals.reduce((acc, a) => acc + a.Amount, 0), [actuals]);
  const pendingEditsCount = Object.keys(modifiedRows).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10 pointer-events-none">
          <FileSpreadsheet className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-2">
              <span className="bg-red-500/20 text-red-300 font-mono text-[11px] font-bold px-3 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">
                Master Database Consolidation Engine
              </span>
              {pendingEditsCount > 0 && (
                <span className="bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold px-3 py-1 rounded-full border border-amber-500/30 animate-pulse">
                  {pendingEditsCount} Perubahan Belum Disimpan
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              Unified Single-Sheet Master Database
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Mengakomodir dan menghubungkan seluruh entitas data sistem (<strong className="text-white">Master Budget</strong>, <strong className="text-white">Plan Budget</strong>, <strong className="text-white">Actual Costs</strong>, <strong className="text-white">Kategori</strong>, & <strong className="text-white">Pengguna</strong>) ke dalam satu sheet master terpadu untuk kemudahan pembaruan massal (batch update), monitoring, dan ekspor/impor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {pendingEditsCount > 0 && (
              <button
                onClick={handleSaveAllBatchChanges}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Menyimpan..." : `Simpan Batch (${pendingEditsCount})`}</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer backdrop-blur-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Single Sheet (CSV)</span>
            </button>

            <button
              onClick={onRefreshData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all cursor-pointer"
              title="Refresh Sync Database"
            >
              <RefreshCw className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Master Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10 text-xs font-mono">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total Baris Entitas</span>
            <span className="text-sm font-bold text-white">{allConsolidatedRows.length} Record</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Forecast Plafon</span>
            <span className="text-sm font-bold text-emerald-400">{formatRupiah(totalBudgetSum)}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total Plan (RAB)</span>
            <span className="text-sm font-bold text-amber-300">{formatRupiah(totalPlanSum)}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total Realisasi (Actual)</span>
            <span className="text-sm font-bold text-red-400">{formatRupiah(totalActualSum)}</span>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Sisa Plafon Bersih</span>
            <span className="text-sm font-bold text-teal-300">{formatRupiah(totalBudgetSum - totalActualSum)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & View Mode Switcher */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab("flat-sheet")}
            className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === "flat-sheet" 
                ? "bg-brand-red text-white shadow-xs" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Single Consolidated Sheet</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {filteredRows.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("matrix-sheet")}
            className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === "matrix-sheet" 
                ? "bg-brand-red text-white shadow-xs" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Matriks Hierarki (Budget-Plan-Actual)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("batch-editor")}
            className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === "batch-editor" 
                ? "bg-brand-red text-white shadow-xs" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Batch Mass Updater ({selectedRowIds.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab("import-export")}
            className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === "import-export" 
                ? "bg-brand-red text-white shadow-xs" 
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Impor Master Sheet (CSV)</span>
          </button>

          <button
            onClick={() => setActiveSubTab("google-sheets")}
            className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeSubTab === "google-sheets" 
                ? "bg-emerald-700 text-white shadow-xs" 
                : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets & Drive Sync</span>
            {googleSpreadsheetId && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            )}
          </button>
        </div>

        {pendingEditsCount > 0 && (
          <div className="flex items-center space-x-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
            <Info className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Sel teredit ditandai warna kuning. Klik "Simpan Batch" untuk menetapkan ke database.</span>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: SINGLE CONSOLIDATED FLAT SHEET */}
      {activeSubTab === "flat-sheet" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4 p-5">
          
          {/* Controls & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari kode, deskripsi, kategori, atau PIC di master sheet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Entity Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px] text-gray-500 font-medium">Entitas:</span>
                <select
                  value={filterEntityType}
                  onChange={(e) => setFilterEntityType(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Entitas</option>
                  <option value="BUDGET">Master Budget</option>
                  <option value="PLAN">Plan Budget (Rencana)</option>
                  <option value="ACTUAL">Actual Cost (Realisasi)</option>
                  <option value="CATEGORY">Master Kategori</option>
                  <option value="USER">Pengguna</option>
                </select>
              </div>

              <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <Tag className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px] text-gray-500 font-medium">Kategori:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categories.map(c => (
                    <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                <span className="text-[11px] text-gray-500 font-medium">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Active">Active</option>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {(filterEntityType !== "ALL" || filterCategory !== "ALL" || filterStatus !== "ALL" || searchTerm) && (
                <button
                  onClick={() => {
                    setFilterEntityType("ALL");
                    setFilterCategory("ALL");
                    setFilterStatus("ALL");
                    setSearchTerm("");
                  }}
                  className="text-[11px] text-brand-red font-semibold hover:underline px-2 py-1"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* Mass Actions Bar for Selected Checkboxes */}
          {selectedRowIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-red-50/70 border border-red-200/80 rounded-xl text-xs">
              <div className="flex items-center space-x-2 font-bold text-brand-dark">
                <CheckSquare className="w-4 h-4 text-brand-red" />
                <span>{selectedRowIds.length} baris terpilih</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-gray-500">Ubah Status Massal:</span>
                <button
                  onClick={() => handleMassChangeStatus("Active")}
                  className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold hover:bg-emerald-200 transition-colors"
                >
                  Set Active
                </button>
                <button
                  onClick={() => handleMassChangeStatus("Completed")}
                  className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold hover:bg-blue-200 transition-colors"
                >
                  Set Completed
                </button>
                <button
                  onClick={() => handleMassChangeStatus("Inactive")}
                  className="px-2.5 py-1 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  Set Inactive
                </button>

                <button
                  onClick={() => setSelectedRowIds([])}
                  className="ml-2 text-gray-500 hover:text-gray-800 underline"
                >
                  Batal Pilih
                </button>
              </div>
            </div>
          )}

          {/* Consolidated Master Sheet Table Grid */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-[650px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="sticky top-0 bg-gray-900 text-white z-20 shadow-xs font-mono">
                <tr>
                  <th className="py-3 px-3 text-center w-10">
                    <button onClick={toggleSelectAll} className="p-0.5 text-gray-300 hover:text-white">
                      {selectedRowIds.length === filteredRows.length && filteredRows.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-brand-red" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Entitas</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Kode / Ref ID</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Kode Induk</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Kategori</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] min-w-[200px]">Deskripsi / Judul</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-right min-w-[140px]">Nominal (Rp)</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Tanggal / Periode</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">PIC / Author</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] text-center">Status Edit</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
                    const isSelected = selectedRowIds.includes(row.rowId);
                    const isModified = isRowModified(row.rowId);

                    const currCategory = getCellValue(row, "category");
                    const currDescription = getCellValue(row, "description");
                    const currAmount = getCellValue(row, "amount");
                    const currPic = getCellValue(row, "pic");
                    const currStatus = getCellValue(row, "status");
                    const currCode = getCellValue(row, "code");

                    // Badge Styling per Entity Type
                    const badgeStyles = {
                      BUDGET: "bg-gray-900 text-white font-mono",
                      PLAN: "bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold",
                      ACTUAL: "bg-red-100 text-red-800 border border-red-300 font-mono font-bold",
                      CATEGORY: "bg-purple-100 text-purple-800 border border-purple-300 font-mono",
                      USER: "bg-blue-100 text-blue-800 border border-blue-300 font-mono"
                    };

                    return (
                      <tr 
                        key={row.rowId}
                        className={`transition-colors hover:bg-gray-50/90 ${
                          isModified ? "bg-amber-50/60" : isSelected ? "bg-red-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <button onClick={() => toggleSelectRow(row.rowId)} className="text-gray-400 hover:text-brand-red">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-brand-red" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Entity Type Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] ${badgeStyles[row.entityType]}`}>
                            {row.entityType}
                          </span>
                        </td>

                        {/* Code (Editable Inline) */}
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                          <input
                            type="text"
                            value={currCode}
                            onChange={(e) => handleCellChange(row.rowId, "code", e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-red focus:bg-white focus:outline-none w-full font-mono text-xs font-bold text-gray-900 px-1 py-0.5 rounded-sm"
                          />
                        </td>

                        {/* Parent Code */}
                        <td className="py-2.5 px-3 font-mono text-gray-500 whitespace-nowrap text-[11px]">
                          {row.parentCode}
                        </td>

                        {/* Category (Editable Inline) */}
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                          <select
                            value={currCategory}
                            onChange={(e) => handleCellChange(row.rowId, "category", e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-red focus:bg-white focus:outline-none text-xs text-gray-800 cursor-pointer font-semibold py-0.5"
                          >
                            <option value={currCategory}>{currCategory}</option>
                            {categories.map(c => (
                              <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
                            ))}
                          </select>
                        </td>

                        {/* Description / Title (Editable Inline) */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={currDescription}
                            onChange={(e) => handleCellChange(row.rowId, "description", e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-red focus:bg-white focus:outline-none w-full text-xs text-gray-800 px-1 py-0.5 rounded-sm"
                          />
                        </td>

                        {/* Amount IDR (Editable Inline) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {row.entityType === "CATEGORY" || row.entityType === "USER" ? (
                            <span className="text-gray-300 text-[11px]">-</span>
                          ) : (
                            <input
                              type="number"
                              value={currAmount}
                              onChange={(e) => handleCellChange(row.rowId, "amount", parseFloat(e.target.value) || 0)}
                              className={`bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-red focus:bg-white focus:outline-none w-28 text-right font-mono text-xs font-bold px-1 py-0.5 rounded-sm ${
                                row.entityType === "BUDGET" ? "text-gray-900" :
                                row.entityType === "PLAN" ? "text-amber-800" : "text-brand-red"
                              }`}
                            />
                          )}
                        </td>

                        {/* Date / Period */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                          {row.date}
                        </td>

                        {/* PIC / Author (Editable Inline) */}
                        <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap">
                          <input
                            type="text"
                            value={currPic}
                            onChange={(e) => handleCellChange(row.rowId, "pic", e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-red focus:bg-white focus:outline-none text-xs text-gray-700 px-1 py-0.5 rounded-sm w-32"
                          />
                        </td>

                        {/* Status (Editable Inline Dropdown) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <select
                            value={currStatus}
                            onChange={(e) => handleCellChange(row.rowId, "status", e.target.value)}
                            className="bg-transparent text-[11px] font-bold font-mono px-2 py-1 rounded-md border border-gray-200 hover:border-brand-red focus:outline-none cursor-pointer"
                          >
                            <option value="Active">Active</option>
                            <option value="Planned">Planned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </td>

                        {/* Edit Status Indicator */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isModified ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono">
                              <Edit3 className="w-3 h-3" />
                              <span>Modified</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[10px] font-mono">Synced</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400 text-xs">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      Tidak ada baris data master sheet yang memenuhi kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: HIERARCHICAL MATRIX SHEET (BUDGET - PLAN - ACTUAL) */}
      {activeSubTab === "matrix-sheet" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 font-display">Matriks Konsolidasi Terstruktur</h3>
              <p className="text-xs text-gray-400">Setiap Master Budget disandingkan langsung dengan seluruh Rencana Kerja (Plans) dan Realisasi Pengeluaran (Actuals) terkait</p>
            </div>
            <button
              onClick={() => {
                const all: Record<string, boolean> = {};
                budgets.forEach(b => { all[b.BudgetID] = true; });
                setExpandedBudgets(all);
              }}
              className="text-xs text-brand-red font-semibold hover:underline"
            >
              Buka Semua Sub-Baris
            </button>
          </div>

          <div className="space-y-3">
            {budgets.map((b) => {
              const isExpanded = expandedBudgets[b.BudgetID] ?? true;
              const bPlans = plans.filter(p => p.BudgetID === b.BudgetID);
              const bActuals = actuals.filter(a => a.BudgetID === b.BudgetID);

              const totalPlanAmount = bPlans.reduce((sum, p) => sum + p.PlannedAmount, 0);
              const totalActualAmount = bActuals.reduce((sum, a) => sum + a.Amount, 0);
              const remainingPlafon = b.BudgetAmount - totalActualAmount;
              const utilRate = b.BudgetAmount > 0 ? (totalActualAmount / b.BudgetAmount) * 100 : 0;

              return (
                <div key={b.BudgetID} className="border border-gray-200/90 rounded-2xl overflow-hidden shadow-3xs">
                  {/* Parent Budget Bar */}
                  <div 
                    onClick={() => setExpandedBudgets(prev => ({ ...prev, [b.BudgetID]: !isExpanded }))}
                    className="bg-gradient-to-r from-gray-900 to-slate-800 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-black transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-brand-red" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-brand-red">{b.BudgetCode}</span>
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300 font-mono">{b.Category}</span>
                        </div>
                        <p className="text-xs text-gray-200 mt-0.5 font-medium">{b.Description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Forecast Plafon</span>
                        <span className="font-bold text-emerald-400">{formatRupiah(b.BudgetAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Total Realisasi</span>
                        <span className="font-bold text-red-400">{formatRupiah(totalActualAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Sisa Plafon</span>
                        <span className={`font-bold ${remainingPlafon < 0 ? "text-red-400" : "text-teal-300"}`}>
                          {formatRupiah(remainingPlafon)}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        utilRate > 100 ? "bg-red-500 text-white" : utilRate > 85 ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                      }`}>
                        {utilRate.toFixed(1)}% Utilisasi
                      </span>
                    </div>
                  </div>

                  {/* Expanded Sub-Records */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-50/50 space-y-4">
                      {/* Plans Section */}
                      <div>
                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5 font-mono">
                          <Target className="w-3.5 h-3.5 text-amber-600" />
                          <span>Rencana Kerja (Plan Budgets) - {bPlans.length} Item</span>
                        </h4>
                        {bPlans.length > 0 ? (
                          <div className="overflow-x-auto border border-amber-200/80 rounded-xl bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-amber-50 border-b border-amber-200 text-amber-900 font-mono font-bold">
                                  <th className="py-2 px-3">Kode Plan</th>
                                  <th className="py-2 px-3">Judul Rencana</th>
                                  <th className="py-2 px-3 text-right">Target Nominal</th>
                                  <th className="py-2 px-3">Periode Execution</th>
                                  <th className="py-2 px-3">PIC</th>
                                  <th className="py-2 px-3 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-100 font-sans">
                                {bPlans.map(p => (
                                  <tr key={p.PlanID} className="hover:bg-amber-50/30">
                                    <td className="py-2 px-3 font-mono font-bold text-amber-900">{p.PlanCode || `PLN-${p.PlanID.substring(0,5)}`}</td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{p.Title}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatRupiah(p.PlannedAmount)}</td>
                                    <td className="py-2 px-3 font-mono text-gray-500 text-[11px]">{p.StartDate} s/d {p.EndDate}</td>
                                    <td className="py-2 px-3 text-gray-700">{p.PIC}</td>
                                    <td className="py-2 px-3 text-center">
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                                        {p.Status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic bg-white p-2.5 rounded-xl border border-gray-200">Belum ada rencana kerja (Plan Budget) terhubung.</p>
                        )}
                      </div>

                      {/* Actuals Section */}
                      <div>
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5 font-mono">
                          <TrendingUp className="w-3.5 h-3.5 text-brand-red" />
                          <span>Realisasi Pengeluaran (Actual Costs) - {bActuals.length} Kuitansi</span>
                        </h4>
                        {bActuals.length > 0 ? (
                          <div className="overflow-x-auto border border-red-200/80 rounded-xl bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-red-50 border-b border-red-200 text-red-900 font-mono font-bold">
                                  <th className="py-2 px-3">Tanggal</th>
                                  <th className="py-2 px-3">No. Referensi</th>
                                  <th className="py-2 px-3">Kategori</th>
                                  <th className="py-2 px-3">Uraian Pengeluaran</th>
                                  <th className="py-2 px-3 text-right">Nominal Actual</th>
                                  <th className="py-2 px-3">Dibukukan Oleh</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-red-100 font-sans">
                                {bActuals.map(a => (
                                  <tr key={a.ActualID} className="hover:bg-red-50/30">
                                    <td className="py-2 px-3 font-mono text-gray-700">{a.TransactionDate}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-gray-900">{a.ReferenceNumber || "-"}</td>
                                    <td className="py-2 px-3 font-semibold text-gray-800">{a.Category}</td>
                                    <td className="py-2 px-3 text-gray-700">{a.Description}</td>
                                    <td className="py-2 px-3 text-right font-mono font-bold text-brand-red">{formatRupiah(a.Amount)}</td>
                                    <td className="py-2 px-3 text-gray-600">{a.CreatedBy}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic bg-white p-2.5 rounded-xl border border-gray-200">Belum ada transaksi realisasi pengeluaran dicatat.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 3: BATCH MASS UPDATER TOOL */}
      {activeSubTab === "batch-editor" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 font-display">Batch Mass Updater & Bulk Tool</h3>
            <p className="text-xs text-gray-500">Lakukan pembaruan massal untuk beberapa baris sekaligus secara instan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Mass Status Change */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">1. Ubah Status Massal</h4>
              <p className="text-[11px] text-gray-500">Tentukan status baru untuk semua item yang dicentang di tabel master.</p>
              
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleMassChangeStatus("Active")}
                  className="w-full text-left px-3 py-2 bg-white border border-gray-200 hover:border-emerald-500 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between"
                >
                  <span>Set Active</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </button>
                <button
                  onClick={() => handleMassChangeStatus("Completed")}
                  className="w-full text-left px-3 py-2 bg-white border border-gray-200 hover:border-blue-500 rounded-xl text-xs font-bold text-blue-800 flex items-center justify-between"
                >
                  <span>Set Completed</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => handleMassChangeStatus("Inactive")}
                  className="w-full text-left px-3 py-2 bg-white border border-gray-200 hover:border-gray-400 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-between"
                >
                  <span>Set Inactive</span>
                  <CheckCircle2 className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Card 2: Mass Category Reassignment */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">2. Alokasi Kategori Massal</h4>
              <p className="text-[11px] text-gray-500">Ubah kategori anggaran seluruh baris terpilih dalam 1 langkah.</p>
              
              <div className="space-y-2 pt-2">
                <select
                  onChange={(e) => handleMassChangeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red cursor-pointer"
                >
                  <option value="">-- Pilih Kategori Baru --</option>
                  {categories.map(c => (
                    <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card 3: Mass PIC Reassignment */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider">3. Re-Assignment Penanggung Jawab (PIC)</h4>
              <p className="text-[11px] text-gray-500">Alihkan tanggung jawab (PIC) baris terpilih ke staff/penanggung jawab baru.</p>

              <div className="space-y-2 pt-2">
                <select
                  onChange={(e) => handleMassChangePIC(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red cursor-pointer"
                >
                  <option value="">-- Pilih PIC Baru --</option>
                  {users.map(u => (
                    <option key={u.UserID} value={u.Name}>{u.Name} ({u.Role})</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">Simpan Hasil Perubahan Massal</h4>
                <p className="text-[11px] text-emerald-700">Setelah melakukan perubahan batch di atas, klik tombol di kanan untuk menyimpan permanen ke server database.</p>
              </div>
            </div>

            <button
              onClick={handleSaveAllBatchChanges}
              disabled={isSaving || pendingEditsCount === 0}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-40"
            >
              {isSaving ? "Menyimpan..." : "Simpan Permanen Ke Server"}
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 4: CSV / EXCEL MASTER SHEET IMPORT & GUIDE */}
      {activeSubTab === "import-export" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md uppercase">
                  Multi-Sheet & Multi-Category Database
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                  Excel Multi-Tab (.xlsx)
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 font-display mt-1">Database Excel Multi-Sheet Per Kategori & Kolom</h3>
              <p className="text-xs text-gray-500">
                Unduh atau impor satu file Excel (.xlsx) dengan pembagian tab terpisah untuk setiap Kategori (misal: Promosi & Marketing, Operasional, Investasi) dengan rincian kolom Plafon, Rencana, Realisasi, dan Sisa Plafon.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadCategoryMultiSheetExcel({ budgets, plans, actuals, categories, users })}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>Unduh Excel Multi-Sheet Per Kategori (.xlsx)</span>
              </button>

              <button
                onClick={() => downloadCategoryMultiSheetTemplate()}
                className="flex items-center space-x-2 px-3.5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Template Multi-Sheet (.xlsx)</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>CSV Master Backup</span>
              </button>
            </div>
          </div>

          {/* Mode Selector: File Upload vs Textarea Paste */}
          <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
            <button
              onClick={() => setImportInputMode("file")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                importInputMode === "file" ? "bg-gray-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Unggah File Spreadsheet (.xlsx / .csv)</span>
            </button>

            <button
              onClick={() => setImportInputMode("paste")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                importInputMode === "paste" ? "bg-gray-900 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FileType className="w-4 h-4" />
              <span>Tempel Teks Raw CSV / TSV</span>
            </button>
          </div>

          {/* MODE 1: FILE DROPZONE */}
          {importInputMode === "file" && (
            <div className="space-y-4">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleParseFile(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-brand-red bg-red-50/50 scale-[1.01]"
                    : uploadedFileName
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-gray-300 hover:border-brand-red bg-gray-50/50 hover:bg-gray-50"
                }`}
              >
                <div className="max-w-md mx-auto space-y-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-transform ${
                    uploadedFileName ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-brand-red"
                  }`}>
                    {uploadedFileName ? <CheckCircle2 className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {uploadedFileName ? `File Terpilih: ${uploadedFileName}` : "Tarik & Lepas File Spreadsheet di Sini"}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Mendukung format <strong className="text-gray-800">.XLSX</strong>, <strong className="text-gray-800">.XLS</strong>, atau <strong className="text-gray-800">.CSV</strong> (Maksimal 10MB)
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-red text-white text-xs font-bold rounded-xl shadow-xs hover:bg-red-700 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>{uploadedFileName ? "Ganti File Spreadsheet" : "Pilih File dari Komputer"}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: TEXTAREA PASTE */}
          {importInputMode === "paste" && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-800 font-mono block">
                Tempelkan Teks Berformat CSV atau TSV di Sini:
              </label>
              <textarea
                rows={8}
                placeholder={`Entity Type,ID / Code,Parent Code,Category,Description / Title,Amount (IDR),Date / Period,PIC / User,Status
BUDGET,BG-2026-TEST-01,-,Legal Permit,Izin AMDAL Tambahan,150000000,2026-01-01,Wahyu Waullilamri Kurniawan,Active
PLAN,PLN-2026-01,BG-2026-TEST-01,Legal Permit,Persiapan Dokumen Lingkungan,50000000,2026-02-01 s/d 2026-03-01,Rian Wijaya (Staff),Planned
ACTUAL,ACT-101,PLN-2026-01,Legal Permit,Pembayaran Retribusi Resmi,25000000,2026-02-15,Rian Wijaya (Staff),Completed`}
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                className="w-full p-4 font-mono text-xs bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white leading-relaxed"
              />

              <button
                onClick={handleProcessImportCsv}
                className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Proses & Tampilkan Preview Teks CSV
              </button>
            </div>
          )}

          {/* IMPORT PREVIEW SECTION */}
          {parsedImportRows.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              
              {/* Entity Breakdown Stats Header */}
              <div className="bg-gray-900 text-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold font-mono text-emerald-400 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Hasil Deteksi Import Sheet ({parsedImportRows.length} Record Siap Diimpor)</span>
                  </h4>
                  <p className="text-xs text-gray-300 mt-0.5">Semua entitas di bawah akan dimasukkan dan dihubungkan secara konsisten ke dalam database utama.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 bg-white/10 text-white text-[11px] font-mono rounded-lg border border-white/10">
                    Budget: <strong>{parsedImportRows.filter(r => r.entityType === "BUDGET").length}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[11px] font-mono rounded-lg border border-amber-500/30">
                    Plan: <strong>{parsedImportRows.filter(r => r.entityType === "PLAN").length}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-red-500/20 text-red-300 text-[11px] font-mono rounded-lg border border-red-500/30">
                    Actual: <strong>{parsedImportRows.filter(r => r.entityType === "ACTUAL").length}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-[11px] font-mono rounded-lg border border-purple-500/30">
                    Category: <strong>{parsedImportRows.filter(r => r.entityType === "CATEGORY").length}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-[11px] font-mono rounded-lg border border-blue-500/30">
                    User: <strong>{parsedImportRows.filter(r => r.entityType === "USER").length}</strong>
                  </span>
                </div>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto border border-gray-200 rounded-2xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-gray-100 text-gray-700 font-mono font-bold sticky top-0 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Entitas</th>
                      <th className="py-2.5 px-3">Kode / Ref ID</th>
                      <th className="py-2.5 px-3">Kode Induk</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Deskripsi / Judul</th>
                      <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                      <th className="py-2.5 px-3">PIC / Author</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {parsedImportRows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-gray-400 text-[11px]">{i + 1}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            r.entityType === "BUDGET" ? "bg-gray-900 text-white" :
                            r.entityType === "PLAN" ? "bg-amber-100 text-amber-900" :
                            r.entityType === "ACTUAL" ? "bg-red-100 text-red-800" :
                            r.entityType === "CATEGORY" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {r.entityType}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-gray-900 whitespace-nowrap">{r.code}</td>
                        <td className="py-2 px-3 font-mono text-gray-500 whitespace-nowrap">{r.parentCode}</td>
                        <td className="py-2 px-3 font-medium whitespace-nowrap">{r.category}</td>
                        <td className="py-2 px-3 text-gray-800">{r.description}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {r.entityType === "CATEGORY" || r.entityType === "USER" ? "-" : formatRupiah(r.amount)}
                        </td>
                        <td className="py-2 px-3 text-gray-700 whitespace-nowrap">{r.pic}</td>
                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap">{r.status}</td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              setParsedImportRows(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Hapus baris ini dari daftar impor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Commit Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Konfirmasi Impor Massal Ke Database</h4>
                    <p className="text-[11px] text-emerald-700">Semua {parsedImportRows.length} baris di atas akan langsung dimasukkan dan memperbarui database master secara otomatis.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => { setParsedImportRows([]); setUploadedFileName(""); }}
                    className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    onClick={handleCommitBulkImport}
                    disabled={importingLoading}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{importingLoading ? "Mengimpor Ke Database..." : `Proses Impor ${parsedImportRows.length} Record`}</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* VIEW MODE 5: GOOGLE SHEETS & DRIVE DATABASE SYNC */}
      {activeSubTab === "google-sheets" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md uppercase flex items-center space-x-1">
                  <Cloud className="w-3 h-3 text-emerald-600" />
                  <span>Google Workspace Integration</span>
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                  Google Drive & Sheets API v4
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-display mt-2 flex items-center space-x-2">
                <Globe className="w-6 h-6 text-emerald-600" />
                <span>Database Google Sheets & Google Drive Sync</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Kelola seluruh data anggaran, rencana kerja, pengeluaran, kategori, dan pengguna secara terstruktur di Google Sheets di Google Drive Anda.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => downloadOfflineGoogleSheetExcel({ budgets, plans, actuals, categories, users })}
                className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Workbook Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Section 1: Google Auth Connection Banner */}
          <div className={`p-5 rounded-2xl border transition-all ${
            googleAccessToken 
              ? "bg-emerald-50/60 border-emerald-200" 
              : "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  googleAccessToken ? "bg-emerald-600 text-white shadow-sm" : "bg-gray-200 text-gray-500"
                }`}>
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-gray-900">
                      {googleAccessToken ? "Akun Google Terhubung" : "Belum Terhubung Ke Akun Google"}
                    </h4>
                    {googleAccessToken && (
                      <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 text-[10px] font-bold rounded-md font-mono">
                        OAuth Approved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {googleAccessToken
                      ? `Terhubung sebagai: ${googleUser?.email || "Google Account"} — Anda memiliki akses penuh untuk membaca, menulis, dan membuat Google Sheets di Google Drive.`
                      : "Klik tombol di kanan untuk menghubungkan akun Google Anda dan mengizinkan pemuatan/sinkronisasi otomatis ke Google Sheets."}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {googleAccessToken ? (
                  <button
                    onClick={handleDisconnectGoogle}
                    className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Putuskan Akses Google
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                    className="flex items-center space-x-2.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Globe className="w-4 h-4" />
                    <span>{isConnectingGoogle ? "Menghubungkan Google..." : "Hubungkan Google Sheets & Drive"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Google Sheets Control Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Panel A: Buat & Sinkronkan ke Google Sheets */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 hover:border-emerald-300 transition-all shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">1. Buat / Sinkronkan Google Sheet</h4>
                  <p className="text-xs text-gray-500">Ekspor seluruh tabel database master ke Google Sheets multi-sheet.</p>
                </div>
              </div>

              {googleSpreadsheetId ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span>Spreadsheet Terhubung ID:</span>
                    <span className="font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">
                      {googleSpreadsheetId.substring(0, 12)}...
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Memiliki 6 Tab Worksheet: <strong>All_Master_Database</strong>, <strong>Master_Budgets</strong>, <strong>Plan_Budgets</strong>, <strong>Actual_Transactions</strong>, <strong>Categories</strong>, <strong>Users</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                  Belum ada Spreadsheet Google Sheets yang dibuat. Klik tombol di bawah untuk membuat file baru di Google Drive Anda.
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  onClick={handleCreateGoogleSheetInDrive}
                  disabled={isSyncingGoogle}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSyncingGoogle ? "Memproses..." : "Buat Google Sheet Baru di Drive"}</span>
                </button>

                {googleSpreadsheetId && (
                  <button
                    onClick={handleSyncDataToGoogleSheet}
                    disabled={isSyncingGoogle}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingGoogle ? "animate-spin text-emerald-400" : ""}`} />
                    <span>Perbarui / Push Data</span>
                  </button>
                )}
              </div>
            </div>

            {/* Panel B: Unduh & Akses Langsung Google Sheet */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 hover:border-emerald-300 transition-all shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">2. Fitur Unduh & Akses Google Sheet</h4>
                  <p className="text-xs text-gray-500">Unduh data langsung dalam format resmi Google Sheets / Excel / PDF / CSV.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {googleSpreadsheetUrl ? (
                  <a
                    href={googleSpreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-1.5 p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all text-center col-span-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Spreadsheet di Google Sheets Web</span>
                  </a>
                ) : (
                  <button
                    onClick={() => downloadOfflineGoogleSheetExcel({ budgets, plans, actuals, categories, users })}
                    className="flex items-center justify-center space-x-1.5 p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all col-span-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Live Excel Multi-Tab (.xlsx)</span>
                  </button>
                )}

                {googleSpreadsheetId ? (
                  <>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/export?format=xlsx`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-1 p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unduh .XLSX</span>
                    </a>

                    <a
                      href={`https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/export?format=csv`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-1 p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Unduh CSV</span>
                    </a>

                    <a
                      href={`https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}/export?format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center space-x-1 p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800 col-span-2"
                    >
                      <Download className="w-3.5 h-3.5 text-red-600" />
                      <span>Cetak PDF Laporan Google Sheet</span>
                    </a>
                  </>
                ) : (
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center space-x-1.5 p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 col-span-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Unduh Standar Master CSV Backup</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Section 3: Impor Langsung Dari Google Sheet ID atau URL */}
          <div className="bg-gray-900 text-white rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold font-mono text-emerald-400 flex items-center space-x-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span>Impor & Tarik Data Dari Link Google Sheet</span>
                </h4>
                <p className="text-xs text-gray-300 mt-1">
                  Tempelkan URL Google Sheet atau Spreadsheet ID publik/terhubung di bawah untuk membaca dan mengimpor baris data secara langsung.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMd.../edit atau Spreadsheet ID"
                value={customSheetInput}
                onChange={(e) => setCustomSheetInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder-gray-500"
              />

              <button
                onClick={() => handleImportFromGoogleSheetId()}
                disabled={isFetchingGoogleSheet}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingGoogleSheet ? "animate-spin" : ""}`} />
                <span>{isFetchingGoogleSheet ? "Membaca Sheet..." : "Tarik Data Google Sheet"}</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
