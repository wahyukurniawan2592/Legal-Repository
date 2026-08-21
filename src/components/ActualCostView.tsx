/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  UploadCloud, 
  X, 
  Paperclip, 
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Eye,
  Target
} from "lucide-react";
import { User, Budget, PlanBudget, Actual, Category } from "../types";

interface ActualCostViewProps {
  actuals: Actual[];
  budgets: Budget[];
  plans: PlanBudget[];
  categories: Category[];
  currentUser: User;
  onAddActual: (a: Partial<Actual>) => Promise<boolean>;
  onEditActual: (id: string, a: Partial<Actual>) => Promise<boolean>;
  onDeleteActual: (id: string) => Promise<boolean>;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function ActualCostView({
  actuals,
  budgets,
  plans,
  categories,
  currentUser,
  onAddActual,
  onEditActual,
  onDeleteActual,
  addToast
}: ActualCostViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");
  const [filterYear, setFilterYear] = useState("2026");
  const [filterBudgetId, setFilterBudgetId] = useState("All");

  // Fiscal Year Helper (April - March)
  const getFiscalYear = (dateStr?: string) => {
    if (!dateStr || dateStr.length < 7) return "";
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(5, 7), 10);
    if (isNaN(year) || isNaN(month)) return "";
    return month >= 4 ? year.toString() : (year - 1).toString();
  };

