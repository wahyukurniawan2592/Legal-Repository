/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Search, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle,
  FileText
} from "lucide-react";
import { Budget, Actual, Category, BudgetStatus } from "../types";

interface BudgetMonitoringViewProps {
  budgets: Budget[];
  actuals: Actual[];
  categories: Category[];
  addToast: (msg: string, type: "success" | "error" | "info") => void;
  activeCompany?: string;
}

type SortField = "BudgetCode" | "Category" | "Budget" | "Actual" | "Remaining" | "Utilization";
type SortOrder = "asc" | "desc";

export default function BudgetMonitoringView({
  budgets,
  actuals,
  categories,
  addToast
}: BudgetMonitoringViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("2026");
  const [filterCategory, setFilterCategory] = useState("All");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("BudgetCode");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const years = Array.from(new Set(budgets.map(b => b.Year))).sort((a, b) => b - a);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Build rows combining Budgets and Actuals
  const monitoringData = budgets.map(b => {
    const spent = actuals
      .filter(a => a.BudgetID === b.BudgetID)
      .reduce((sum, a) => sum + a.Amount, 0);
    
    const remaining = b.BudgetAmount - spent;
    const utilization = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;

    return {
      BudgetID: b.BudgetID,
      Year: b.Year,
      BudgetCode: b.BudgetCode,
      Category: b.Category,
      BudgetAmount: b.BudgetAmount,
      ActualSpent: spent,
      Remaining: remaining,
      Utilization: utilization,
      PIC: b.PIC,
      Status: b.Status,
      Description: b.Description
    };
  });

  // Filter rows
  const filteredData = monitoringData.filter(row => {
    const matchesSearch = 
      row.BudgetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.Category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.PIC.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesYear = filterYear === "All" || row.Year.toString() === filterYear;
    const matchesCategory = filterCategory === "All" || row.Category === filterCategory;

    return matchesSearch && matchesYear && matchesCategory;
  });

  // Sort rows
  const sortedData = [...filteredData].sort((a, b) => {
    let valA: any = a.BudgetCode;
    let valB: any = b.BudgetCode;

    if (sortField === "Category") {
      valA = a.Category;
      valB = b.Category;
    } else if (sortField === "Budget") {
      valA = a.BudgetAmount;
      valB = b.BudgetAmount;
    } else if (sortField === "Actual") {
      valA = a.ActualSpent;
      valB = b.ActualSpent;
    } else if (sortField === "Remaining") {
      valA = a.Remaining;
      valB = b.Remaining;
    } else if (sortField === "Utilization") {
      valA = a.Utilization;
      valB = b.Utilization;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination bounds
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Export CSV/Excel
  const handleExportCSV = () => {
    try {
      const headers = [
        "Tahun",
        "Kode Anggaran",
        "Kategori",
        "Deskripsi Anggaran",
        "Nominal Anggaran (Rp)",
        "Total Realisasi (Rp)",
        "Sisa Anggaran (Rp)",
        "Tingkat Utilisasi (%)",
        "Jumlah Transaksi",
        "Penanggung Jawab (PIC)",
        "Status Anggaran"
      ];
      const rows = sortedData.map(row => {
        const txCount = actuals.filter(a => a.BudgetID === row.BudgetID).length;
        return [
          row.Year,
          row.BudgetCode,
          row.Category,
          row.Description || "-",
          row.BudgetAmount,
          row.ActualSpent,
          row.Remaining,
          row.Utilization.toFixed(2) + "%",
          txCount,
          row.PIC,
          row.Status
        ];
      });

      const csvContent = "\uFEFF" + [ // Add UTF-8 BOM for flawless Excel rendering
        headers.join(","),
        ...rows.map(e => e.map(val => {
          const stringVal = String(val);
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
      link.setAttribute("download", `Legal_Budget_Monitoring_FY${filterYear}_Detailed.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Ekspor berkas laporan detail selesai!", "success");
    } catch (err) {
      addToast("Gagal melakukan ekspor data.", "error");
    }
  };

  // Trigger browser printing
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-gray-800">Budget Monitoring</h1>
          <p className="text-xs text-gray-500">Lembar kendali realisasi anggaran, deviasi sisa dana, dan persentase utilisasi secara akurat</p>
        </div>

        <div className="flex items-center space-x-2 self-start">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:text-brand-red hover:bg-red-50/50 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel (CSV)</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-brand-dark text-white hover:bg-black px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan / PDF</span>
          </button>
        </div>
      </div>

      {/* Searching & Filters (Hidden during print) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center gap-4 no-print">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kode, kategori, atau PIC..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-brand-red focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Year */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Tahun Fiskal:</span>
          <select
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-56 py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red cursor-pointer"
          >
            <option value="All">Semua Tahun Fiskal</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>{y} (April {y} - Maret {y + 1})</option>
            ))}
            {!years.includes(2026) && <option value="2026">2026 (April 2026 - Maret 2027)</option>}
          </select>
        </div>

        {/* Filter Category */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs text-gray-400 font-mono whitespace-nowrap">Kategori:</span>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-44 py-2 px-3 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="All">Semua Kategori</option>
            {categories.map(c => (
              <option key={c.CategoryID} value={c.CategoryName}>{c.CategoryName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Screen Layout: Paginated and interactive table (Hidden on Print) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden print-card no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50">
                <th 
                  onClick={() => handleSort("BudgetCode")}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Kode</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("Category")}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Kategori</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("Budget")}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-right font-semibold"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Nominal</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("Actual")}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-right font-semibold"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Realisasi (Actual)</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("Remaining")}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-right font-semibold"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Sisa (Remaining)</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("Utilization")}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none text-center font-semibold"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Utilisasi (%)</span>
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4">PIC</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentItems.length > 0 ? (
                currentItems.map((row) => (
                  <tr key={row.BudgetID} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="py-3 px-4 font-mono font-bold text-brand-dark">
                      <div className="text-brand-dark">{row.BudgetCode}</div>
                      <div className="text-[9px] text-gray-400 font-normal truncate max-w-[150px]" title={row.Description}>
                        {row.Description || "-"}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {row.Category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-800">{formatRupiah(row.BudgetAmount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-brand-red">{formatRupiah(row.ActualSpent)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${row.Remaining < 0 ? "text-red-600 animate-pulse" : "text-emerald-600"}`}>
                      {formatRupiah(row.Remaining)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className={`text-[10px] font-bold ${row.Utilization > 100 ? "text-red-600" : "text-gray-700"}`}>
                            {row.Utilization.toFixed(1)}%
                          </span>
                          {row.Utilization > 100 && <AlertTriangle className="w-3 h-3 text-red-600" title="Over Budget!" />}
                        </div>
                        {/* Compact progress bar */}
                        <div className="w-20 bg-gray-100 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${row.Utilization > 100 ? "bg-red-600" : "bg-brand-red"}`}
                            style={{ width: `${Math.min(row.Utilization, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{row.PIC.split(" ")[0]}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.Status === BudgetStatus.ACTIVE ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {row.Status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    Tidak ada data kontrol anggaran hukum yang memenuhi filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Client-side Pagination (Hidden during Print) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50 gap-4">
            <span className="text-xs text-gray-500 font-mono">
              Menampilkan {indexOfFirstItem + 1} s/d {Math.min(indexOfLastItem, totalItems)} dari {totalItems} mata anggaran
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-white text-gray-500 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7.5 h-7.5 text-xs font-semibold rounded-lg border transition-colors ${
                    currentPage === page 
                      ? "bg-brand-red text-white border-brand-red" 
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-white text-gray-500 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PRINT-ONLY COMPLETE DETAILED PDF REPORT VIEW */}
      <div className="hidden print:block space-y-6 text-black bg-white p-4">
        {/* Professional Corporate Header */}
        <div className="text-center space-y-1.5 pb-6 border-b-2 border-gray-900 relative">
          <div className="text-xs font-mono tracking-widest font-bold text-gray-500 uppercase">PT AJINOMOTO INDONESIA</div>
          <h1 className="text-lg font-bold font-display uppercase tracking-tight text-gray-900">Laporan Monitoring Anggaran Hukum (Rolling Forecast)</h1>
          <p className="text-[10px] text-gray-500 font-mono">
            Tahun Anggaran: {filterYear === "All" ? "Semua Tahun" : filterYear} | Kategori: {filterCategory === "All" ? "Semua Kategori" : filterCategory}
          </p>
          <p className="text-[9px] text-gray-400 font-mono absolute top-0 right-0">Confidential / Internal Only</p>
        </div>

        {/* Detailed Statistics Grid for Print */}
        <div className="grid grid-cols-4 gap-4 py-4 text-xs font-sans border-b border-gray-200">
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <p className="text-gray-400 text-[9px] font-semibold uppercase tracking-wider font-mono">Total Budget</p>
            <p className="text-sm font-bold text-gray-900">{formatRupiah(sortedData.reduce((sum, r) => sum + r.BudgetAmount, 0))}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <p className="text-gray-400 text-[9px] font-semibold uppercase tracking-wider font-mono">Total Realisasi</p>
            <p className="text-sm font-bold text-red-600">{formatRupiah(sortedData.reduce((sum, r) => sum + r.ActualSpent, 0))}</p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <p className="text-gray-400 text-[9px] font-semibold uppercase tracking-wider font-mono">Sisa Anggaran</p>
            <p className="text-sm font-bold text-emerald-600">
              {formatRupiah(sortedData.reduce((sum, r) => sum + r.BudgetAmount, 0) - sortedData.reduce((sum, r) => sum + r.ActualSpent, 0))}
            </p>
          </div>
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
            <p className="text-gray-400 text-[9px] font-semibold uppercase tracking-wider font-mono">Rata Utilisasi</p>
            <p className="text-sm font-bold text-gray-900">
              {(sortedData.reduce((sum, r) => sum + r.BudgetAmount, 0) > 0 
                ? (sortedData.reduce((sum, r) => sum + r.ActualSpent, 0) / sortedData.reduce((sum, r) => sum + r.BudgetAmount, 0)) * 100 
                : 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Full Expanded Table of All Items */}
        <table className="w-full text-left text-[10px] border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-mono font-bold uppercase tracking-wider">
              <th className="py-2 px-3 border border-gray-300">Kode</th>
              <th className="py-2 px-3 border border-gray-300">Kategori</th>
              <th className="py-2 px-3 border border-gray-300">Deskripsi Anggaran</th>
              <th className="py-2 px-3 border border-gray-300 text-right">Nominal</th>
              <th className="py-2 px-3 border border-gray-300 text-right">Realisasi (Actual)</th>
              <th className="py-2 px-3 border border-gray-300 text-right">Sisa (Remaining)</th>
              <th className="py-2 px-3 border border-gray-300 text-center">Utilisasi (%)</th>
              <th className="py-2 px-3 border border-gray-300">PIC</th>
              <th className="py-2 px-3 border border-gray-300 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {sortedData.map((row) => (
              <tr key={row.BudgetID} className="page-break-inside-avoid">
                <td className="py-2 px-3 border border-gray-300 font-mono font-bold whitespace-nowrap text-gray-900">{row.BudgetCode}</td>
                <td className="py-2 px-3 border border-gray-300 whitespace-nowrap">{row.Category}</td>
                <td className="py-2 px-3 border border-gray-300 leading-relaxed max-w-xs">{row.Description || "-"}</td>
                <td className="py-2 px-3 border border-gray-300 text-right font-semibold text-gray-900">{formatRupiah(row.BudgetAmount)}</td>
                <td className="py-2 px-3 border border-gray-300 text-right font-bold text-red-600">{formatRupiah(row.ActualSpent)}</td>
                <td className={`py-2 px-3 border border-gray-300 text-right font-bold ${row.Remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatRupiah(row.Remaining)}
                </td>
                <td className="py-2 px-3 border border-gray-300 text-center font-bold">
                  {row.Utilization.toFixed(1)}%
                </td>
                <td className="py-2 px-3 border border-gray-300 whitespace-nowrap">{row.PIC}</td>
                <td className="py-2 px-3 border border-gray-300 text-center font-semibold uppercase">{row.Status}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Corporate Signatures */}
        <div className="mt-12 flex justify-end text-center text-xs font-sans pt-8 border-t border-gray-200 page-break-inside-avoid">
          <div className="w-64 space-y-2">
            <p className="text-gray-700 font-semibold">Disusun oleh Legal Department</p>
            <div className="h-16 flex items-center justify-center">
              <span className="text-gray-600 font-sans italic text-base font-semibold tracking-widest">( ttd. )</span>
            </div>
            <div className="border-t border-gray-400 pt-1">
              <p className="font-bold text-gray-900">Legal Department</p>
              <p className="text-[10px] text-gray-500 font-mono">PT AJINOMOTO INDONESIA</p>
            </div>
          </div>
        </div>

        {/* Footer print stamp */}
        <div className="text-center text-[8px] text-gray-400 font-mono pt-12">
          Laporan ini dicetak secara otomatis dari Sistem Ajinomoto Legal Budget Monitoring pada tanggal {new Date().toLocaleString("id-ID")}.
        </div>
      </div>

    </div>
  );
}
