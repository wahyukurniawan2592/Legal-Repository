/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Lock, 
  X, 
  Info,
  Calendar,
  AlertCircle,
  TrendingUp,
  PieChart,
  BarChart2,
  CheckCircle2,
  FileText
} from "lucide-react";
import { User, Budget, BudgetStatus, Category, UserRole, PlanBudget, Actual } from "../types";

interface MasterBudgetViewProps {
  budgets: Budget[];
  plans?: PlanBudget[];
  actuals?: Actual[];
  categories: Category[];
  currentUser: User;
  onAddBudget: (b: Partial<Budget>) => Promise<boolean>;
  onEditBudget: (id: string, b: Partial<Budget>) => Promise<boolean>;
  onDeleteBudget: (id: string) => Promise<boolean>;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
  activeCompany?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International";
}

export default function MasterBudgetView({
  budgets,
  plans = [],
  actuals = [],
  categories,
  currentUser,
  onAddBudget,
  onEditBudget,
  onDeleteBudget,
  addToast,
  activeCompany = "ALL"
}: MasterBudgetViewProps) {
  const getCompanyDisplayName = (comp?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International") => {
    if (comp === "PT Ajinomoto Indonesia") return "PT Ajinomoto Indonesia";
    if (comp === "PT Ajinex International") return "PT Ajinex International";
    return "PT Ajinomoto Indonesia & PT Ajinex International";
  };

  const isAdmin = currentUser.Role === UserRole.ADMIN;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  
  // Date Range Fiscal Year (Default: 30 Maret 2025 s/d 01 April 2026 or current year)
  const currentYear = new Date().getFullYear();
  const [formStartDate, setFormStartDate] = useState<string>(`${currentYear}-03-30`);
  const [formEndDate, setFormEndDate] = useState<string>(`${currentYear + 1}-04-01`);
  
  const [formCode, setFormCode] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formPic, setFormPic] = useState("");
  const [formStatus, setFormStatus] = useState<BudgetStatus>(BudgetStatus.ACTIVE);
  const [submitting, setSubmitting] = useState(false);

  // Search, filter & sort
  const years = Array.from(new Set(budgets.map(b => b.Year))).sort((a, b) => b - a);
  
  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = 
      b.BudgetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.Category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.Description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.PIC.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesYear = filterYear === "All" || b.Year.toString() === filterYear;
    const matchesCategory = filterCategory === "All" || b.Category.toLowerCase() === filterCategory.toLowerCase();
    
    return matchesSearch && matchesYear && matchesCategory;
  });

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const handleOpenAdd = () => {
    if (!isAdmin) {
      addToast("Akses Ditolak! Hanya Administrator yang dapat merancang Master Budget.", "error");
      return;
    }
    const year = new Date().getFullYear();
    setEditingId(null);
    setFormStartDate(`${year}-03-30`);
    setFormEndDate(`${year + 1}-04-01`);
    setFormCode("");
    setFormCategory("");
    setFormDescription("");
    setFormAmount("");
    setFormPic(currentUser.Name);
    setFormStatus(BudgetStatus.ACTIVE);
    setShowModal(true);
  };

  const handleOpenEdit = (b: Budget) => {
    if (!isAdmin) {
      addToast("Akses Ditolak! Hanya Administrator yang dapat merubah Master Budget.", "error");
      return;
    }
    setEditingId(b.BudgetID);
    setFormStartDate(b.StartDate || `${b.Year}-03-30`);
    setFormEndDate(b.EndDate || `${b.Year + 1}-04-01`);
    setFormCode(b.BudgetCode);
    setFormCategory(b.Category);
    setFormDescription(b.Description);
    setFormAmount(b.BudgetAmount.toString());
    setFormPic(b.PIC);
    setFormStatus(b.Status);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!formCode.trim() || !formCategory.trim() || !formAmount || !formPic.trim() || !formStartDate || !formEndDate) {
      addToast("Harap lengkapi semua field yang wajib (*)", "error");
      return;
    }

    if (isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      addToast("Nominal budget harus berupa angka positif.", "error");
      return;
    }

    setSubmitting(true);
    const startYear = new Date(formStartDate).getFullYear() || currentYear;

    const budgetData: Partial<Budget> = {
      Year: startYear,
      StartDate: formStartDate,
      EndDate: formEndDate,
      BudgetCode: formCode.trim(),
      Category: formCategory.trim(),
      Description: formDescription.trim(),
      BudgetAmount: Number(formAmount),
      PIC: formPic.trim(),
      Status: formStatus
    };

    try {
      let success = false;
      if (editingId) {
        success = await onEditBudget(editingId, budgetData);
      } else {
        success = await onAddBudget(budgetData);
      }
      if (success) {
        setShowModal(false);
      }
    } catch (err) {
      addToast("Terjadi kesalahan sistem.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculation helper for plan & actual absorption per budget
  const getBudgetStats = (budgetId: string, amount: number) => {
    const budgetPlans = plans.filter(p => p.BudgetID === budgetId);
    const budgetActuals = actuals.filter(a => a.BudgetID === budgetId);

    const totalPlanned = budgetPlans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);
    const totalActual = budgetActuals.reduce((sum, a) => sum + (a.Amount || 0), 0);

    const planPercent = amount > 0 ? (totalPlanned / amount) * 100 : 0;
    const actualPercent = amount > 0 ? (totalActual / amount) * 100 : 0;
    const sisa = amount - totalActual;

    return {
      planCount: budgetPlans.length,
      totalPlanned,
      planPercent,
      actualCount: budgetActuals.length,
      totalActual,
      actualPercent,
      sisa
    };
  };

  // Grand total calculations for KPI summary cards
  const totalPlafonGlobal = filteredBudgets.reduce((sum, b) => sum + b.BudgetAmount, 0);
  const totalPlanGlobal = filteredBudgets.reduce((sum, b) => {
    const bPlans = plans.filter(p => p.BudgetID === b.BudgetID);
    return sum + bPlans.reduce((acc, p) => acc + (p.PlannedAmount || 0), 0);
  }, 0);
  const totalActualGlobal = filteredBudgets.reduce((sum, b) => {
    const bActuals = actuals.filter(a => a.BudgetID === b.BudgetID);
    return sum + bActuals.reduce((acc, a) => acc + (a.Amount || 0), 0);
  }, 0);
  const overallAbsorptionPct = totalPlafonGlobal > 0 ? (totalActualGlobal / totalPlafonGlobal) * 100 : 0;
  const overallPlanPct = totalPlafonGlobal > 0 ? (totalPlanGlobal / totalPlafonGlobal) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-gray-800">Master Budget (Rencana & Penyerapan Anggaran)</h1>
          <p className="text-xs text-gray-500">Penyusunan kode anggaran, pemantauan alokasi Rencana (Plan), serta tingkat Penyerapan Actual Legal Department {getCompanyDisplayName(activeCompany)}</p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all self-start shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Master Budget Baru</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-xs border border-amber-100">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>Izin Akses Terbatas (Staff Read-Only)</span>
          </div>
        )}
      </div>

      {/* Summary KPI Metric Cards for Master Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Plafon */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Total Plafon Anggaran</span>
            <div className="p-1.5 bg-gray-100 rounded-lg text-gray-600">
              <BarChart2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 font-mono tracking-tight">{formatRupiah(totalPlafonGlobal)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{filteredBudgets.length} Item Master Budget</p>
          </div>
        </div>

        {/* Total Plan */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-white to-blue-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-700 font-medium">
            <span>Total Alokasi Plan (Rencana)</span>
            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-blue-900 font-mono tracking-tight">{formatRupiah(totalPlanGlobal)}</p>
            <p className="text-[11px] text-blue-700 mt-0.5 font-semibold">{overallPlanPct.toFixed(1)}% dari Total Plafon</p>
          </div>
        </div>

        {/* Total Penyerapan Actual */}
        <div className="bg-white p-4 rounded-2xl border border-red-200/80 bg-gradient-to-br from-white to-red-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-brand-red font-medium">
            <span>Realisasi Penyerapan Actual</span>
            <div className="p-1.5 bg-red-100 rounded-lg text-brand-red">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-brand-red font-mono tracking-tight">{formatRupiah(totalActualGlobal)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono">Sisa: {formatRupiah(totalPlafonGlobal - totalActualGlobal)}</p>
          </div>
        </div>

        {/* Persentase Serap */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/30 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>Tingkat Penyerapan Global</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-lg font-black text-emerald-900 font-mono">{overallAbsorptionPct.toFixed(1)}%</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                overallAbsorptionPct >= 80 ? "bg-emerald-100 text-emerald-800" :
                overallAbsorptionPct >= 50 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
              }`}>
                {overallAbsorptionPct >= 80 ? "Penyerapan Tinggi" : overallAbsorptionPct >= 50 ? "Penyerapan Sedang" : "Penyerapan Rendah"}
              </span>
            </div>
            <div className="w-full bg-emerald-100 h-2 rounded-full overflow-hidden mt-1.5">
              <div 
                className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, overallAbsorptionPct)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Distinction Banner: Master Budget vs Actual Cost */}
      <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start space-x-3 text-xs text-blue-800 shadow-3xs">
        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
          <Info className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-blue-900">Petunjuk Monitoring Master Budget &amp; Status Penyerapan</p>
          <p className="leading-relaxed">
            Halaman <strong className="text-blue-900">Master Budget</strong> menyajikan data lengkap <strong>Plafon Anggaran Utama</strong> beserta <strong>Alokasi Rencana (Plan)</strong> dan <strong>Realisasi Penyerapan (Actual)</strong>. 
            Anda dapat memantau secara langsung apakah plafon anggaran sudah teralokasi pada Plan serta persentase keterserapannya secara maksimal.
          </p>
        </div>
      </div>

      {/* Info Warning for Staff */}
      {!isAdmin && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex items-start space-x-3 text-xs text-gray-600 shadow-2xs">
          <Info className="w-5 h-5 text-brand-dark shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold text-gray-800">Mode Pratinjau (Read-Only)</p>
            <p>Akun Anda terdaftar dengan role **{currentUser.Role}**. Anda dapat meneliti seluruh alokasi dan penyerapan Master Budget di bawah ini, namun tidak diperkenankan menambah, menyunting, atau menghapus anggaran dasar.</p>
          </div>
        </div>
      )}

      {/* Search and Filters Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari Kode Budget, Kategori, PIC, Deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-brand-red focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Year */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Tahun:</span>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full md:w-48 py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red cursor-pointer font-medium"
          >
            <option value="All">Semua Tahun</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
            {!years.includes(2026) && <option value="2026">2026</option>}
          </select>
        </div>

        {/* Filter Category */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Kategori:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full md:w-48 py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red cursor-pointer font-medium"
          >
            <option value="All">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget Table List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50">
                <th className="py-3 px-4">Tahun &amp; Periode</th>
                <th className="py-3 px-4">Kode &amp; Kategori</th>
                <th className="py-3 px-4">Deskripsi &amp; PIC</th>
                <th className="py-3 px-4 text-right">Plafon Anggaran</th>
                <th className="py-3 px-4 text-right">Total Plan (Rencana)</th>
                <th className="py-3 px-4 text-right">Penyerapan (Actual)</th>
                <th className="py-3 px-4 text-center">% Serap</th>
                <th className="py-3 px-4 text-right">Sisa Plafon</th>
                <th className="py-3 px-4 text-center">Status</th>
                {isAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBudgets.length > 0 ? (
                filteredBudgets.map((b) => {
                  const stats = getBudgetStats(b.BudgetID, b.BudgetAmount);
                  return (
                    <tr key={b.BudgetID} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <span className="font-bold text-gray-800">FY {b.Year}</span>
                        <div className="flex items-center space-x-1 text-[10px] text-gray-500 font-normal mt-0.5">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{formatDateDisplay(b.StartDate)} s/d {formatDateDisplay(b.EndDate)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="inline-block whitespace-nowrap px-2.5 py-1 bg-gray-100 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 tracking-tight">
                          {b.BudgetCode || b.BudgetID || "-"}
                        </span>
                        <div className="mt-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-brand-red border border-red-100">
                            {b.Category}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs">
                        <p className="truncate font-medium text-gray-800" title={b.Description}>{b.Description || "-"}</p>
                        <span className="text-[10px] text-gray-400 font-mono">PIC: {b.PIC}</span>
                      </td>

                      {/* Plafon Anggaran */}
                      <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono text-xs whitespace-nowrap">
                        {formatRupiah(b.BudgetAmount)}
                      </td>

                      {/* Total Plan (Rencana) */}
                      <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                        <p className={`font-bold ${stats.totalPlanned > 0 ? "text-blue-700" : "text-gray-400"}`}>
                          {formatRupiah(stats.totalPlanned)}
                        </p>
                        <span className={`text-[10px] inline-block px-1.5 py-0.2 rounded ${stats.planCount > 0 ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-400"}`}>
                          {stats.planCount > 0 ? `${stats.planCount} Plan (${stats.planPercent.toFixed(0)}%)` : "Belum Ada Plan"}
                        </span>
                      </td>

                      {/* Penyerapan Actual */}
                      <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                        <p className={`font-bold ${stats.totalActual > 0 ? "text-brand-red" : "text-gray-400"}`}>
                          {formatRupiah(stats.totalActual)}
                        </p>
                        <span className="text-[10px] text-gray-400">
                          {stats.actualCount} Transaksi
                        </span>
                      </td>

                      {/* % Serap */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            stats.actualPercent >= 90 ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            stats.actualPercent >= 50 ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            stats.actualPercent > 0 ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            "bg-gray-100 text-gray-500 border border-gray-200"
                          }`}>
                            {stats.actualPercent.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                stats.actualPercent >= 90 ? "bg-emerald-600" :
                                stats.actualPercent >= 50 ? "bg-blue-600" : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.min(100, stats.actualPercent)}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Sisa Budget */}
                      <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                        <span className={`font-bold ${stats.sisa < 0 ? "text-red-600" : "text-gray-700"}`}>
                          {formatRupiah(stats.sisa)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          b.Status === BudgetStatus.ACTIVE 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                            : "bg-gray-100 text-gray-500 border border-gray-200"
                        }`}>
                          {b.Status}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEdit(b)}
                              className="p-1.5 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Master Budget"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(b)}
                              className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Master Budget"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-gray-400">
                    Tidak ditemukan data Master Budget yang memenuhi filter Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards Layout for Handphone Accessibility */}
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredBudgets.length > 0 ? (
            filteredBudgets.map((b) => {
              const stats = getBudgetStats(b.BudgetID, b.BudgetAmount);
              return (
                <div key={b.BudgetID} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block whitespace-nowrap font-mono font-bold text-gray-800 px-2.5 py-1 bg-gray-100 rounded-lg border border-gray-200 text-xs">
                        {b.BudgetCode || b.BudgetID || "-"}
                      </span>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-brand-red border border-red-100">
                          {b.Category}
                        </span>
                        <span className="font-mono text-xs font-bold text-gray-700">FY {b.Year}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0 ${
                      b.Status === BudgetStatus.ACTIVE 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                      {b.Status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed font-medium">
                    {b.Description || "-"}
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div>
                      <span className="block text-[10px] text-gray-500 font-medium">Plafon Anggaran:</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{formatRupiah(b.BudgetAmount)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-blue-600 font-medium">Rencana (Plan):</span>
                      <span className="font-mono font-bold text-blue-700 text-xs">{formatRupiah(stats.totalPlanned)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-brand-red font-medium">Penyerapan (Actual):</span>
                      <span className="font-mono font-bold text-brand-red text-xs">{formatRupiah(stats.totalActual)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-emerald-700 font-medium">% Keterserapan:</span>
                      <span className="font-mono font-bold text-emerald-800 text-xs">{stats.actualPercent.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>Progres Penyerapan Actual</span>
                      <span className="font-mono font-semibold">{stats.actualPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          stats.actualPercent >= 90 ? "bg-emerald-600" :
                          stats.actualPercent >= 50 ? "bg-blue-600" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(100, stats.actualPercent)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <div className="flex items-center space-x-1 font-mono text-[10px]">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{formatDateDisplay(b.StartDate)} s/d {formatDateDisplay(b.EndDate)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="px-2.5 py-1 text-xs font-semibold text-brand-dark bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="p-1.5 text-gray-400 hover:text-brand-red hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs">
              Tidak ditemukan data Master Budget yang memenuhi filter Anda.
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog for Creating/Editing Master Budget */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-3 sm:p-6 animate-fade-in backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl sm:max-w-3xl my-auto overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            {/* Header (Sticky Top) */}
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-gray-800 font-display">
                  {editingId ? "Ubah Master Budget" : "Buat Master Budget Baru"}
                </h3>
                <p className="text-[10px] text-gray-500">Penyusunan alokasi awal anggaran divisi Legal</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Calendar Date Range Selection for Fiscal Year */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200/70 space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand-red" />
                    <span>Tahun Anggaran (Format Kalender Mulai s/d Selesai) *</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] text-gray-500 font-medium mb-1">Dari Tanggal:</span>
                      <input
                        type="date"
                        required
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-500 font-medium mb-1">Sampai Dengan Tanggal:</span>
                      <input
                        type="date"
                        required
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg font-mono focus:outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    Misal: 1 April 2026 - 31 Maret 2027
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Manual Budget Code Input */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Kode Budget (Bisa Diisi & Diedit) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 1020440 / BG-2026-LIT-01"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-mono font-bold bg-white"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Bebas sesuai kebutuhan internal</p>
                  </div>

                  {/* Manual Category Input (Free Text + Datalist Suggestions) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Kategori Budget (Bisa Ditulis/Edit Own) *
                    </label>
                    <input
                      type="text"
                      required
                      list="category-suggestions"
                      placeholder="Ketik Kategori..."
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red font-medium bg-white"
                    />
                    <datalist id="category-suggestions">
                      {categories.map(c => (
                        <option key={c.CategoryID} value={c.CategoryName} />
                      ))}
                      <option value="Litigation & Legal Dispute" />
                      <option value="Permit & Corporate License" />
                      <option value="Notary & Legal Document" />
                      <option value="Legal Training & Seminar" />
                    </datalist>
                    <p className="text-[10px] text-gray-400 mt-1">Dapat mengetik nama kategori baru</p>
                  </div>
                </div>

                {/* Budget Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Nominal Plafon Anggaran (Rp) *
                  </label>
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
                  {formAmount && (
                    <p className="text-[10px] text-brand-red font-mono mt-1 font-semibold">
                      {formatRupiah(Number(formAmount))}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Deskripsi Anggaran</label>
                  <textarea
                    placeholder="Detail alokasi penggunaan budget..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red h-20 resize-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PIC */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">PIC / Penanggung Jawab *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Penanggung Jawab"
                      value={formPic}
                      onChange={(e) => setFormPic(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status Budget *</label>
                    <div className="flex items-center space-x-3 h-9">
                      <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value={BudgetStatus.ACTIVE}
                          checked={formStatus === BudgetStatus.ACTIVE}
                          onChange={() => setFormStatus(BudgetStatus.ACTIVE)}
                          className="text-brand-red focus:ring-brand-red"
                        />
                        <span className="font-medium text-emerald-700">Active</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value={BudgetStatus.INACTIVE}
                          checked={formStatus === BudgetStatus.INACTIVE}
                          onChange={() => setFormStatus(BudgetStatus.INACTIVE)}
                          className="text-brand-red focus:ring-brand-red"
                        />
                        <span className="font-medium text-gray-500">Inactive</span>
                      </label>
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
                    <span>Simpan Master Budget</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-brand-red">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-bold font-display text-sm text-gray-800">Hapus Master Budget</h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Apakah Anda yakin ingin menghapus Kode Master Budget <span className="font-mono font-bold text-gray-800">{deleteTarget.BudgetCode}</span> ({deleteTarget.Category})? 
              Tindakan ini akan menghapus seluruh Plan Budget dan Transaksi Realisasi yang terhubung.
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
                  await onDeleteBudget(target.BudgetID);
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
