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
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Target, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  FileText, 
  X,
  Filter,
  Building,
  Store,
  Info
} from "lucide-react";
import { User, Budget, PlanBudget, Actual, PlanStatus, UserRole } from "../types";

interface PlanBudgetViewProps {
  budgets: Budget[];
  plans: PlanBudget[];
  actuals: Actual[];
  currentUser: User;
  onAddPlan: (planData: Partial<PlanBudget>) => Promise<boolean>;
  onEditPlan: (planId: string, planData: Partial<PlanBudget>) => Promise<boolean>;
  onDeletePlan: (planId: string) => Promise<boolean>;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function PlanBudgetView({
  budgets,
  plans,
  actuals,
  currentUser,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  addToast
}: PlanBudgetViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBudgetFilter, setSelectedBudgetFilter] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("ALL");
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>("2026");

  // Fiscal Year Helper (April - March sequence)
  const getFiscalYear = (dateStr?: string) => {
    if (!dateStr || dateStr.length < 7) return "";
    const year = parseInt(dateStr.slice(0, 4), 10);
    const month = parseInt(dateStr.slice(5, 7), 10);
    if (isNaN(year) || isNaN(month)) return "";
    return month >= 4 ? year.toString() : (year - 1).toString();
  };

  // Month list for target period filter (Fiscal Year sequence: April to March)
  const MONTH_LIST = [
    { code: "ALL", name: "Semua Bulan (Apr - Mar)", short: "Semua" },
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanBudget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    BudgetID: "",
    PlanCode: "",
    Title: "",
    Vendor: "",
    Category: "",
    PlannedAmount: "",
    StartDate: "",
    EndDate: "",
    PIC: currentUser.Name,
    Status: PlanStatus.PLANNED,
    Notes: ""
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick Vendor Inline Edit State
  const [quickVendorEditId, setQuickVendorEditId] = useState<string | null>(null);
  const [quickVendorValue, setQuickVendorValue] = useState("");

  // Currency Formatter
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper to calculate actual spent for a plan
  const getPlanActualCost = (planId: string) => {
    return actuals
      .filter(a => a.PlanID === planId)
      .reduce((sum, a) => sum + a.Amount, 0);
  };

  // Helper to calculate total actual spent for a budget
  const getBudgetTotalActual = (budgetId: string) => {
    return actuals
      .filter(a => a.BudgetID === budgetId)
      .reduce((sum, a) => sum + a.Amount, 0);
  };

  // Active budgets for selection
  const activeBudgets = budgets.filter(b => b.Status === "Active");

  // Filtered Plans list with Search, Master Budget, Status, Target Month & Year
  const filteredPlans = plans.filter(plan => {
    const parentBudget = budgets.find(b => b.BudgetID === plan.BudgetID);
    const budgetCode = parentBudget ? parentBudget.BudgetCode.toLowerCase() : "";
    const vendorStr = (plan.Vendor || "").toLowerCase();
    const matchesSearch = 
      plan.PlanCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.Title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.PIC.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorStr.includes(searchTerm.toLowerCase()) ||
      (plan.Category && plan.Category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      budgetCode.includes(searchTerm.toLowerCase());

    const matchesBudget = selectedBudgetFilter === "ALL" || plan.BudgetID === selectedBudgetFilter;
    const matchesStatus = selectedStatusFilter === "ALL" || plan.Status === selectedStatusFilter;

    // Target Periode Month & Fiscal Year Filter (April - March)
    const planMonth = plan.StartDate ? plan.StartDate.slice(5, 7) : "";
    const planFY = getFiscalYear(plan.StartDate);

    const matchesMonth = selectedMonthFilter === "ALL" || planMonth === selectedMonthFilter;
    const matchesYear = selectedYearFilter === "ALL" || planFY === selectedYearFilter;

    return matchesSearch && matchesBudget && matchesStatus && matchesMonth && matchesYear;
  });

  // Dynamic Summary Metrics based on filtered plans
  const totalPlannedAmount = filteredPlans.reduce((sum, p) => sum + p.PlannedAmount, 0);
  const totalPlanActualCost = filteredPlans.reduce((sum, p) => sum + getPlanActualCost(p.PlanID), 0);
  const remainingPlanBalance = totalPlannedAmount - totalPlanActualCost;
  const planUtilizationRate = totalPlannedAmount > 0 ? (totalPlanActualCost / totalPlannedAmount) * 100 : 0;

  const openCreateModal = () => {
    setEditingPlan(null);
    const defaultBudget = activeBudgets[0];
    const defaultBudgetId = defaultBudget ? defaultBudget.BudgetID : "";
    const defaultCategory = defaultBudget ? defaultBudget.Category : "";
    
    setFormData({
      BudgetID: defaultBudgetId,
      PlanCode: `PLN-${Date.now().toString().slice(-6)}`,
      Title: "",
      Vendor: "",
      Category: defaultCategory,
      PlannedAmount: "",
      StartDate: defaultBudget ? defaultBudget.StartDate : new Date().toISOString().split("T")[0],
      EndDate: defaultBudget ? defaultBudget.EndDate : new Date().toISOString().split("T")[0],
      PIC: currentUser.Name,
      Status: PlanStatus.PLANNED,
      Notes: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: PlanBudget) => {
    setEditingPlan(plan);
    setFormData({
      BudgetID: plan.BudgetID,
      PlanCode: plan.PlanCode,
      Title: plan.Title,
      Vendor: plan.Vendor || "",
      Category: plan.Category || "",
      PlannedAmount: plan.PlannedAmount.toString(),
      StartDate: plan.StartDate,
      EndDate: plan.EndDate,
      PIC: plan.PIC,
      Status: plan.Status,
      Notes: plan.Notes || ""
    });
    setIsModalOpen(true);
  };

  const handleBudgetChange = (budgetId: string) => {
    const selected = budgets.find(b => b.BudgetID === budgetId);
    setFormData(prev => ({
      ...prev,
      BudgetID: budgetId,
      Category: selected ? selected.Category : prev.Category,
      StartDate: selected ? selected.StartDate : prev.StartDate,
      EndDate: selected ? selected.EndDate : prev.EndDate
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.BudgetID || !formData.PlanCode || !formData.Title || !formData.PlannedAmount || !formData.PIC) {
      addToast("Mohon lengkapi semua field wajib (*)!", "error");
      return;
    }

    const amountNum = parseFloat(formData.PlannedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      addToast("Nominal rencana anggaran harus lebih besar dari Rp 0!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<PlanBudget> = {
        BudgetID: formData.BudgetID,
        PlanCode: formData.PlanCode.trim(),
        Title: formData.Title.trim(),
        Vendor: formData.Vendor ? formData.Vendor.trim() : "-",
        Category: formData.Category.trim(),
        PlannedAmount: amountNum,
        StartDate: formData.StartDate,
        EndDate: formData.EndDate,
        PIC: formData.PIC.trim(),
        Status: formData.Status,
        Notes: formData.Notes.trim()
      };

      let success = false;
      if (editingPlan) {
        success = await onEditPlan(editingPlan.PlanID, payload);
      } else {
        success = await onAddPlan(payload);
      }

      if (success) {
        setIsModalOpen(false);
      }
    } catch (err) {
      addToast("Terjadi kesalahan saat menyimpan Plan Budget.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickVendorSave = async (plan: PlanBudget) => {
    if (!quickVendorValue.trim()) {
      setQuickVendorEditId(null);
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await onEditPlan(plan.PlanID, { Vendor: quickVendorValue.trim() });
      if (success) {
        addToast("Vendor berhasil diperbarui!", "success");
      }
    } catch (err) {
      addToast("Gagal memperbarui Vendor.", "error");
    } finally {
      setIsSubmitting(false);
      setQuickVendorEditId(null);
    }
  };

  const handleDelete = async (planId: string) => {
    setIsSubmitting(true);
    try {
      const success = await onDeletePlan(planId);
      if (success) {
        setDeleteConfirmId(null);
      }
    } catch (err) {
      addToast("Gagal menghapus plan budget.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: PlanStatus) => {
    switch (status) {
      case PlanStatus.COMPLETED:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Selesai</span>
          </span>
        );
      case PlanStatus.IN_PROGRESS:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Berjalan</span>
          </span>
        );
      case PlanStatus.CANCELLED:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <XCircle className="w-3 h-3 text-gray-500" />
            <span>Batal</span>
          </span>
        );
      case PlanStatus.PLANNED:
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Target className="w-3 h-3 text-amber-600" />
            <span>Rencana</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-brand-dark to-[#1a1a1a] p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 space-y-1">
          <div className="flex items-center space-x-2 text-amber-400">
            <Target className="w-5 h-5" />
            <span className="text-xs font-mono tracking-widest font-bold uppercase">Rencana Pemakaian Anggaran</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Plan Budget</h1>
          <p className="text-gray-300 text-sm max-w-2xl">
            Perencanaan dan pengalokasian detail penggunaan Master Budget Legal Department. Realisasi biaya (Actual Cost) akan secara otomatis mengurangi saldo Plan Budget terkait.
          </p>
        </div>

        <div className="mt-4 md:mt-0 relative z-10 flex items-center space-x-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-brand-red hover:bg-red-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Plan Budget Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Planned */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-mono font-semibold uppercase">Total Target Plan</span>
              <h3 className="text-xl md:text-2xl font-display font-bold text-gray-800">{formatRupiah(totalPlannedAmount)}</h3>
              <p className="text-[11px] text-gray-400">{plans.length} rencana terdaftar</p>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Plan Realization (Actual Spent on Plans) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-mono font-semibold uppercase">Realisasi (Actual Cost)</span>
              <h3 className="text-xl md:text-2xl font-display font-bold text-brand-red">{formatRupiah(totalPlanActualCost)}</h3>
              <p className="text-[11px] text-gray-400">Total terpakai dari rencana</p>
            </div>
            <div className="p-2.5 bg-red-50 text-brand-red rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Remaining Plan Balance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-mono font-semibold uppercase">Sisa Balans Plan</span>
              <h3 className={`text-xl md:text-2xl font-display font-bold ${remainingPlanBalance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatRupiah(remainingPlanBalance)}
              </h3>
              <p className="text-[11px] text-gray-400">Dana alokasi rencana tersisa</p>
            </div>
            <div className={`p-2.5 rounded-xl ${remainingPlanBalance < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Execution Rate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-1 w-full">
              <span className="text-xs text-gray-400 font-mono font-semibold uppercase">Tingkat Penyerapan Plan</span>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-xl md:text-2xl font-display font-bold text-gray-800">{planUtilizationRate.toFixed(1)}%</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  planUtilizationRate > 100 ? "bg-red-100 text-red-700" :
                  planUtilizationRate > 80 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {planUtilizationRate > 100 ? "Over Plan" : planUtilizationRate > 80 ? "High" : "On Track"}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    planUtilizationRate > 100 ? "bg-red-600" :
                    planUtilizationRate > 80 ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(planUtilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel & Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pb-2 border-b border-gray-100">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari Kode Plan, Judul, atau PIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Filter Target Fiscal Year */}
            <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Fiscal Year</option>
                <option value="2025">FY 2025 (Apr 2025 - Mar 2026)</option>
                <option value="2026">FY 2026 (Apr 2026 - Mar 2027)</option>
                <option value="2027">FY 2027 (Apr 2027 - Mar 2028)</option>
              </select>
            </div>

            {/* Filter Target Periode / Bulan */}
            <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-red" />
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
              >
                {MONTH_LIST.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code === "ALL" ? "Semua Bulan (Apr - Mar)" : `Bulan: ${m.name}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Master Budget */}
            <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedBudgetFilter}
                onChange={(e) => setSelectedBudgetFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Master Budget</option>
                {budgets.map(b => (
                  <option key={b.BudgetID} value={b.BudgetID}>
                    {b.BudgetCode} - {b.Category}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value={PlanStatus.PLANNED}>Rencana (Planned)</option>
                <option value={PlanStatus.IN_PROGRESS}>Berjalan (In Progress)</option>
                <option value={PlanStatus.COMPLETED}>Selesai (Completed)</option>
                <option value={PlanStatus.CANCELLED}>Batal (Cancelled)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Target Month Filter Pills (FY Order: Apr - Mar) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar">
          <span className="text-[11px] font-mono text-gray-400 font-semibold uppercase pr-1 shrink-0 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-brand-red" />
            <span>Target Bulan (FY):</span>
          </span>
          {MONTH_LIST.map((m) => {
            const count = plans.filter(p => {
              const mMatch = m.code === "ALL" || (p.StartDate && p.StartDate.slice(5, 7) === m.code);
              const pFY = getFiscalYear(p.StartDate);
              const yMatch = selectedYearFilter === "ALL" || pFY === selectedYearFilter;
              return mMatch && yMatch;
            }).length;

            const isActive = selectedMonthFilter === m.code;

            return (
              <button
                key={m.code}
                onClick={() => setSelectedMonthFilter(m.code)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all text-xs flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-brand-red text-white font-bold shadow-xs scale-102"
                    : "bg-gray-100/80 hover:bg-gray-200/80 text-gray-600"
                }`}
              >
                <span>{m.short}</span>
                {m.code !== "ALL" && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-white/20 text-white" : count > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Filter Summary Banner */}
        {(selectedMonthFilter !== "ALL" || selectedYearFilter !== "ALL" || selectedBudgetFilter !== "ALL" || selectedStatusFilter !== "ALL" || searchTerm) && (
          <div className="flex flex-wrap items-center justify-between bg-amber-50/80 border border-amber-200/70 px-3.5 py-2 rounded-xl text-xs text-amber-900 gap-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Filter Terpasang: <strong>{filteredPlans.length} Plan Budget</strong> ditemukan
                {selectedMonthFilter !== "ALL" && ` untuk ${MONTH_LIST.find(m => m.code === selectedMonthFilter)?.name}`}
                {selectedYearFilter !== "ALL" && ` (FY ${selectedYearFilter}: Apr ${selectedYearFilter} - Mar ${parseInt(selectedYearFilter) + 1})`}.
                Total Target Rencana: <strong className="text-gray-900">{formatRupiah(totalPlannedAmount)}</strong> | Realisasi: <strong className="text-brand-red">{formatRupiah(totalPlanActualCost)}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedMonthFilter("ALL");
                setSelectedYearFilter("ALL");
                setSelectedBudgetFilter("ALL");
                setSelectedStatusFilter("ALL");
                setSearchTerm("");
              }}
              className="text-amber-800 font-bold underline text-[11px] hover:text-amber-950 shrink-0 cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* Plans Table - Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/60">
                <th className="py-3 px-3">Kode & Judul Plan</th>
                <th className="py-3 px-3">Vendor / Pihak Ketiga</th>
                <th className="py-3 px-3">Master Budget Pengampu</th>
                <th className="py-3 px-3">Target Periode</th>
                <th className="py-3 px-3 text-right">Target Rencana (Rp)</th>
                <th className="py-3 px-3 text-right">Realisasi (Actual)</th>
                <th className="py-3 px-3 text-right">Sisa Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPlans.length > 0 ? (
                filteredPlans.map(plan => {
                  const masterBudget = budgets.find(b => b.BudgetID === plan.BudgetID);
                  const planActual = getPlanActualCost(plan.PlanID);
                  const sisa = plan.PlannedAmount - planActual;
                  const utilPercent = plan.PlannedAmount > 0 ? (planActual / plan.PlannedAmount) * 100 : 0;
                  const isQuickEditing = quickVendorEditId === plan.PlanID;

                  return (
                    <tr key={plan.PlanID} className="hover:bg-gray-50/70 transition-colors duration-150">
                      {/* Plan Code & Title */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-brand-dark px-2 py-0.5 bg-gray-100 rounded border border-gray-200/80 text-[11px]">
                            {plan.PlanCode}
                          </span>
                          <p className="font-semibold text-gray-800 text-xs mt-1">{plan.Title}</p>
                          {plan.Notes && <p className="text-[10px] text-gray-400 italic truncate max-w-xs">{plan.Notes}</p>}
                        </div>
                      </td>

                      {/* Vendor / Pihak Ketiga (Editable) */}
                      <td className="py-3.5 px-3">
                        {isQuickEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={quickVendorValue}
                              onChange={(e) => setQuickVendorValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickVendorSave(plan);
                                if (e.key === 'Escape') setQuickVendorEditId(null);
                              }}
                              className="px-2 py-1 bg-white border border-brand-red rounded text-xs font-medium text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red w-36"
                              autoFocus
                              placeholder="Nama Vendor..."
                            />
                            <button
                              onClick={() => handleQuickVendorSave(plan)}
                              className="px-2 py-1 bg-brand-red text-white text-[10px] font-bold rounded hover:bg-red-700 cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setQuickVendorEditId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setQuickVendorEditId(plan.PlanID);
                              setQuickVendorValue(plan.Vendor || "");
                            }}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50/80 hover:bg-amber-100 text-amber-900 border border-amber-200/70 rounded-lg cursor-pointer group transition-all"
                            title="Klik untuk cepat ubah nama vendor"
                          >
                            <Building className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="font-semibold text-xs max-w-[130px] truncate">{plan.Vendor || "-"}</span>
                            <Edit3 className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                          </div>
                        )}
                      </td>

                      {/* Parent Master Budget */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {masterBudget ? (
                          <div className="space-y-0.5">
                            <p className="font-mono font-bold text-gray-800">{masterBudget.BudgetCode}</p>
                            <p className="text-[10px] text-gray-500">{masterBudget.Category}</p>
                            <p className="text-[9px] text-gray-400 font-mono">Plafon: {formatRupiah(masterBudget.BudgetAmount)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-mono">-</span>
                        )}
                      </td>

                      {/* Period */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1 text-gray-600 font-mono text-[11px]">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{plan.StartDate} s/d {plan.EndDate}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">PIC: <strong className="text-gray-600">{plan.PIC}</strong></p>
                      </td>

                      {/* Target Planned Amount */}
                      <td className="py-3.5 px-3 text-right font-bold text-gray-800 font-mono whitespace-nowrap">
                        {formatRupiah(plan.PlannedAmount)}
                      </td>

                      {/* Actual Realization */}
                      <td className="py-3.5 px-3 text-right font-bold text-brand-red font-mono whitespace-nowrap">
                        {formatRupiah(planActual)}
                      </td>

                      {/* Sisa Balance & Progress */}
                      <td className="py-3.5 px-3 text-right font-mono whitespace-nowrap">
                        <span className={`font-bold ${sisa < 0 ? "text-red-600" : "text-emerald-700"}`}>
                          {formatRupiah(sisa)}
                        </span>
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1.5 ml-auto">
                          <div 
                            className={`h-1.5 rounded-full ${utilPercent > 100 ? "bg-red-600" : utilPercent > 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(utilPercent, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-[9px] text-gray-400 font-mono block mt-0.5">{utilPercent.toFixed(1)}% terpakai</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(plan.Status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => openEditModal(plan)}
                            className="p-1.5 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Plan & Vendor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          {currentUser.Role === UserRole.ADMIN && (
                            <button
                              onClick={() => setDeleteConfirmId(plan.PlanID)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-semibold text-gray-600">Belum ada Plan Budget yang sesuai filter.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Klik tombol "Tambah Plan Budget Baru" untuk membuat rencana alokasi anggaran.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards Layout for Handphone Accessibility */}
        <div className="block md:hidden divide-y divide-gray-100">
          {filteredPlans.length > 0 ? (
            filteredPlans.map(plan => {
              const masterBudget = budgets.find(b => b.BudgetID === plan.BudgetID);
              const planActual = getPlanActualCost(plan.PlanID);
              const sisa = plan.PlannedAmount - planActual;
              const utilPercent = plan.PlannedAmount > 0 ? (planActual / plan.PlannedAmount) * 100 : 0;

              return (
                <div key={plan.PlanID} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-brand-dark px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-[10px]">
                        {plan.PlanCode}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm mt-1">{plan.Title}</h4>
                    </div>
                    {getStatusBadge(plan.Status)}
                  </div>

                  {/* Vendor Tag Mobile */}
                  <div className="flex items-center justify-between bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
                    <div className="flex items-center space-x-1.5 text-amber-900 text-xs font-semibold">
                      <Building className="w-3.5 h-3.5 text-amber-600" />
                      <span>Vendor: {plan.Vendor || "-"}</span>
                    </div>
                    <button
                      onClick={() => openEditModal(plan)}
                      className="text-[10px] text-amber-800 font-bold underline"
                    >
                      Ubah
                    </button>
                  </div>

                  {/* Master budget & PIC */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-mono font-bold">Master Budget</p>
                      <p className="font-mono font-bold text-gray-800">{masterBudget?.BudgetCode || "-"}</p>
                      <p className="text-[10px] text-gray-500">{masterBudget?.Category || "-"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase font-mono font-bold">PIC & Target</p>
                      <p className="font-semibold text-gray-800 truncate">{plan.PIC}</p>
                      <p className="text-[10px] text-gray-500">{plan.StartDate} - {plan.EndDate}</p>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-[9px] text-gray-400 font-mono">Plan Target</p>
                      <p className="text-xs font-bold text-gray-900 font-mono">{formatRupiah(plan.PlannedAmount)}</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      <p className="text-[9px] text-brand-red font-mono font-semibold">Actual</p>
                      <p className="text-xs font-bold text-brand-red font-mono">{formatRupiah(planActual)}</p>
                    </div>
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <p className="text-[9px] text-emerald-800 font-mono font-semibold">Sisa</p>
                      <p className="text-xs font-bold text-emerald-800 font-mono">{formatRupiah(sisa)}</p>
                    </div>
                  </div>

                  {/* Actions mobile */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(plan)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Plan &amp; Vendor</span>
                    </button>
                    {currentUser.Role === UserRole.ADMIN && (
                      <button
                        onClick={() => setDeleteConfirmId(plan.PlanID)}
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-400 px-4">
              <p className="font-semibold text-gray-600">Belum ada Plan Budget.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Create / Edit Plan Budget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-4 sm:p-6 animate-fade-in backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl sm:max-w-3xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 font-display">
                    {editingPlan ? "Edit Plan Budget" : "Tambah Plan Budget Baru"}
                  </h3>
                  <p className="text-[11px] text-gray-400">Rencana alokasi penggunaan Master Budget</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Master Budget Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Master Budget Pengampu <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.BudgetID}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  className="w-full min-w-0 truncate px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-all cursor-pointer font-medium"
                  required
                >
                  <option value="">-- Pilih Master Budget --</option>
                  {activeBudgets.map(b => {
                    const budgetSpent = getBudgetTotalActual(b.BudgetID);
                    const sisaMaster = b.BudgetAmount - budgetSpent;
                    return (
                      <option key={b.BudgetID} value={b.BudgetID}>
                        {b.BudgetCode} - {b.Category} (Plafon: {formatRupiah(b.BudgetAmount)} | Sisa: {formatRupiah(sisaMaster)})
                      </option>
                    );
                  })}
                </select>

                {/* Notifikasi Informasi Alokasi Master Budget */}
                {(() => {
                  const selectedMaster = budgets.find(b => b.BudgetID === formData.BudgetID);
                  if (!selectedMaster) return null;

                  const otherPlans = plans.filter(p => p.BudgetID === formData.BudgetID && (!editingPlan || p.PlanID !== editingPlan.PlanID));
                  const totalPlanned = otherPlans.reduce((sum, p) => sum + p.PlannedAmount, 0);
                  const totalActual = getBudgetTotalActual(formData.BudgetID);
                  const remainingPlanAlloc = selectedMaster.BudgetAmount - totalPlanned;
                  const inputPlannedAmount = parseFloat(formData.PlannedAmount) || 0;
                  const projectedRemaining = remainingPlanAlloc - inputPlannedAmount;

                  return (
                    <div className="mt-2.5 p-3 rounded-xl bg-blue-50/90 border border-blue-200/80 text-xs text-blue-900 space-y-2 animate-fade-in shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 font-bold text-blue-950">
                          <Info className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Status Alokasi Master Budget:</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100/90 text-blue-800 rounded-md shrink-0 border border-blue-200">
                          Plafon: {formatRupiah(selectedMaster.BudgetAmount)}
                        </span>
                      </div>

                      <p className="text-[11px] leading-relaxed text-blue-900">
                        Master Budget <strong className="font-mono">{selectedMaster.BudgetCode}</strong> (<em>{selectedMaster.Category}</em>) sudah di-plan untuk digunakan senilai <strong className="text-blue-950 font-mono font-bold">{formatRupiah(totalPlanned)}</strong> ({selectedMaster.BudgetAmount > 0 ? ((totalPlanned / selectedMaster.BudgetAmount) * 100).toFixed(1) : 0}% dari plafon) dari <strong>{otherPlans.length} Rencana</strong>, dan tersisa alokasi rencana senilai <strong className={`font-mono font-bold ${remainingPlanAlloc < 0 ? "text-red-600" : "text-emerald-700"}`}>{formatRupiah(remainingPlanAlloc)}</strong>.
                      </p>

                      {/* Detail Matriks Ringkas */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-blue-200/60 text-[11px] font-mono">
                        <div className="bg-white/80 p-2 rounded-lg border border-blue-100/80 text-center">
                          <span className="text-[9px] text-gray-500 font-semibold uppercase block">Sudah Di-Plan</span>
                          <strong className="text-blue-950 font-bold">{formatRupiah(totalPlanned)}</strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-blue-100/80 text-center">
                          <span className="text-[9px] text-gray-500 font-semibold uppercase block">Sisa Alokasi Plan</span>
                          <strong className={`font-bold ${remainingPlanAlloc < 0 ? "text-red-600" : "text-emerald-700"}`}>
                            {formatRupiah(remainingPlanAlloc)}
                          </strong>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-blue-100/80 text-center">
                          <span className="text-[9px] text-gray-500 font-semibold uppercase block">Total Realisasi</span>
                          <strong className="text-brand-red font-bold">{formatRupiah(totalActual)}</strong>
                        </div>
                      </div>

                      {/* Notifikasi Realtime terhadap Nominal Masukan */}
                      {inputPlannedAmount > 0 && (
                        <div className={`mt-1.5 p-2 rounded-lg text-[11px] flex items-center space-x-1.5 font-medium border ${
                          projectedRemaining < 0 
                            ? "bg-red-50 text-red-800 border-red-200" 
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {projectedRemaining < 0 ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                              <span>
                                Nominal rencana baru (<strong>{formatRupiah(inputPlannedAmount)}</strong>) <strong>melebihi sisa alokasi rencana</strong> sebesar <strong className="font-mono">{formatRupiah(Math.abs(projectedRemaining))}</strong>!
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                Dengan rencana nominal ini, sisa alokasi rencana akan menjadi <strong className="font-mono">{formatRupiah(projectedRemaining)}</strong>.
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kode Plan Budget */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kode Plan Budget <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.PlanCode}
                    onChange={(e) => setFormData({ ...formData, PlanCode: e.target.value })}
                    placeholder="Contoh: PLN-1020440-01"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-mono font-semibold focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status Rencana
                  </label>
                  <select
                    value={formData.Status}
                    onChange={(e) => setFormData({ ...formData, Status: e.target.value as PlanStatus })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red cursor-pointer font-medium"
                  >
                    <option value={PlanStatus.PLANNED}>Rencana (Planned)</option>
                    <option value={PlanStatus.IN_PROGRESS}>Berjalan (In Progress)</option>
                    <option value={PlanStatus.COMPLETED}>Selesai (Completed)</option>
                    <option value={PlanStatus.CANCELLED}>Batal (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Title / Judul Rencana */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Judul / Nama Rencana Pemakaian <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.Title}
                  onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
                  placeholder="Contoh: Pembayaran PBB & Pajak Lisensi Pabrik Karawang"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium"
                  required
                />
              </div>

              {/* Vendor / Pihak Ketiga (Editable) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-600" />
                    <span>Vendor / Pihak Ketiga Pelaksana</span>
                  </span>
                  <span className="text-[10px] text-amber-600 font-normal">Dapat di-edit kapan saja</span>
                </label>
                <input
                  type="text"
                  value={formData.Vendor}
                  onChange={(e) => setFormData({ ...formData, Vendor: e.target.value })}
                  placeholder="Contoh: PT Sucofindo / Assegaf Hamzah & Partners / Kantor Notaris"
                  className="w-full px-3.5 py-2 bg-amber-50/50 border border-amber-200/80 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Planned Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nominal Target Rencana (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.PlannedAmount}
                    onChange={(e) => setFormData({ ...formData, PlannedAmount: e.target.value })}
                    placeholder="Contoh: 2000000000"
                    min="1"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 font-mono font-bold focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    required
                  />
                  {formData.PlannedAmount && (
                    <p className="text-[10px] text-amber-600 font-mono mt-1">
                      {formatRupiah(parseFloat(formData.PlannedAmount) || 0)}
                    </p>
                  )}
                </div>

                {/* PIC */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    PIC Penanggung Jawab <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.PIC}
                    onChange={(e) => setFormData({ ...formData, PIC: e.target.value })}
                    placeholder="Nama Penanggung Jawab"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red"
                    required
                  />
                </div>
              </div>

              {/* Target Period (Start and End Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tanggal Mulai Target
                  </label>
                  <input
                    type="date"
                    value={formData.StartDate}
                    onChange={(e) => setFormData({ ...formData, StartDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:ring-2 focus:ring-brand-red/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    Tanggal Selesai Target
                  </label>
                  <input
                    type="date"
                    value={formData.EndDate}
                    onChange={(e) => setFormData({ ...formData, EndDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:ring-2 focus:ring-brand-red/20"
                    required
                  />
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan Tambahan / Keterangan Detail
                </label>
                <textarea
                  value={formData.Notes}
                  onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
                  placeholder="Rincian ruang lingkup rencana penggunaan..."
                  rows={2}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-red hover:bg-red-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Memproses..." : editingPlan ? "Simpan Perubahan" : "Buat Plan Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 font-display">Konfirmasi Hapus Plan Budget</h3>
                <p className="text-xs text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              Apakah Anda yakin ingin menghapus Plan Budget ini? Transaksi realisasi terkait tidak akan dihapus, tetapi hubungan alokasinya ke Plan ini akan dilepas.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-all"
              >
                {isSubmitting ? "Menghapus..." : "Ya, Hapus Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