  const MONTH_LIST = [
    { code: "All", name: "Semua Bulan (Apr - Mar)", short: "Semua" },
    { code: "04", name: "April (M01 FY)", short: "Apr" },
    { code: "05", name: "Mei (M02 FY)", short: "Mei" },
    { code: "06", name: "Juni (M03 FY)", short: "Jun" },
    { code: "07", name: "Juli (M04 FY)", short: "Jul" },
    { code: "08", name: "Agustus (M05 FY)", short: "Agu" },
    { code: "09", name: "September (M06 FY)", short: "Sep" },
    { code: "10", name: "Oktober (M07 FY)", short: "Okt" },
    { code: "11", name: "November (M08 FY)", short: "Nov" },
    { code: "12", name: "Desember (M09 FY)", short: "Des" },
    { code: "01", name: "Januari (M10 FY)", short: "Jan" },
    { code: "02", name: "Februari (M11 FY)", short: "Feb" },
    { code: "03", name: "Maret (M12 FY)", short: "Mar" }
  ];

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Actual | null>(null);

  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formBudgetId, setFormBudgetId] = useState("");
  const [formPlanId, setFormPlanId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRefNumber, setFormRefNumber] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  
  // File upload states
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);

  // Preview attachment modal state
  const [previewAttachment, setPreviewAttachment] = useState<{ name: string; data: string; type: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (previewAttachment) {
      let url = previewAttachment.data;
      if (url.startsWith("data:")) {
        try {
          const parts = url.split(";base64,");
          if (parts.length === 2) {
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: previewAttachment.type });
            const bUrl = URL.createObjectURL(blob);
            setPreviewBlobUrl(bUrl);
            return () => {
              URL.revokeObjectURL(bUrl);
            };
          }
        } catch (e) {
          console.error("Error converting data url to blob url", e);
        }
      }
      setPreviewBlobUrl(url);
    } else {
      setPreviewBlobUrl(null);
    }
  }, [previewAttachment]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Filter budgets to only active ones for mapping
  const activeBudgets = budgets.filter(b => b.Status === "Active");

  // Get selected budget info for real-time calculations
  const selectedBudget = budgets.find(b => b.BudgetID === formBudgetId);

  // Available plans for selected budget
  const availablePlans = plans.filter(p => p.BudgetID === formBudgetId);
  const selectedPlan = plans.find(p => p.PlanID === formPlanId);

  // Calculate real-time stats for selected Master Budget and Plan Budget
  const getSelectedStats = () => {
    if (!selectedBudget) return null;
    
    // Expenses on Master Budget
    const masterExpenses = actuals
      .filter(a => a.BudgetID === selectedBudget.BudgetID && a.ActualID !== editingId)
      .reduce((sum, a) => sum + a.Amount, 0);
      
    const currentInputAmount = Number(formAmount) || 0;
    const masterProjectedTotal = masterExpenses + currentInputAmount;
    const masterRemaining = selectedBudget.BudgetAmount - masterProjectedTotal;

    // Expenses on Plan Budget (if selected)
    let planStats = null;
    if (selectedPlan) {
      const planExpenses = actuals
        .filter(a => a.PlanID === selectedPlan.PlanID && a.ActualID !== editingId)
        .reduce((sum, a) => sum + a.Amount, 0);
      const planProjectedTotal = planExpenses + currentInputAmount;
      const planRemaining = selectedPlan.PlannedAmount - planProjectedTotal;
      planStats = {
        planCode: selectedPlan.PlanCode,
        title: selectedPlan.Title,
        limit: selectedPlan.PlannedAmount,
        spentAlready: planExpenses,
        projectedTotal: planProjectedTotal,
        remaining: planRemaining
      };
    }
    
    return {
      masterLimit: selectedBudget.BudgetAmount,
      masterSpent: masterExpenses,
      masterProjectedTotal,
      masterRemaining,
      planStats
    };
  };

  const selectedStats = getSelectedStats();

  // Search, filter & list
  const filteredActuals = actuals.filter(a => {
    const parentBudget = budgets.find(b => b.BudgetID === a.BudgetID);
    const parentPlan = plans.find(p => p.PlanID === a.PlanID);
    const bCode = parentBudget ? parentBudget.BudgetCode : "";
    const pCode = parentPlan ? parentPlan.PlanCode : "";
    const pTitle = parentPlan ? parentPlan.Title : "";

    const matchesSearch = 
      bCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.Description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.Category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.ReferenceNumber && a.ReferenceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = filterCategory === "All" || a.Category.toLowerCase() === filterCategory.toLowerCase();
    const matchesBudget = filterBudgetId === "All" || a.BudgetID === filterBudgetId;

    const actualMonth = a.TransactionDate ? a.TransactionDate.slice(5, 7) : "";
    const actualFY = getFiscalYear(a.TransactionDate);

    const matchesMonth = filterMonth === "All" || actualMonth === filterMonth;
    const matchesYear = filterYear === "All" || actualFY === filterYear;

    return matchesSearch && matchesCategory && matchesBudget && matchesMonth && matchesYear;
  });

  // Dynamic KPI Metrics for filtered actuals
  const totalActualAmount = filteredActuals.reduce((sum, a) => sum + a.Amount, 0);
  const totalActualCount = filteredActuals.length;
  const avgActualAmount = totalActualCount > 0 ? totalActualAmount / totalActualCount : 0;

  // Handle Drag & Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    const sizeLimit = 10 * 1024 * 1024; // 10MB
    if (file.size > sizeLimit) {
      addToast("File terlalu besar. Batas maksimal ukuran file adalah 10MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
      setFileName(file.name);
      setFileType(file.type);
      addToast(`File ${file.name} berhasil dimuat!`, "success");
    };
    reader.onerror = () => {
      addToast("Gagal membaca file.", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().split("T")[0]);
    const defaultBudget = activeBudgets[0];
    const defaultBudgetId = defaultBudget ? defaultBudget.BudgetID : "";
    const plansForDefault = plans.filter(p => p.BudgetID === defaultBudgetId);
    
    setFormBudgetId(defaultBudgetId);
    setFormPlanId(plansForDefault[0]?.PlanID || "");
    setFormDescription("");
    setFormRefNumber("");
    setFormAmount("");
    setFormNotes("");
    setFileBase64(null);
    setFileName(null);
    setFileType(null);
    setShowModal(true);
  };

  const handleOpenEdit = (a: Actual) => {
    setEditingId(a.ActualID);
    setFormDate(a.TransactionDate);
    setFormBudgetId(a.BudgetID);
    setFormPlanId(a.PlanID || "");
    setFormDescription(a.Description);
    setFormRefNumber(a.ReferenceNumber || "");
    setFormAmount(a.Amount.toString());
    setFormNotes(a.Notes || "");
    setFileBase64(a.AttachmentData || null);
    setFileName(a.AttachmentName || null);
    setFileType(a.AttachmentType || null);
    setShowModal(true);
  };

  const handleBudgetChange = (budgetId: string) => {
    setFormBudgetId(budgetId);
    const plansForBudget = plans.filter(p => p.BudgetID === budgetId);
    setFormPlanId(plansForBudget[0]?.PlanID || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDate || !formBudgetId || !formDescription || !formAmount) {
      addToast("Harap isi semua field wajib yang ditandai (*)", "error");
      return;
    }

    const amountNum = Number(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast("Nominal realisasi pengeluaran harus berupa angka positif.", "error");
      return;
    }

    const parentBudget = budgets.find(b => b.BudgetID === formBudgetId);
    if (!parentBudget) {
      addToast("Sistem mendeteksi Master Budget tidak valid.", "error");
      return;
    }

    setSubmitting(true);
    const actualData: Partial<Actual> = {
      TransactionDate: formDate,
      BudgetID: formBudgetId,
      PlanID: formPlanId || undefined,
      Category: parentBudget.Category,
      Description: formDescription.trim(),
      ReferenceNumber: formRefNumber.trim() || undefined,
      Amount: amountNum,
      AttachmentName: fileName || undefined,
      AttachmentData: fileBase64 || undefined,
      AttachmentType: fileType || undefined,
      Notes: formNotes.trim() || undefined,
      CreatedBy: currentUser.Name
    };

    try {
      let success = false;
      if (editingId) {
        success = await onEditActual(editingId, actualData);
      } else {
        success = await onAddActual(actualData);
      }
      if (success) {
        setShowModal(false);
      }
    } catch (err) {
      addToast("Terjadi kesalahan koneksi sistem.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-gray-800">Actual Cost (Realisasi Pengeluaran)</h1>
          <p className="text-xs text-gray-500">Pencatatan transaksi realisasi pengeluaran yang secara otomatis mengurangi saldo Plan Budget dan Master Budget</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all self-start shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Input Pengeluaran Baru</span>
        </button>
      </div>

      {/* Distinction Banner: Master Budget vs Plan Budget vs Actual Cost */}
      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-800 shadow-3xs">
        <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
          <AlertCircle className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-amber-900">Koneksi Realisasi ke Plan Budget & Master Budget</p>
          <p className="leading-relaxed">
            Mencatat pengeluaran rill di sini akan <strong>secara otomatis mengurangi saldo Plan Budget</strong> yang Anda pilih, sekaligus mengurangi saldo <strong>Master Budget</strong> induknya.
          </p>
        </div>
      </div>

      {/* KPI Cards Summary for Filtered Actual Costs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-mono font-semibold uppercase">Total Realisasi Terfilter</span>
            <h3 className="text-xl font-display font-bold text-brand-red">{formatRupiah(totalActualAmount)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">{totalActualCount} transaksi dicatat</p>
          </div>
          <div className="p-2.5 bg-red-50 text-brand-red rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-mono font-semibold uppercase">Jumlah Transaksi</span>
            <h3 className="text-xl font-display font-bold text-gray-800">{totalActualCount} Transaksi</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Sesuai filter periode & kategori</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-mono font-semibold uppercase">Rata-rata Nominal / Transaksi</span>
            <h3 className="text-xl font-display font-bold text-gray-800">{formatRupiah(avgActualAmount)}</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Nilai rata-rata pengeluaran</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Searching & Multi Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari transaksi berdasarkan Plan Code, Master Budget, Deskripsi, No Invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-brand-red focus:outline-none transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filter Fiscal Year */}
            <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="All">Semua Fiscal Year</option>
                <option value="2025">FY 2025 (Apr 2025 - Mar 2026)</option>
                <option value="2026">FY 2026 (Apr 2026 - Mar 2027)</option>
                <option value="2027">FY 2027 (Apr 2027 - Mar 2028)</option>
              </select>
            </div>

            {/* Filter Bulan */}
            <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-red" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                {MONTH_LIST.map(m => (
                  <option key={m.code} value={m.code}>
                    {m.code === "All" ? "Semua Bulan (Apr - Mar)" : `Bulan: ${m.name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Master Budget */}
            <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] text-gray-400 font-mono">Budget:</span>
              <select
                value={filterBudgetId}
                onChange={(e) => setFilterBudgetId(e.target.value)}
                className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="All">Semua Budget</option>
                {budgets.map(b => (
                  <option key={b.BudgetID} value={b.BudgetID}>{b.BudgetCode} - {b.Category}</option>
                ))}
              </select>
            </div>

            {/* Filter Kategori */}
            <div className="flex items-center space-x-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] text-gray-400 font-mono">Kategori:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="All">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Month Filter Pills Bar (FY Order: Apr - Mar) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar border-t border-gray-100">
          <span className="text-[11px] font-mono text-gray-400 font-semibold uppercase pr-1 shrink-0 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-brand-red" />
            <span>Bulan Realisasi (FY):</span>
          </span>
          {MONTH_LIST.map((m) => {
            const count = actuals.filter(a => {
              const mMatch = m.code === "All" || (a.TransactionDate && a.TransactionDate.slice(5, 7) === m.code);
              const aFY = getFiscalYear(a.TransactionDate);
              const yMatch = filterYear === "All" || aFY === filterYear;
              return mMatch && yMatch;
            }).length;

            const isActive = filterMonth === m.code;

            return (
              <button
                key={m.code}
                onClick={() => setFilterMonth(m.code)}
                className={`px-3 py-1 rounded-xl font-medium transition-all text-xs flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-brand-red text-white font-bold shadow-xs scale-102"
                    : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-600"
                }`}
              >
                <span>{m.short}</span>
                {m.code !== "All" && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : count > 0 ? "bg-red-100 text-brand-red" : "bg-gray-200 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Filter Summary Banner */}
        {(filterMonth !== "All" || filterYear !== "All" || filterBudgetId !== "All" || filterCategory !== "All" || searchTerm) && (
          <div className="flex flex-wrap items-center justify-between bg-red-50/70 border border-red-200/70 px-3.5 py-2 rounded-xl text-xs text-brand-dark gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-brand-red shrink-0" />
              <span>
                Filter Terpasang: <strong>{filteredActuals.length} Transaksi Realisasi</strong> ditemukan
                {filterMonth !== "All" && ` untuk ${MONTH_LIST.find(m => m.code === filterMonth)?.name}`}
                {filterYear !== "All" && ` (FY ${filterYear}: Apr ${filterYear} - Mar ${parseInt(filterYear) + 1})`}.
                Total Pengeluaran Realisasi: <strong className="text-brand-red font-mono font-bold">{formatRupiah(totalActualAmount)}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setFilterMonth("All");
                setFilterYear("All");
                setFilterBudgetId("All");
                setFilterCategory("All");
                setSearchTerm("");
              }}
              className="text-brand-red font-bold underline text-[11px] hover:text-red-900 shrink-0 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Master Budget</th>
                <th className="py-3 px-4">Alokasi Plan Budget</th>
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Deskripsi Realisasi</th>
                <th className="py-3 px-4 text-right">Nominal Realisasi</th>
                <th className="py-3 px-4 text-center">Lampiran</th>
                <th className="py-3 px-4">Pencatat</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredActuals.length > 0 ? (
                filteredActuals.map((a) => {
                  const master = budgets.find(b => b.BudgetID === a.BudgetID);
                  const planItem = plans.find(p => p.PlanID === a.PlanID);
                  
                  return (
                    <tr key={a.ActualID} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap">{a.TransactionDate}</td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-dark whitespace-nowrap">
                        {master ? (
                          <div>
                            <span>{master.BudgetCode}</span>
                            <span className="block text-[10px] text-gray-400 font-normal">{master.Category}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      
                      {/* Linked Plan Budget */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {planItem ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
                              <Target className="w-3 h-3 text-amber-600" />
                              <span>{planItem.PlanCode}</span>
                            </span>
                            <p className="text-[10px] text-gray-600 font-medium max-w-[180px] truncate">{planItem.Title}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Langsung Master Budget</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap">{a.ReferenceNumber || "-"}</td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate" title={a.Description}>
                        <div className="font-semibold text-gray-800">{a.Description}</div>
                        {a.Notes && <div className="text-[10px] text-gray-400 italic mt-0.5">{a.Notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-brand-red font-mono text-sm whitespace-nowrap">
                        {formatRupiah(a.Amount)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {a.AttachmentName ? (
                          <button
                            onClick={() => setPreviewAttachment({
                              name: a.AttachmentName!,
                              data: a.AttachmentData!,
                              type: a.AttachmentType || "image/png"
                            })}
                            className="inline-flex items-center space-x-1 text-brand-red hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors border border-red-100"
                            title="Pratinjau Bukti"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="max-w-[70px] truncate">{a.AttachmentName}</span>
                          </button>
                        ) : (
                          <span className="text-gray-300 text-[10px] italic">Tidak ada</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{a.CreatedBy}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(a)}
                            className="p-1.5 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Tidak ditemukan catatan pengeluaran realisasi yang sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Input Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-3 sm:p-6 animate-fade-in backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-3xl lg:max-w-4xl my-auto overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            {/* Header (Sticky Top) */}
            <div className="flex justify-between items-center bg-gray-50 px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-gray-800 font-display">
                  {editingId ? "Ubah Pencatatan Pengeluaran Realisasi" : "Form Input Realisasi Pengeluaran Baru"}
                </h3>
                <p className="text-[10px] text-gray-500">Pencatatan realisasi claim, tagihan, dan kuitansi divisi Legal</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowModal(false)} 
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form Container */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-w-0">
                  
                  {/* Form Inputs (Left Side) */}
                  <div className="space-y-3.5 min-w-0">
                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Tanggal Transaksi *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          required
                          value={formDate}
                          onChange={(e) => setFormDate(e.target.value)}
                          className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono bg-white"
                        />
                      </div>
                    </div>

                    {/* Budget ID Parent Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Master Budget Pengampu *</label>
                      <select
                        value={formBudgetId}
                        onChange={(e) => handleBudgetChange(e.target.value)}
                        className="w-full min-w-0 truncate text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white cursor-pointer font-medium"
                      >
                        {activeBudgets.map(b => (
                          <option key={b.BudgetID} value={b.BudgetID}>
                            {b.BudgetCode} - {b.Category} ({b.PIC})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Connected Plan Budget Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">
                        Target Plan Budget (Rencana Terhubung)
                      </label>
                      <select
                        value={formPlanId}
                        onChange={(e) => setFormPlanId(e.target.value)}
                        className="w-full min-w-0 truncate text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white cursor-pointer font-medium"
                      >
                        <option value="">-- Tanpa Plan (Langsung Master Budget) --</option>
                        {availablePlans.map(p => (
                          <option key={p.PlanID} value={p.PlanID}>
                            {p.PlanCode} - {p.Title} ({formatRupiah(p.PlannedAmount)})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">Sisa budget plan ini akan otomatis terpotong</p>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Nominal Realisasi Pengeluaran (Rp) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-semibold text-gray-400">Rp</span>
                        <input
                          type="text"
                          required
                          placeholder="Masukan angka saja"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ""))}
                          className="w-full text-xs pl-8 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono font-bold text-gray-800 bg-white"
                        />
                      </div>
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">No. Invoice / Kuitansi (Opsional)</label>
                      <input
                        type="text"
                        placeholder="e.g. INV/X/AJI/2026"
                        value={formRefNumber}
                        onChange={(e) => setFormRefNumber(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono bg-white"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Deskripsi Transaksi Realisasi *</label>
                      <textarea
                        required
                        placeholder="Keperluan pembayaran rill..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red h-16 resize-none bg-white"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1">Catatan Tambahan (Opsional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Disetujui Head of Legal"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white"
                      />
                    </div>
                  </div>

                  {/* Real-time Budget Calculator & Attachment Upload (Right Side) */}
                  <div className="space-y-4 flex flex-col min-w-0">
                    {/* Live Budget Monitoring Panel */}
                    {selectedStats && (
                      <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-800">
                          <Clock className="w-4 h-4 text-brand-red" />
                          <span>Kalkulator Pemotongan Budget</span>
                        </div>
                        
                        <div className="space-y-1.5 text-[11px]">
                          {/* Master Budget Status */}
                          <div className="flex justify-between">
                            <span className="text-gray-500">Plafon Master Budget:</span>
                            <span className="font-mono font-semibold text-gray-800">{formatRupiah(selectedStats.masterLimit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Master Budget Terpakai:</span>
                            <span className="font-mono font-semibold text-gray-800">{formatRupiah(selectedStats.masterSpent)}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
                            <span className="text-gray-700">Sisa Master Budget:</span>
                            <span className={`font-mono ${selectedStats.masterRemaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
                              {formatRupiah(selectedStats.masterRemaining)}
                            </span>
                          </div>

                          {/* Plan Budget Status if linked */}
                          {selectedStats.planStats ? (
                            <div className="mt-2.5 pt-2 border-t border-dashed border-amber-200 bg-amber-50/70 p-2.5 rounded-xl space-y-1">
                              <div className="flex items-center space-x-1 text-amber-900 font-bold">
                                <Target className="w-3.5 h-3.5 text-amber-600" />
                                <span>Plan: {selectedStats.planStats.planCode}</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-amber-800">Target Plan:</span>
                                <span className="font-mono font-bold text-amber-900">{formatRupiah(selectedStats.planStats.limit)}</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-amber-800">Total Terpakai:</span>
                                <span className="font-mono text-amber-900">{formatRupiah(selectedStats.planStats.projectedTotal)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] font-bold border-t border-amber-200 pt-1">
                                <span className="text-amber-900">Sisa Plan Anggaran:</span>
                                <span className={`font-mono ${selectedStats.planStats.remaining < 0 ? "text-red-600" : "text-emerald-800"}`}>
                                  {formatRupiah(selectedStats.planStats.remaining)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 italic mt-1.5">
                              * Belum menghubungkan transaksi ini ke Plan Budget khusus.
                            </div>
                          )}
                        </div>

                        {/* Warning if over limit */}
                        {(selectedStats.masterRemaining < 0 || (selectedStats.planStats && selectedStats.planStats.remaining < 0)) && (
                          <div className="bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-start space-x-1.5 text-[10px] text-red-700">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                            <p><strong>Peringatan Defisit!</strong> Nominal transaksi melebihi sisa alokasi anggaran yang tersedia.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Drag-and-Drop File Upload Area */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Bukti Lampiran (PDF / Gambar) *</label>
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                          dragActive 
                            ? "border-brand-red bg-red-50/50" 
                            : "border-gray-200 hover:border-brand-dark hover:bg-gray-50/50"
                        }`}
                      >
                        <input 
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/png, image/jpeg, application/pdf"
                          className="hidden"
                        />
                        
                        {fileName ? (
                          <div className="space-y-2">
                            <div className="p-2.5 bg-red-50 text-brand-red rounded-xl inline-block border border-red-100">
                              <Paperclip className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-gray-700 max-w-[220px] truncate">{fileName}</p>
                              <p className="text-[9px] text-gray-400 uppercase">{fileType?.split("/")[1] || "File"}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileBase64(null);
                                setFileName(null);
                                setFileType(null);
                              }}
                              className="text-[10px] text-red-500 font-semibold hover:underline cursor-pointer"
                            >
                              Hapus File
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl inline-block group-hover:bg-white transition-colors">
                              <UploadCloud className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-gray-600">Seret & letakan bukti kuitansi di sini</p>
                              <p className="text-[10px] text-gray-400">Atau klik untuk memilih file dari komputer</p>
                            </div>
                            <p className="text-[9px] text-gray-400">Mendukung PDF, PNG, JPG (Maks. 10MB)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons (Sticky Footer) */}
              <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-100 flex justify-end items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-white hover:text-gray-800 text-gray-600 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold bg-brand-red text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>{editingId ? "Update Transaksi" : "Simpan Realisasi"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center bg-gray-50 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-gray-800">
                <FileText className="w-4 h-4 text-brand-red" />
                <span className="text-xs font-bold font-display truncate max-w-[400px]">{previewAttachment.name}</span>
              </div>
              <button 
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            <div className="flex-1 bg-gray-100 overflow-auto p-4 flex items-center justify-center min-h-[350px]">
              {previewAttachment.type.startsWith("image/") ? (
                <img 
                  src={previewAttachment.data} 
                  alt={previewAttachment.name} 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (previewAttachment.type === "application/pdf" || previewAttachment.name.toLowerCase().endsWith(".pdf")) && previewBlobUrl ? (
                <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-gray-100 max-w-md w-full mx-auto my-4">
                  <div className="w-16 h-16 bg-red-50 text-brand-red rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <FileText className="w-8 h-8 text-brand-red" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1 truncate px-2">{previewAttachment.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-3">
                    Dokumen PDF
                  </p>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed px-4">
                    Demi keamanan dan pratinjau interaktif penuh (cetak, perbesar, cari), silakan buka dokumen PDF ini di tab baru atau unduh langsung.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={previewBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-bold text-white bg-brand-dark hover:bg-black active:scale-95 transition-all px-5 py-2.5 rounded-xl shadow-xs cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Buka Pratinjau PDF</span>
                    </a>
                    <a
                      href={previewBlobUrl}
                      download={previewAttachment.name}
                      className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-bold text-white bg-brand-red hover:bg-red-700 active:scale-95 transition-all px-5 py-2.5 rounded-xl shadow-xs cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>Unduh File PDF</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-gray-100 max-w-md w-full mx-auto">
                  <div className="w-16 h-16 bg-red-50 text-brand-red rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 mb-1 truncate px-2">{previewAttachment.name}</h4>
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-3">
                    {previewAttachment.type || "Aplikasi Dokumen"}
                  </p>
                  <p className="text-xs text-gray-500 mb-5 leading-relaxed px-4">
                    Dokumen ini dapat diunduh secara langsung untuk dibuka menggunakan aplikasi pembaca dokumen di perangkat Anda.
                  </p>
                  <a
                    href={previewAttachment.data}
                    download={previewAttachment.name}
                    className="inline-flex items-center justify-center space-x-2 text-xs font-bold text-white bg-brand-red hover:bg-red-700 active:scale-95 transition-all px-5 py-2.5 rounded-xl shadow-sm hover:shadow cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>Unduh Dokumen Lampiran</span>
                  </a>
                </div>
              )}
            </div>
            
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 text-xs font-semibold bg-brand-dark text-white rounded-xl hover:bg-black transition-colors cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-brand-red">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-bold font-display text-sm text-gray-800">Hapus Realisasi Pengeluaran</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan pengeluaran senilai <span className="font-bold text-gray-800 font-mono">Rp {deleteTarget.Amount.toLocaleString("id-ID")}</span> ({deleteTarget.Description || "Tanpa Deskripsi"})? 
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  await onDeleteActual(target.ActualID);
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
