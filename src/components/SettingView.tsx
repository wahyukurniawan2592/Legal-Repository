/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Edit3, 
  X, 
  Trash2, 
  Check, 
  Clock, 
  ShieldAlert, 
  Database, 
  RefreshCw,
  Search,
  Lock,
  Download,
  Upload,
  FileSpreadsheet,
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  Palette,
  Type,
  Mail
} from "lucide-react";
import { User, Category, AuditLog, UserRole, Budget, Actual } from "../types";
import { connectGoogleSheets, disconnectGoogleSheets } from "../lib/firebase";
import { exportSystemApi, addAuditLogLocal } from "../services/apiClient";

interface SettingViewProps {
  categories: Category[];
  logs: AuditLog[];
  currentUser: User;
  budgets: Budget[];
  actuals: Actual[];
  appTheme: {
    primaryColor: string;
    fontSans: string;
    fontDisplay: string;
    themeName: string;
  };
  onChangeTheme: (theme: {
    primaryColor: string;
    fontSans: string;
    fontDisplay: string;
    themeName: string;
  }) => void;
  onAddCategory: (name: string) => Promise<boolean>;
  onEditCategory: (id: string, name: string, status: "Active" | "Inactive") => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onResetDatabase: () => Promise<boolean>;
  onImportDatabase: (importedDB: any) => Promise<boolean>;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function SettingView({
  categories,
  logs,
  currentUser,
  budgets,
  actuals,
  appTheme,
  onChangeTheme,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetDatabase,
  onImportDatabase,
  addToast
 }: SettingViewProps) {
  const isAdmin = currentUser.Role === UserRole.ADMIN;

  const [activeTab, setActiveTab] = useState<"categories" | "logs" | "system" | "sheets" | "appearance">("categories");

  // Category form states
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catStatus, setCatStatus] = useState<"Active" | "Inactive">("Active");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetCat, setDeleteTargetCat] = useState<Category | null>(null);

  // Log filter state
  const [logSearch, setLogSearch] = useState("");

  // SMTP Settings State
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);

  React.useEffect(() => {
    fetch("/api/smtp-config")
      .then(r => r.json())
      .then(d => {
        if (d) {
          setSmtpHost(d.host || "");
          setSmtpPort(String(d.port || 587));
          setSmtpUser(d.user || "");
          if (d.hasPass) setSmtpPass("••••••••");
        }
      })
      .catch(() => {});
  }, []);

  const handleTestSMTP = async () => {
    setSmtpTesting(true);
    try {
      const res = await fetch("/api/test-smtp", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || "Koneksi ke SMTP server BERHASIL!", "success");
      } else {
        addToast(data.error || "Uji koneksi SMTP gagal.", "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan koneksi server.", "error");
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleSaveSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpSaving(true);
    try {
      const res = await fetch("/api/smtp-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort) || 587,
          user: smtpUser,
          pass: smtpPass,
          enabled: true,
          userEmail: currentUser.Email,
          userName: currentUser.Name
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast("Konfigurasi SMTP Email berhasil disimpan!", "success");
        // Refetch config to ensure state is synchronized
        fetch("/api/smtp-config")
          .then(r => r.json())
          .then(d => {
            if (d) {
              setSmtpHost(d.host || "");
              setSmtpPort(String(d.port || 587));
              setSmtpUser(d.user || "");
              if (d.hasPass) setSmtpPass("••••••••");
            }
          })
          .catch(() => {});
      } else {
        addToast(data.error || "Gagal menyimpan konfigurasi SMTP.", "error");
      }
    } catch (e) {
      addToast("Terjadi kesalahan koneksi server.", "error");
    } finally {
      setSmtpSaving(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    return (
      log.Action.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.UserEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.UserName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.Category.toLowerCase().includes(logSearch.toLowerCase())
    );
  });

  const handleOpenAddCat = () => {
    if (!isAdmin) {
      addToast("Akses Ditolak! Hanya Administrator yang dapat merubah kategori budget.", "error");
      return;
    }
    setEditingCatId(null);
    setCatName("");
    setCatStatus("Active");
    setShowCatModal(true);
  };

  const handleOpenEditCat = (c: Category) => {
    if (!isAdmin) {
      addToast("Akses Ditolak! Hanya Administrator yang dapat merubah kategori budget.", "error");
      return;
    }
    setEditingCatId(c.CategoryID);
    setCatName(c.CategoryName);
    setCatStatus(c.Status);
    setShowCatModal(true);
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!catName || !catName.trim()) {
      addToast("Nama kategori tidak boleh kosong.", "error");
      return;
    }

    setSubmitting(true);
    try {
      let success = false;
      if (editingCatId) {
        success = await onEditCategory(editingCatId, catName.trim(), catStatus);
      } else {
        success = await onAddCategory(catName.trim());
      }
      if (success) {
        setShowCatModal(false);
      }
    } catch (err) {
      addToast("Terjadi kesalahan sistem.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportDB = async () => {
    try {
      addToast("Menyiapkan unduhan database...", "info");
      const exportData = await exportSystemApi();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `legal_budget_db_backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast("Database berhasil diunduh sebagai JSON!", "success");
    } catch (e) {
      addToast("Gagal mengunduh file backup database.", "error");
    }
  };

  const handleExportCSVTable = (tableName: "budgets" | "actuals" | "categories" | "auditLogs") => {
    try {
      addToast(`Menyiapkan unduhan data ${tableName}...`, "info");
      let headers: string[] = [];
      let rows: any[][] = [];
      let filename = `db_${tableName}.csv`;

      if (tableName === "budgets") {
        headers = [
          "BudgetID", "BudgetCode", "Year", "FiscalPeriod", "Category", 
          "Description", "BudgetAmount", "PIC", "Status", "CreatedDate"
        ];
        rows = budgets.map(b => [
          b.BudgetID,
          b.BudgetCode,
          b.Year,
          `April ${b.Year} - Maret ${b.Year + 1}`,
          b.Category,
          b.Description || "",
          b.BudgetAmount,
          b.PIC,
          b.Status,
          b.CreatedDate || ""
        ]);
      } else if (tableName === "actuals") {
        headers = [
          "ActualID", "TransactionDate", "BudgetID", "BudgetCode", "Category", 
          "Description", "ReferenceNumber", "Amount", "CreatedBy", "CreatedDate", 
          "Notes", "AttachmentName", "AttachmentType", "HasAttachment"
        ];
        rows = actuals.map(a => {
          const parentBudget = budgets.find(b => b.BudgetID === a.BudgetID);
          return [
            a.ActualID,
            a.TransactionDate,
            a.BudgetID,
            parentBudget ? parentBudget.BudgetCode : "N/A",
            a.Category,
            a.Description,
            a.ReferenceNumber || "",
            a.Amount,
            a.CreatedBy || "",
            a.CreatedDate || "",
            a.Notes || "",
            a.AttachmentName || "",
            a.AttachmentType || "",
            a.AttachmentData ? "TRUE" : "FALSE"
          ];
        });
      } else if (tableName === "categories") {
        headers = ["CategoryID", "CategoryName", "Status"];
        rows = categories.map(c => [
          c.CategoryID,
          c.CategoryName,
          c.Status
        ]);
      } else if (tableName === "auditLogs") {
        headers = ["LogID", "Timestamp", "UserEmail", "UserName", "Action", "Category"];
        rows = logs.map(l => [
          l.LogID,
          l.Timestamp,
          l.UserEmail,
          l.UserName,
          l.Action,
          l.Category
        ]);
      }

      // Generate CSV string with BOM for Excel compatibility
      const csvContent = "\uFEFF" + [
        headers.join(","),
        ...rows.map(e => e.map(val => {
          const stringVal = String(val === null || val === undefined ? "" : val);
          if (stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(`Tabel ${tableName} berhasil diunduh!`, "success");
    } catch (err) {
      console.error(err);
      addToast(`Gagal mengekspor tabel ${tableName}.`, "error");
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;
        const parsed = JSON.parse(text);
        
        // Quick verification of structure
        if (!parsed.users || !parsed.budgets || !parsed.actuals || !parsed.categories) {
          addToast("Format file JSON tidak valid. Pastikan skema database sesuai.", "error");
          return;
        }

        if (confirm("Apakah Anda yakin ingin menimpa database saat ini dengan data dari file backup ini?")) {
          const success = await onImportDatabase(parsed);
          if (success) {
            e.target.value = ""; // reset input
          }
        }
      } catch (err) {
        addToast("Gagal membaca file backup JSON. File rusak atau format tidak cocok.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Google Sheets integration states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [spreadsheetLink, setSpreadsheetLink] = useState<string>("");

  const handleConnectSheets = async () => {
    try {
      addToast("Menghubungkan akun Google...", "info");
      const result = await connectGoogleSheets();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        addToast(`Terhubung dengan Google sebagai ${result.user.email}!`, "success");
      }
    } catch (err: any) {
      addToast(err.message || "Gagal menghubungkan dengan Google Sheets.", "error");
    }
  };

  const handleDisconnectSheets = async () => {
    try {
      await disconnectGoogleSheets();
      setGoogleUser(null);
      setAccessToken("");
      setSpreadsheetLink("");
      addToast("Akun Google Sheets berhasil diputuskan.", "success");
    } catch (e) {
      addToast("Gagal memutuskan akun Google.", "error");
    }
  };

  const handleSyncToSheets = async () => {
    if (!accessToken) {
      addToast("Silakan hubungkan akun Google Anda terlebih dahulu.", "error");
      return;
    }

    setSyncLoading(true);
    addToast("Memulai sinkronisasi Google Sheets...", "info");
    try {
      // 1. Create a new spreadsheet
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          properties: {
            title: "Ajinomoto Legal Budget & Actuals FY 2026"
          },
          sheets: [
            { properties: { title: "Master Budget" } },
            { properties: { title: "Actual Transactions" } }
          ]
        })
      });

      if (!createRes.ok) {
        throw new Error("Gagal membuat Spreadsheet baru di Google Drive.");
      }

      const spreadsheet = await createRes.json();
      const spreadsheetId = spreadsheet.spreadsheetId;
      const sUrl = spreadsheet.spreadsheetUrl;

      // 2. Populate Master Budget data in sheet "Master Budget"
      const budgetValues = [
        ["Budget Code", "Category", "Year", "Description", "Budget Amount (IDR)", "PIC", "Status"],
        ...budgets.map(b => [b.BudgetCode, b.Category, b.Year, b.Description, b.BudgetAmount, b.PIC, b.Status])
      ];

      const populateBudgetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Master Budget'!A1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          range: "'Master Budget'!A1",
          majorDimension: "ROWS",
          values: budgetValues
        })
      });

      if (!populateBudgetRes.ok) {
        throw new Error("Gagal mengisikan data Master Budget.");
      }

      // 3. Populate Actual Transactions data in sheet "Actual Transactions"
      const actualValues = [
        ["Transaction Date", "Budget Code", "Category", "Description", "Reference Number", "Amount (IDR)", "Created By", "Notes"],
        ...actuals.map(a => {
          const b = budgets.find(bg => bg.BudgetID === a.BudgetID);
          return [a.TransactionDate, b ? b.BudgetCode : a.BudgetID, a.Category, a.Description, a.ReferenceNumber, a.Amount, a.CreatedBy, a.Notes || ""];
        })
      ];

      const populateActualRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Actual Transactions'!A1?valueInputOption=USER_ENTERED`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          range: "'Actual Transactions'!A1",
          majorDimension: "ROWS",
          values: actualValues
        })
      });

      if (!populateActualRes.ok) {
        throw new Error("Gagal mengisikan data pengeluaran rill.");
      }

      setSpreadsheetLink(sUrl);
      addToast("Sinkronisasi Google Sheets berhasil selesai!", "success");

      // Log the action to audit trail
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: currentUser.Email,
          userName: currentUser.Name,
          action: `Menyinkronkan database budget & actuals ke Google Sheets: "Ajinomoto Legal Budget & Actuals FY 2026"`,
          category: "SYSTEM"
        })
      }).catch(err => console.warn("Failed to create audit log:", err));

    } catch (err: any) {
      console.error(err);
      addToast(err.message || "Gagal menyinkronkan data ke Google Sheets.", "error");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    if (confirm("PERINGATAN KERAS! Anda akan menghapus seluruh database pengeluaran aktual dan memulihkan anggaran bawaan. Tindakan ini tidak dapat dibatalkan.\n\nApakah Anda yakin?")) {
      const secondConfirm = prompt("Harap ketik 'RESET AJINOMOTO' untuk mengonfirmasi tindakan pembersihan database:");
      if (secondConfirm === "RESET AJINOMOTO") {
        await onResetDatabase();
      } else {
        addToast("Reset dibatalkan. Konfirmasi tidak cocok.", "info");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-gray-800">Sistem Settings</h1>
          <p className="text-xs text-gray-500">Konfigurasi kategori beban hukum Legal, audit trail aktivitas, dan pemeliharaan database</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "categories"
              ? "border-brand-red text-brand-red font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
          }`}
        >
          Kategori Budget Legal
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "logs"
              ? "border-brand-red text-brand-red font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
          }`}
        >
          Audit Trail (Logs Aktivitas)
        </button>
        <button
          onClick={() => setActiveTab("sheets")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "sheets"
              ? "border-brand-red text-brand-red font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
          }`}
        >
          Integrasi Google Sheets
        </button>
        <button
          onClick={() => setActiveTab("appearance")}
          className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "appearance"
              ? "border-brand-red text-brand-red font-bold"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
          }`}
        >
          Kustomisasi Tampilan
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("system")}
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "system"
                ? "border-brand-red text-brand-red font-bold"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
            }`}
          >
            Pemeliharaan Sistem
          </button>
        )}
      </div>

      {/* Tab 1: Categories */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 font-display">Daftar Kategori Beban Hukum</h3>
              <p className="text-xs text-gray-400">Daftar aktivitas pengeluaran legal untuk pengelompokan budget</p>
            </div>
            
            {isAdmin ? (
              <button
                onClick={handleOpenAddCat}
                className="flex items-center space-x-1.5 bg-brand-red text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all self-start"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                <Lock className="w-3.5 h-3.5" />
                <span>Read-Only</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden max-w-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50">
                  <th className="py-2.5 px-4">Nama Kategori</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  {isAdmin && <th className="py-2.5 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((c) => (
                  <tr key={c.CategoryID} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-800">{c.CategoryName}</td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.Status === "Active" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-gray-100 text-gray-500 border border-gray-200"
                      }`}>
                        {c.Status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleOpenEditCat(c)}
                          className="p-1.5 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                          title="Ubah Kategori"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTargetCat(c)}
                          className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Logs / Audit Trail */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 font-display">System Audit Trail</h3>
              <p className="text-xs text-gray-400 font-sans">Semua catatan log masuk, modifikasi budget dasar, perekaman kuitansi claim dicatat otomatis oleh sistem demi keandalan data</p>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari log atau user..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase bg-gray-50/50 sticky top-0 z-10">
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Modul</th>
                    <th className="py-3 px-4">Email Pengguna</th>
                    <th className="py-3 px-4">Nama Pengguna</th>
                    <th className="py-3 px-4">Detail Tindakan (Action Log)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.LogID} className="hover:bg-gray-50/50 font-sans transition-colors duration-150">
                        <td className="py-2.5 px-4 font-mono text-gray-400 whitespace-nowrap text-[11px]">
                          {new Date(log.Timestamp).toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${
                            log.Category === "AUTH" ? "bg-blue-50 text-blue-700 border-blue-100" :
                            log.Category === "BUDGET" ? "bg-amber-50 text-amber-700 border-amber-100" :
                            log.Category === "ACTUAL" ? "bg-purple-50 text-purple-700 border-purple-100" :
                            log.Category === "CATEGORY" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                            "bg-gray-50 text-gray-700 border-gray-200"
                          }`}>
                            {log.Category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-gray-600 whitespace-nowrap text-[11px]">{log.UserEmail}</td>
                        <td className="py-2.5 px-4 text-gray-800 whitespace-nowrap text-[11px] font-semibold">{log.UserName}</td>
                        <td className="py-2.5 px-4 text-gray-700 text-[11px] font-medium leading-relaxed">{log.Action}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        Tidak ada log aktivitas audit trail yang cocok dengan kata kunci pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: System Maintenance */}
      {activeTab === "system" && isAdmin && (
        <div className="space-y-6 max-w-2xl">
          {/* Backup & Restore Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-start space-x-3 text-brand-dark">
              <Database className="w-6 h-6 shrink-0 text-brand-red mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-gray-800 font-display">Manajemen Database & Supabase Cloud</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                    Supabase Connected (gnlnrnifzvivqvfiuiaw)
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Seluruh data dijamin permanen dengan sinkronisasi otomatis ke cloud database <strong className="text-gray-700">Supabase PostgreSQL</strong> dan pencadangan lokal di <code className="bg-gray-100 px-1 py-0.5 rounded text-brand-red font-mono text-[10px]">src/db_store.json</code>.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed font-sans">
                Data Anda sekarang tersimpan secara permanen di database cloud Supabase dengan Project ID <code className="font-mono text-brand-red font-bold">gnlnrnifzvivqvfiuiaw</code>. Anda juga dapat mengekspor atau mengimpor cadangan database lokal melalui tombol berikut:
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleExportDB}
                  className="flex items-center space-x-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Database (Backup JSON)</span>
                </button>

                <label className="flex items-center space-x-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Impor Database (JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Relational CSV Database Export Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-start space-x-3 text-brand-dark">
              <FileSpreadsheet className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800 font-display">Pusat Ekspor Database CSV (Lengkap &amp; Relasional)</h3>
                <p className="text-xs text-gray-400">Unduh setiap lembar data secara detail dengan seluruh kolom kunci (ID relasional, timestamps, PIC, detail transaksi lengkap) untuk diolah sebagai database utuh di Excel atau diimpor ke software database eksternal.</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed font-sans">
                Silakan pilih tabel database yang ingin Anda ekspor secara terperinci:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => handleExportCSVTable("budgets")}
                  className="flex items-center justify-between bg-gray-50 hover:bg-emerald-50/50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 p-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>1. Tabel Master Budget ({budgets.length} baris)</span>
                  </span>
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleExportCSVTable("actuals")}
                  className="flex items-center justify-between bg-gray-50 hover:bg-emerald-50/50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 p-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>2. Tabel Realisasi Pengeluaran ({actuals.length} baris)</span>
                  </span>
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleExportCSVTable("categories")}
                  className="flex items-center justify-between bg-gray-50 hover:bg-emerald-50/50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 p-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>3. Tabel Kategori Beban ({categories.length} baris)</span>
                  </span>
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleExportCSVTable("auditLogs")}
                  className="flex items-center justify-between bg-gray-50 hover:bg-emerald-50/50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 p-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>4. Tabel Log Audit Trail ({logs.length} baris)</span>
                  </span>
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* SMTP Email Server Settings Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-start space-x-3 text-brand-dark">
              <Mail className="w-6 h-6 shrink-0 text-brand-red mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800 font-display">Konfigurasi Server Email (SMTP)</h3>
                <p className="text-xs text-gray-400">Atur kredensial SMTP server resmi atau Gmail App Password untuk pengiriman email otomatis laporan Executive Summary.</p>
              </div>
            </div>

            <form onSubmit={handleSaveSMTP} className="border-t border-gray-100 pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1">SMTP Host Server</label>
                  <input
                    type="text"
                    placeholder="e.g. smtp.gmail.com / smtp.office365.com"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1">SMTP Port</label>
                  <input
                    type="number"
                    placeholder="587 / 465"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1">Email Pengirim / Username</label>
                  <input
                    type="email"
                    placeholder="user@gmail.com / admin@ajinomoto.co.id"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-1">Password / App Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={smtpPass}
                    onChange={e => setSmtpPass(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] text-gray-400 font-sans">
                  *Untuk Office 365, gunakan host: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-700">smtp.office365.com</code> (port: 587).
                </p>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleTestSMTP}
                    disabled={smtpTesting}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    {smtpTesting ? (
                      <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 text-gray-600" />
                        <span>Uji Koneksi SMTP</span>
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={smtpSaving}
                    className="bg-brand-red hover:bg-red-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 flex items-center justify-center space-x-1.5"
                  >
                    {smtpSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Server SMTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm space-y-6">
            <div className="flex items-start space-x-3 text-red-600">
              <ShieldAlert className="w-6 h-6 shrink-0 text-brand-red mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800 font-display">Zona Bahaya (Danger Zone)</h3>
                <p className="text-xs text-gray-400">Tindakan berikut bersifat permanen dan berdampak langsung ke seluruh database sistem.</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-800">Kembalikan ke Database Awal (Reset & Seed Data)</p>
                <p className="text-[11px] text-gray-400 max-w-md">Menghapus seluruh transaksi pengeluaran rill yang pernah dicatat dan memulihkan daftar Kategori Default &amp; Master Budget Anggaran Dasar tahun 2026 PT Ajinomoto Indonesia &amp; PT Ajinex International.</p>
              </div>

              <button
                onClick={handleReset}
                className="flex items-center space-x-1.5 bg-red-50 hover:bg-brand-red border border-red-200 hover:border-brand-red text-brand-red hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Bersihkan Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Google Sheets Sync */}
      {activeTab === "sheets" && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-start space-x-3 text-brand-dark">
              <FileSpreadsheet className="w-6 h-6 shrink-0 text-green-600 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800 font-display">Integrasi Google Sheets</h3>
                <p className="text-xs text-gray-400">Sinkronisasikan data anggaran induk dan pengeluaran rill Anda secara langsung ke Google Spreadsheet baru.</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-5">
              {!googleUser ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 leading-relaxed font-sans">
                    Untuk memulai ekspor data secara real-time, silakan hubungkan sistem dengan akun Google Anda. Aplikasi ini akan membuat sebuah Spreadsheet baru yang terstruktur dengan dua lembar kerja (Master Budget &amp; Actual Transactions).
                  </p>

                  <button
                    onClick={handleConnectSheets}
                    className="flex items-center space-x-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 px-5 py-3 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Hubungkan dengan Akun Google</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Akun Google Terhubung</p>
                      <p className="text-xs font-bold text-gray-800">{googleUser.email}</p>
                    </div>

                    <button
                      onClick={handleDisconnectSheets}
                      className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Putus Koneksi</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSyncToSheets}
                      disabled={syncLoading}
                      className="flex items-center space-x-1.5 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {syncLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span>Sinkronkan Sekarang</span>
                    </button>
                  </div>
                </div>
              )}

              {spreadsheetLink && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-start space-x-2.5 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold">Sinkronisasi Selesai!</p>
                      <p className="text-[11px] text-emerald-600 leading-relaxed font-medium">
                        Spreadsheet Google Sheets baru bernama <code className="bg-white/60 px-1 py-0.5 rounded font-bold font-mono">Ajinomoto Legal Budget &amp; Actuals FY 2026</code> telah berhasil dibuat dalam Google Drive Anda.
                      </p>
                    </div>
                  </div>

                  <a
                    href={spreadsheetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-xs"
                  >
                    <span>Buka Google Sheets</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Appearance/Theme Customizer */}
      {activeTab === "appearance" && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6 animate-fade-in">
            <div className="flex items-start space-x-3 text-brand-dark">
              <Palette className="w-6 h-6 shrink-0 text-brand-red mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-800 font-display">Kustomisasi Tampilan</h3>
                <p className="text-xs text-gray-400">Sesuaikan tema warna utama dan tipografi aplikasi untuk pengalaman yang lebih elegan, minimalis, dan nyaman.</p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">Tema Pilihan (Presets)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Ajinomoto Corporate (Default)",
                    primary: "#E60012",
                    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                    display: '"Space Grotesk", sans-serif',
                    desc: "Kombinasi warna korporasi merah cerah dengan font tech-modern."
                  },
                  {
                    name: "Minimalist Forest",
                    primary: "#059669",
                    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                    display: '"Outfit", sans-serif',
                    desc: "Nuansa hijau alam yang menenangkan dengan font geometric modern."
                  },
                  {
                    name: "Deep Ocean Tech",
                    primary: "#0F52BA",
                    sans: '"Plus Jakarta Sans", sans-serif',
                    display: '"Plus Jakarta Sans", sans-serif',
                    desc: "Warna biru samudra profesional dengan font modern yang sangat rapi."
                  },
                  {
                    name: "Classic Prestige",
                    primary: "#374151",
                    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                    display: '"Playfair Display", serif',
                    desc: "Tampilan profesional abu-abu arang dengan font serif hukum yang prestisius."
                  },
                  {
                    name: "Royal Velvet",
                    primary: "#7C3AED",
                    sans: '"Plus Jakarta Sans", sans-serif',
                    display: '"Space Grotesk", sans-serif',
                    desc: "Ungu royal yang elegan dan artistik dengan font modern."
                  },
                  {
                    name: "Midnight Indigo",
                    primary: "#4F46E5",
                    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                    display: '"Outfit", sans-serif',
                    desc: "Warna indigo modern yang dinamis dan berenergi."
                  }
                ].map((preset) => {
                  const isSelected = appTheme.themeName === preset.name || 
                    (appTheme.primaryColor === preset.primary && appTheme.fontDisplay === preset.display);
                  
                  return (
                    <button
                      key={preset.name}
                      onClick={() => {
                        onChangeTheme({
                          primaryColor: preset.primary,
                          fontSans: preset.sans,
                          fontDisplay: preset.display,
                          themeName: preset.name
                        });
                        addToast(`Tema berhasil diubah menjadi "${preset.name}"!`, "success");
                      }}
                      className={`text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between h-40 ${
                        isSelected 
                          ? "border-brand-red bg-red-50/5 shadow-xs" 
                          : "border-gray-100 bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 line-clamp-1">{preset.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-brand-red shrink-0" />}
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed font-sans line-clamp-2">{preset.desc}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {/* Color Badge */}
                        <div className="flex items-center space-x-1.5">
                          <span 
                            className="w-4 h-4 rounded-full border border-white shadow-xs inline-block"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span className="text-[9px] font-mono font-bold text-gray-500 uppercase">{preset.primary}</span>
                        </div>

                        {/* Font Preview Indicator */}
                        <span className="text-[10px] bg-gray-50 border border-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">
                          {preset.display.split(",")[0].replace(/"/g, "")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Individual Pickers */}
            <div className="border-t border-gray-100 pt-5 space-y-5">
              <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">Kustomisasi Lanjutan (Manual)</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Custom Color Selector */}
                <div className="space-y-3 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Palette className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold font-display">Pilih Warna Utama</span>
                  </div>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {[
                      { name: "Ajinomoto Red", value: "#E60012" },
                      { name: "Sapphire Blue", value: "#0F52BA" },
                      { name: "Emerald Green", value: "#059669" },
                      { name: "Charcoal Minimalist", value: "#374151" },
                      { name: "Royal Purple", value: "#7C3AED" },
                      { name: "Indigo", value: "#4F46E5" },
                      { name: "Teal", value: "#0D9488" },
                      { name: "Rose Gold", value: "#BE185D" }
                    ].map((color) => {
                      const isActive = appTheme.primaryColor === color.value;
                      return (
                        <button
                          key={color.value}
                          onClick={() => {
                            onChangeTheme({
                              ...appTheme,
                              primaryColor: color.value,
                              themeName: "Kustom"
                            });
                          }}
                          className={`w-7 h-7 rounded-full border-2 transition-all relative cursor-pointer active:scale-95 ${
                            isActive ? "border-gray-800 scale-110 shadow-sm" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {isActive && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Font Selector */}
                <div className="space-y-3 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Type className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold font-display">Pilih Kombinasi Font</span>
                  </div>
                  <div className="space-y-2 pt-1">
                    {[
                      {
                        name: "Space Grotesk + Inter (Modern & Bold)",
                        sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                        display: '"Space Grotesk", sans-serif'
                      },
                      {
                        name: "Outfit (Sleek Geometric)",
                        sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                        display: '"Outfit", sans-serif'
                      },
                      {
                        name: "Plus Jakarta Sans (Sangat Bersih & Elegan)",
                        sans: '"Plus Jakarta Sans", sans-serif',
                        display: '"Plus Jakarta Sans", sans-serif'
                      },
                      {
                        name: "Playfair Display (Serif Klasik / Hukum)",
                        sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
                        display: '"Playfair Display", serif'
                      }
                    ].map((font) => {
                      const isActive = appTheme.fontDisplay === font.display;
                      return (
                        <button
                          key={font.name}
                          onClick={() => {
                            onChangeTheme({
                              ...appTheme,
                              fontSans: font.sans,
                              fontDisplay: font.display,
                              themeName: "Kustom"
                            });
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-between ${
                            isActive 
                              ? "border-brand-red bg-red-50/5 font-bold" 
                              : "border-gray-100 bg-white hover:border-gray-200"
                          }`}
                        >
                          <span>{font.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-brand-red" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {showCatModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm overflow-hidden transform scale-100 transition-all">
            <div className="flex justify-between items-center bg-gray-50 px-5 py-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-800 font-display uppercase tracking-wider">
                {editingCatId ? "Sunting Kategori" : "Tambah Kategori Baru"}
              </h3>
              <button onClick={() => setShowCatModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCatSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Legal Training"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-gray-800 font-medium"
                />
              </div>

              {editingCatId && (
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Status Kategori</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="catStatus"
                        value="Active"
                        checked={catStatus === "Active"}
                        onChange={() => setCatStatus("Active")}
                        className="text-brand-red focus:ring-brand-red"
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="catStatus"
                        value="Inactive"
                        checked={catStatus === "Inactive"}
                        onChange={() => setCatStatus("Inactive")}
                        className="text-brand-red focus:ring-brand-red"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end items-center space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-brand-red text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center space-x-1"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Simpan Kategori</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Category Confirmation Modal */}
      {deleteTargetCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-brand-red">
              <div className="p-2 bg-red-50 rounded-full">
                <ShieldAlert className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-bold font-display text-sm text-gray-800">Hapus Kategori Budget</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus kategori budget <span className="font-bold text-gray-800">"{deleteTargetCat.CategoryName}"</span>? 
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteTargetCat(null)}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const target = deleteTargetCat;
                  setDeleteTargetCat(null);
                  try {
                    await onDeleteCategory(target.CategoryID);
                  } catch (err) {
                    addToast("Terjadi kesalahan saat menghapus kategori.", "error");
                  }
                }}
                className="px-4 py-2 text-xs font-semibold bg-brand-red text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
