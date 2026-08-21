/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Printer, 
  Download, 
  ChevronRight, 
  Calendar, 
  PieChart as PieIcon, 
  TrendingUp, 
  Activity, 
  Award,
  DollarSign,
  AlertCircle,
  Paperclip,
  Eye,
  X
} from "lucide-react";
import { Budget, Actual, Category, PlanBudget } from "../types";

interface ReportViewProps {
  budgets: Budget[];
  plans?: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  addToast: (msg: string, type: "success" | "error" | "info") => void;
  activeCompany?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International";
}

type ReportType = "monthly" | "annual" | "category" | "actual" | "utilization";

export default function ReportView({
  budgets,
  plans = [],
  actuals,
  categories,
  addToast,
  activeCompany = "ALL"
}: ReportViewProps) {
  const getCompanyDisplayName = (comp?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International") => {
    if (comp === "PT Ajinomoto Indonesia") return "PT Ajinomoto Indonesia";
    if (comp === "PT Ajinex International") return "PT Ajinex International";
    return "PT Ajinomoto Indonesia & PT Ajinex International";
  };

  const [selectedReport, setSelectedReport] = useState<ReportType>("annual");
  const [reportYear, setReportYear] = useState<string>("2026");
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

  const years = Array.from(new Set(budgets.map(b => b.Year))).sort((a, b) => b - a);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const activeBudgets = budgets.filter(b => b.Status === "Active" && (reportYear === "All" || b.Year.toString() === reportYear));
  const activeActuals = actuals.filter(a => {
    const b = budgets.find(bg => bg.BudgetID === a.BudgetID);
    return b && (reportYear === "All" || b.Year.toString() === reportYear);
  });

  const totalBudget = activeBudgets.reduce((sum, b) => sum + b.BudgetAmount, 0);
  const totalActual = activeActuals.reduce((sum, a) => sum + a.Amount, 0);
  const remainingBudget = totalBudget - totalActual;
  const utilizationRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  // Monthly Spending calculation (Ordered by Custom Fiscal Year: April to Maret)
  const getMonthlyBreakdown = () => {
    const fiscalMonths = [
      { name: "April", index: 3 },
      { name: "Mei", index: 4 },
      { name: "Juni", index: 5 },
      { name: "Juli", index: 6 },
      { name: "Agustus", index: 7 },
      { name: "September", index: 8 },
      { name: "Oktober", index: 9 },
      { name: "November", index: 10 },
      { name: "Desember", index: 11 },
      { name: "Januari", index: 0 },
      { name: "Februari", index: 1 },
      { name: "Maret", index: 2 }
    ];
    return fiscalMonths.map((m) => {
      const spent = activeActuals
        .filter(a => new Date(a.TransactionDate).getMonth() === m.index)
        .reduce((sum, a) => sum + a.Amount, 0);
      return { monthName: m.name, spent };
    });
  };

  const monthlyBreakdown = getMonthlyBreakdown();

  // Category summary calculation
  const getCategorySummary = () => {
    return categories.map(cat => {
      const budgetAmount = activeBudgets
        .filter(b => b.Category === cat.CategoryName)
        .reduce((sum, b) => sum + b.BudgetAmount, 0);
      const spentAmount = activeActuals
        .filter(a => a.Category === cat.CategoryName)
        .reduce((sum, a) => sum + a.Amount, 0);
      return {
        categoryName: cat.CategoryName,
        budget: budgetAmount,
        spent: spentAmount,
        remaining: budgetAmount - spentAmount,
        utilization: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
      };
    }).filter(c => c.budget > 0 || c.spent > 0);
  };

  const categorySummary = getCategorySummary();

  const handlePrint = () => {
    try {
      let tableHtml = "";
      let titleReport = "";
      
      if (selectedReport === "annual") {
        titleReport = "Rolling Forecast Report";
        tableHtml = `
          <table class="w-full text-left text-xs border-collapse border border-gray-200">
            <thead>
              <tr class="border-b-2 border-gray-300 bg-gray-100 font-bold">
                <th class="py-2.5 px-3 border-r border-gray-200">Kode</th>
                <th class="py-2.5 px-3 border-r border-gray-200">Kategori</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Nominal Plafon</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Realisasi Terpakai</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Sisa Anggaran</th>
                <th class="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${activeBudgets.map(b => {
                const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
                const rem = b.BudgetAmount - spent;
                return `
                  <tr class="hover:bg-gray-50/50">
                    <td class="py-2 px-3 font-mono font-bold border-r border-gray-200">${b.BudgetCode}</td>
                    <td class="py-2 px-3 border-r border-gray-200">${b.Category}</td>
                    <td class="py-2 px-3 text-right font-semibold border-r border-gray-200">${formatRupiah(b.BudgetAmount)}</td>
                    <td class="py-2 px-3 text-right font-bold text-red-600 border-r border-gray-200">${formatRupiah(spent)}</td>
                    <td class="py-2 px-3 text-right font-bold ${rem < 0 ? 'text-red-700' : 'text-emerald-700'} border-r border-gray-200">${formatRupiah(rem)}</td>
                    <td class="py-2 px-3 text-center">Active</td>
                  </tr>
                `;
              }).join("")}
              <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="py-3 px-3 border-r border-gray-200" colspan="2">TOTAL</td>
                <td class="py-3 px-3 text-right border-r border-gray-200">${formatRupiah(totalBudget)}</td>
                <td class="py-3 px-3 text-right text-red-600 border-r border-gray-200">${formatRupiah(totalActual)}</td>
                <td class="py-3 px-3 text-right ${remainingBudget < 0 ? 'text-red-700' : 'text-emerald-700'} border-r border-gray-200">${formatRupiah(remainingBudget)}</td>
                <td class="py-3 px-3 text-center">${utilizationRate.toFixed(1)}% Util</td>
              </tr>
            </tbody>
          </table>
        `;
      } else if (selectedReport === "monthly") {
        titleReport = "Monthly Budget Report";
        tableHtml = `
          <table class="w-full text-left text-xs border-collapse border border-gray-200">
            <thead>
              <tr class="border-b-2 border-gray-300 bg-gray-100 font-bold">
                <th class="py-2.5 px-3 border-r border-gray-200">Bulan</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Realisasi Pengeluaran (Actual)</th>
                <th class="py-2.5 px-3 text-center">Proporsi Terhadap Total Actual</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${monthlyBreakdown.map(m => `
                <tr class="hover:bg-gray-50/50">
                  <td class="py-2 px-3 font-semibold border-r border-gray-200">${m.monthName}</td>
                  <td class="py-2 px-3 text-right font-bold border-r border-gray-200">${formatRupiah(m.spent)}</td>
                  <td class="py-2 px-3 text-center font-mono">${totalActual > 0 ? ((m.spent / totalActual) * 100).toFixed(1) : "0.0"}%</td>
                </tr>
              `).join("")}
              <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="py-3 px-3 border-r border-gray-200">TOTAL</td>
                <td class="py-3 px-3 text-right text-red-600 border-r border-gray-200">${formatRupiah(totalActual)}</td>
                <td class="py-3 px-3 text-center">100.0%</td>
              </tr>
            </tbody>
          </table>
        `;
      } else if (selectedReport === "category") {
        titleReport = "Category Summary Report";
        tableHtml = `
          <table class="w-full text-left text-xs border-collapse border border-gray-200">
            <thead>
              <tr class="border-b-2 border-gray-300 bg-gray-100 font-bold">
                <th class="py-2.5 px-3 border-r border-gray-200">Kategori Legal</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Nominal Kumulatif</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Realisasi Kumulatif</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Sisa Kumulatif</th>
                <th class="py-2.5 px-3 text-center">Utilisasi (%)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${categorySummary.map(c => `
                <tr class="hover:bg-gray-50/50">
                  <td class="py-2 px-3 font-bold border-r border-gray-200">${c.categoryName}</td>
                  <td class="py-2 px-3 text-right font-semibold border-r border-gray-200">${formatRupiah(c.budget)}</td>
                  <td class="py-2 px-3 text-right font-bold text-red-600 border-r border-gray-200">${formatRupiah(c.spent)}</td>
                  <td class="py-2 px-3 text-right font-bold ${c.remaining < 0 ? 'text-red-700' : 'text-emerald-700'} border-r border-gray-200">${formatRupiah(c.remaining)}</td>
                  <td class="py-2 px-3 text-center font-mono">${c.utilization.toFixed(1)}%</td>
                </tr>
              `).join("")}
              <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="py-3 px-3 border-r border-gray-200">TOTAL KUMULATIF</td>
                <td class="py-3 px-3 text-right border-r border-gray-200">${formatRupiah(totalBudget)}</td>
                <td class="py-3 px-3 text-right text-red-600 border-r border-gray-200">${formatRupiah(totalActual)}</td>
                <td class="py-3 px-3 text-right ${remainingBudget < 0 ? 'text-red-700' : 'text-emerald-700'} border-r border-gray-200">${formatRupiah(remainingBudget)}</td>
                <td class="py-3 px-3 text-center font-mono">${utilizationRate.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        `;
      } else if (selectedReport === "actual") {
        titleReport = "Actual Cost Expense Report";
        tableHtml = `
          <table class="w-full text-left text-xs border-collapse border border-gray-200">
            <thead>
              <tr class="border-b-2 border-gray-300 bg-gray-100 font-bold">
                <th class="py-2.5 px-3 border-r border-gray-200">Tanggal</th>
                <th class="py-2.5 px-3 border-r border-gray-200">Kode</th>
                <th class="py-2.5 px-3 border-r border-gray-200">Kategori</th>
                <th class="py-2.5 px-3 border-r border-gray-200">Deskripsi</th>
                <th class="py-2.5 px-3 text-right border-r border-gray-200">Nominal</th>
                <th class="py-2.5 px-3">Pencatat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${activeActuals.map(a => {
                const code = budgets.find(bg => bg.BudgetID === a.BudgetID)?.BudgetCode || "N/A";
                return `
                  <tr class="hover:bg-gray-50/50">
                    <td class="py-2 px-3 font-mono whitespace-nowrap border-r border-gray-200">${a.TransactionDate}</td>
                    <td class="py-2 px-3 font-mono font-bold border-r border-gray-200">${code}</td>
                    <td class="py-2 px-3 whitespace-nowrap border-r border-gray-200">${a.Category}</td>
                    <td class="py-2 px-3 text-gray-600 border-r border-gray-200">${a.Description}</td>
                    <td class="py-2 px-3 text-right font-bold border-r border-gray-200">${formatRupiah(a.Amount)}</td>
                    <td class="py-2 px-3">${a.CreatedBy}</td>
                  </tr>
                `;
              }).join("")}
              <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="py-3 px-3 border-r border-gray-200" colspan="4">TOTAL REALISASI</td>
                <td class="py-3 px-3 text-right text-red-600 border-r border-gray-200">${formatRupiah(totalActual)}</td>
                <td class="py-3 px-3"></td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        titleReport = "Budget Utilization Audit";
        tableHtml = `
          <table class="w-full text-left text-xs border-collapse border border-gray-200">
            <thead>
              <tr class="border-b-2 border-gray-300 bg-gray-100 font-bold">
                <th class="py-2.5 px-3 border-r border-gray-200">Kode Budget</th>
                <th class="py-2.5 px-3 border-r border-gray-200">Nominal Plafon</th>
                <th class="py-2.5 px-3 border-r border-gray-200">Realisasi Terpakai</th>
                <th class="py-2.5 px-3 text-center">Status Utilisasi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${activeBudgets.map(b => {
                const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
                const rate = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;
                return `
                  <tr class="hover:bg-gray-50/50">
                    <td class="py-2 px-3 font-mono font-bold border-r border-gray-200">${b.BudgetCode}</td>
                    <td class="py-2 px-3 font-semibold border-r border-gray-200">${formatRupiah(b.BudgetAmount)}</td>
                    <td class="py-2 px-3 font-bold text-red-600 border-r border-gray-200">${formatRupiah(spent)}</td>
                    <td class="py-2 px-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rate > 100 ? 'bg-red-100 text-red-800' :
                        rate > 85 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }">
                        ${rate.toFixed(1)}% [${rate > 100 ? 'Over Budget' : rate > 85 ? 'Mendekati Batas' : 'Wajar'}]
                      </span>
                    </td>
                  </tr>
                `;
              }).join("")}
              <tr class="bg-gray-100 font-bold border-t-2 border-gray-300">
                <td class="py-3 px-3 border-r border-gray-200">TOTAL</td>
                <td class="py-3 px-3 font-semibold border-r border-gray-200">${formatRupiah(totalBudget)}</td>
                <td class="py-3 px-3 text-right font-bold text-red-600 border-r border-gray-200">${formatRupiah(totalActual)}</td>
                <td class="py-3 px-3 text-center">${utilizationRate.toFixed(1)}% Average</td>
              </tr>
            </tbody>
          </table>
        `;
      }

      const standaloneHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${titleReport} - ${getCompanyDisplayName(activeCompany)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      color: #1f2937;
    }
    h1, h2, h3 {
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    @media print {
      .no-print { display: none !important; }
      body { padding: 0; margin: 0; background: white; }
    }
  </style>
</head>
<body class="bg-slate-50 p-6 md:p-12">
  <div class="max-w-4xl mx-auto bg-white p-8 md:p-12 border border-gray-200 rounded-3xl shadow-md">
    
    <!-- Action Banner for HTML View only -->
    <div class="no-print mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex justify-between items-center text-xs text-red-800">
      <div>
        <p class="font-bold">🖥️ Mode Cetak Presisi Tinggi</p>
        <p>File ini siap dicetak dengan tata letak rapi. Tekan tombol kanan atau kombinasi tombol <b>Ctrl + P</b> (atau Cmd + P di Mac) untuk mencetak atau menyimpannya langsung ke bentuk PDF.</p>
      </div>
      <button onclick="window.print()" class="bg-red-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition-all cursor-pointer shadow-xs">Cetak Sekarang</button>
    </div>

    <!-- Header Inside Sheet -->
    <div class="flex justify-between items-start border-b-2 border-red-600 pb-5 mb-6">
      <div class="flex items-start gap-4">
        <div>
          <div class="text-xs font-bold text-red-600 font-sans leading-tight">Eat Well, Live Well.</div>
          <div class="text-xl font-black font-sans text-red-600 tracking-wider">AJINOMOTO<span class="text-[10px] font-bold ml-0.5">®</span></div>
        </div>
        <div class="h-10 w-px bg-gray-300"></div>
        <div>
          <p class="text-[10px] font-mono font-bold text-red-600 uppercase tracking-widest">${getCompanyDisplayName(activeCompany)}</p>
          <h2 class="text-2xl font-bold text-gray-800">${titleReport}</h2>
          <p class="text-xs text-gray-500">Rekapitulasi Keuangan Divisi Hukum &amp; Kepatuhan Internal | Tahun Anggaran ${reportYear}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-[10px] font-mono text-gray-400 block">Tanggal Rekap: ${new Date().toISOString().split("T")[0]}</span>
        <span class="text-xs font-semibold text-emerald-600">Dokumen Hukum Resmi</span>
      </div>
    </div>

    <!-- Financial Summary Bar -->
    <div class="grid grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200/60 mb-6">
      <div>
        <p class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Total Budget</p>
        <p class="text-sm font-bold text-gray-800 mt-1">${formatRupiah(totalBudget)}</p>
      </div>
      <div>
        <p class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Total Terpakai</p>
        <p class="text-sm font-bold text-red-600 mt-1">${formatRupiah(totalActual)}</p>
      </div>
      <div>
        <p class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Sisa Anggaran</p>
        <p class="text-sm font-bold text-emerald-600 mt-1">${formatRupiah(remainingBudget)}</p>
      </div>
      <div>
        <p class="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Tingkat Penyerapan</p>
        <p class="text-sm font-bold text-gray-800 mt-1">${utilizationRate.toFixed(1)}%</p>
      </div>
    </div>

    <!-- Table Content Area -->
    <div class="mb-8 overflow-x-auto">
      ${tableHtml}
    </div>

    <!-- Description or Note Context -->
    <div class="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 leading-relaxed mb-10">
      <h3 class="font-bold text-gray-800 mb-1">Catatan Keuangan & Penjelasan Konteks:</h3>
      <p>Laporan keuangan di atas menyajikan rincian realisasi pengeluaran legal berlandaskan data operasional resmi. Tingkat penyerapan komparatif ini merupakan komitmen berkelanjutan dari divisi hukum untuk menjaga ketaatan kepatuhan hukum korporasi (legal compliance) ${getCompanyDisplayName(activeCompany)} secara optimal di bawah naungan anggaran yang efisien dan akuntabel.</p>
    </div>

    <!-- Report Footer / Signature -->
    <div class="mt-14 pt-8 border-t border-gray-200 flex justify-end text-xs">
      <div class="w-64 text-center space-y-2">
        <p class="text-gray-700 font-semibold">Disusun oleh Legal Department</p>
        <div class="h-16 flex items-center justify-center">
          <span class="text-gray-600 font-sans italic text-base font-semibold tracking-widest">( ttd. )</span>
        </div>
        <div class="border-t border-gray-400 pt-1">
          <p class="font-bold text-gray-900">Legal Department</p>
          <p class="text-[10px] text-gray-500 font-mono">${getCompanyDisplayName(activeCompany)}</p>
        </div>
      </div>
    </div>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
      `;

      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(standaloneHtml);
        printWin.document.close();
        printWin.focus();
        addToast("Membuka tampilan cetak presisi tinggi... Dialog PDF akan muncul secara otomatis.", "success");
      } else {
        window.print();
        addToast("Membuka dialog cetak halaman...", "info");
      }
    } catch (err) {
      console.error(err);
      window.print();
    }
  };

  const handleExportCSV = () => {
    try {
      let csvContent = "";
      let filename = `Legal_Report_Detail_${selectedReport}_${reportYear}.csv`;
      
      if (selectedReport === "annual") {
        csvContent = [
          "ROLLING FORECAST REPORT - LEGAL DEPARTMENT PT AJINOMOTO INDONESIA",
          `Tahun Anggaran,${reportYear}`,
          `Periode Fiskal,April ${reportYear} - Maret ${Number(reportYear) + 1}`,
          `Total Plafon Anggaran (IDR),${totalBudget}`,
          `Total Realisasi Terpakai (IDR),${totalActual}`,
          `Sisa Anggaran (IDR),${remainingBudget}`,
          `Tingkat Penyerapan (%),${utilizationRate.toFixed(2)}%`,
          `Tanggal Ekspor,${new Date().toISOString()}`,
          "",
          "ID Budget,Kode Budget,Tahun Fiskal,Periode Fiskal,Kategori Beban,PIC Pengelola,Deskripsi Anggaran,Plafon Anggaran (IDR),Total Realisasi Terpakai (IDR),Sisa Anggaran (IDR),Penyerapan (%),Status Anggaran,Tanggal Buat"
        ].join("\n") + "\n" + 
        activeBudgets.map(b => {
          const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
          const rem = b.BudgetAmount - spent;
          const util = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;
          return `"${b.BudgetID}","${b.BudgetCode}",${b.Year},"April ${b.Year} - Maret ${b.Year + 1}","${b.Category}","${b.PIC || ''}","${(b.Description || '').replace(/"/g, '""')}",${b.BudgetAmount},${spent},${rem},${util.toFixed(2)},"${b.Status}","${b.CreatedDate || ''}"`;
        }).join("\n") + "\n" +
        `"TOTAL","TOTAL REKAPITULASI",${reportYear},"April ${reportYear} - Maret ${Number(reportYear) + 1}","SEMUA KATEGORI","ALL PIC","Rekapitulasi Kumulatif",${totalBudget},${totalActual},${remainingBudget},${utilizationRate.toFixed(2)},"Active","${new Date().toISOString().split("T")[0]}"`;
      } else if (selectedReport === "monthly") {
        csvContent = [
          "MONTHLY BUDGET EXPENSE REPORT - LEGAL DEPARTMENT PT AJINOMOTO INDONESIA",
          `Tahun Anggaran,${reportYear}`,
          `Total Realisasi Kumulatif (IDR),${totalActual}`,
          `Tanggal Ekspor,${new Date().toISOString()}`,
          "",
          "Nama Bulan Fiskal,Index Bulan,Realisasi Pengeluaran (IDR),Proporsi Terhadap Total (%),Tahun Anggaran,Periode Fiskal"
        ].join("\n") + "\n" + 
        monthlyBreakdown.map((m, idx) => {
          const prop = totalActual > 0 ? (m.spent / totalActual) * 100 : 0;
          return `"${m.monthName}",${idx + 1},${m.spent},${prop.toFixed(2)},${reportYear},"April ${reportYear} - Maret ${Number(reportYear) + 1}"`;
        }).join("\n") + "\n" +
        `"TOTAL KUMULATIF",13,${totalActual},100.00,${reportYear},"April ${reportYear} - Maret ${Number(reportYear) + 1}"`;
      } else if (selectedReport === "category") {
        csvContent = [
          "CATEGORY SUMMARY REPORT - LEGAL DEPARTMENT PT AJINOMOTO INDONESIA",
          `Tahun Anggaran,${reportYear}`,
          `Total Plafon Anggaran (IDR),${totalBudget}`,
          `Total Realisasi Terpakai (IDR),${totalActual}`,
          `Sisa Likuiditas Anggaran (IDR),${remainingBudget}`,
          `Tanggal Ekspor,${new Date().toISOString()}`,
          "",
          "Kategori Legal,Total Anggaran Kumulatif (IDR),Total Realisasi Terpakai (IDR),Sisa Anggaran (IDR),Penyerapan (%),Tahun Anggaran"
        ].join("\n") + "\n" + 
        categorySummary.map(c => `"${c.categoryName}",${c.budget},${c.spent},${c.remaining},${c.utilization.toFixed(2)},${reportYear}`).join("\n") + "\n" +
        `"TOTAL KUMULATIF",${totalBudget},${totalActual},${remainingBudget},${utilizationRate.toFixed(2)},${reportYear}`;
      } else if (selectedReport === "actual") {
        csvContent = [
          "ACTUAL EXPENSE COST JOURNAL REPORT - LEGAL DEPARTMENT PT AJINOMOTO INDONESIA",
          `Tahun Anggaran,${reportYear}`,
          `Total Realisasi Pengeluaran (IDR),${totalActual}`,
          `Total Jumlah Transaksi,${activeActuals.length}`,
          `Tanggal Ekspor,${new Date().toISOString()}`,
          "",
          "ID Realisasi,Tanggal Transaksi,ID Budget,Kode Budget,Kategori Beban,ID Plan Budget,Kode Plan Budget,No. Referensi/Invoice,Deskripsi Transaksi,Nominal Transaksi (IDR),Pencatat (Created By),Catatan Internal,Lampiran File,Tipe File,Tanggal Input"
        ].join("\n") + "\n" + 
        activeActuals.map(a => {
          const code = budgets.find(bg => bg.BudgetID === a.BudgetID)?.BudgetCode || "N/A";
          const pCode = plans.find(p => p.PlanID === a.PlanID)?.PlanCode || "-";
          return `"${a.ActualID}","${a.TransactionDate}","${a.BudgetID}","${code}","${a.Category}","${a.PlanID || ''}","${pCode}","${(a.ReferenceNumber || '').replace(/"/g, '""')}","${(a.Description || '').replace(/"/g, '""')}",${a.Amount},"${a.CreatedBy || ''}","${(a.Notes || '').replace(/"/g, '""')}","${(a.AttachmentName || '').replace(/"/g, '""')}","${a.AttachmentType || ''}","${a.CreatedDate || ''}"`;
        }).join("\n") + "\n" +
        `"TOTAL","${new Date().toISOString().split("T")[0]}","ALL","ALL","ALL","ALL","ALL","TOTAL REALISASI","Total Pengeluaran Selesai",${totalActual},"System","Rekapitulasi Pengeluaran Sah","","",""`;
      } else {
        csvContent = [
          "BUDGET UTILIZATION AUDIT REPORT - LEGAL DEPARTMENT PT AJINOMOTO INDONESIA",
          `Tahun Anggaran,${reportYear}`,
          `Total Plafon Anggaran (IDR),${totalBudget}`,
          `Total Realisasi Terpakai (IDR),${totalActual}`,
          `Tingkat Penyerapan Rata-Rata (%),${utilizationRate.toFixed(2)}%`,
          `Tanggal Ekspor,${new Date().toISOString()}`,
          "",
          "ID Budget,Kode Budget,Tahun Anggaran,Kategori Beban,PIC Pengelola,Deskripsi Anggaran,Plafon Anggaran (IDR),Total Realisasi (IDR),Sisa Anggaran (IDR),Penyerapan (%),Status Utilisasi,Kategori Audit"
        ].join("\n") + "\n" + 
        activeBudgets.map(b => {
          const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
          const rem = b.BudgetAmount - spent;
          const rate = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;
          const statusUtil = rate > 100 ? "Over Budget" : rate > 85 ? "Mendekati Batas" : "Wajar";
          const auditCode = rate > 100 ? "AUDIT_CRITICAL" : rate > 85 ? "AUDIT_WARNING" : "AUDIT_OK";
          return `"${b.BudgetID}","${b.BudgetCode}",${b.Year},"${b.Category}","${b.PIC || ''}","${(b.Description || '').replace(/"/g, '""')}",${b.BudgetAmount},${spent},${rem},${rate.toFixed(2)},"${statusUtil}","${auditCode}"`;
        }).join("\n") + "\n" +
        `"TOTAL","TOTAL AUDIT",${reportYear},"ALL KATEGORI","ALL PIC","Rekapitulasi Audit",${totalBudget},${totalActual},${remainingBudget},${utilizationRate.toFixed(2)},"${utilizationRate > 100 ? 'Over Limit' : 'Wajar'}","AUDIT_SUMMARY"`;
      }

      // prepend BOM for UTF-8 compatibility in Excel
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("File CSV laporan detail berhasil diunduh!", "success");
    } catch (err) {
      addToast("Gagal mengunduh laporan detail CSV.", "error");
    }
  };

  const handleExportMarkdown = () => {
    try {
      addToast("Menyiapkan dokumen Markdown dengan tabel terpisah & subtotal...", "info");
      let mdContent = "";
      mdContent += `# LAPORAN EKSPOR EKSEKUTIF KEUANGAN LEGAL DEPARTMENT\n`;
      mdContent += `**PT AJINOMOTO INDONESIA**\n`;
      mdContent += `*Tahun Fiskal: April ${reportYear} - Maret ${Number(reportYear) + 1}*\n`;
      mdContent += `*Tanggal Ekspor: ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}*\n\n`;
      mdContent += `---\n\n`;

      mdContent += `## RINGKASAN KINERJA ANGGARAN (EXECUTIVE SUMMARY)\n\n`;
      mdContent += `Rekapitulasi posisi anggaran dan realisasi pengeluaran divisi hukum:\n\n`;
      mdContent += `- **Total Plafon Master Budget**: ${formatRupiah(totalBudget)}\n`;
      mdContent += `- **Total Realisasi Pengeluaran (Actual Cost)**: ${formatRupiah(totalActual)}\n`;
      mdContent += `- **Sisa Likuiditas Anggaran (Remaining)**: ${formatRupiah(remainingBudget)}\n`;
      mdContent += `- **Rasio Penyerapan Anggaran (Utilization)**: ${utilizationRate.toFixed(2)}%\n\n`;
      mdContent += `> Laporan ini dikelompokkan dalam beberapa tabel terpisah berdasarkan kategori data utama sesuai standar akuntansi internal ${getCompanyDisplayName(activeCompany)}.\n\n`;

      // TABEL 1: PER PIC / DEPARTEMEN / SEKSI
      mdContent += `## TABEL 1: REKAPITULASI PER DEPARTEMEN / PIC SEKSI PENGELOLA\n\n`;
      mdContent += `Tabel berikut menyajikan rincian alokasi budget dan realisasi penggunaannya yang dipisahkan berdasarkan penanggung jawab seksi (PIC):\n\n`;

      const pics = Array.from(new Set(activeBudgets.map(b => b.PIC))).filter(Boolean);
      if (pics.length === 0) pics.push("Legal Team");

      pics.forEach((pic, idx) => {
        mdContent += `### 1.${idx + 1}. Seksi / PIC Pengelola: **${pic}**\n\n`;
        mdContent += `| Kode Budget | Kategori Beban | Deskripsi Anggaran | Plafon Anggaran (IDR) | Realisasi Terpakai (IDR) | Sisa Anggaran (IDR) | Penyerapan (%) |\n`;
        mdContent += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n`;

        const picBudgets = activeBudgets.filter(b => (b.PIC || "Legal Team") === pic);
        let picTotalBudget = 0;
        let picTotalSpent = 0;

        picBudgets.forEach(b => {
          const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
          const rem = b.BudgetAmount - spent;
          const rate = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;
          
          picTotalBudget += b.BudgetAmount;
          picTotalSpent += spent;

          mdContent += `| **${b.BudgetCode}** | ${b.Category} | ${b.Description || "-"} | ${formatRupiah(b.BudgetAmount)} | ${formatRupiah(spent)} | ${formatRupiah(rem)} | ${rate.toFixed(1)}% |\n`;
        });

        const picTotalRem = picTotalBudget - picTotalSpent;
        const picTotalRate = picTotalBudget > 0 ? (picTotalSpent / picTotalBudget) * 100 : 0;

        mdContent += `| **SUBTOTAL / TOTAL SEKSI ${pic}** | | | **${formatRupiah(picTotalBudget)}** | **${formatRupiah(picTotalSpent)}** | **${formatRupiah(picTotalRem)}** | **${picTotalRate.toFixed(1)}%** |\n\n`;
        
        mdContent += `**Catatan Konteks Seksi ${pic}:**\n`;
        mdContent += `Pengelola **${pic}** mengampu total plafon anggaran sebesar **${formatRupiah(picTotalBudget)}** dengan realisasi pengeluaran kumulatif mencapai **${formatRupiah(picTotalSpent)}** (${picTotalRate.toFixed(1)}%). Sisa saldo alokasi dana tersedia sebesar **${formatRupiah(picTotalRem)}**. `;
        if (picTotalRate > 90) {
          mdContent += `Status penyerapan mendekati batas maksimal, disarankan pemantauan ketat untuk transaksi berjalan.\n\n`;
        } else {
          mdContent += `Status pengelolaan anggaran berjalan stabil dan berada dalam koridor perencanaan fiskal yang aman.\n\n`;
        }
      });

      // TABEL 2: PER KATEGORI BEBAN (JENIS PENGELUARAN)
      mdContent += `## TABEL 2: REKAPITULASI PER KATEGORI BEBAN / ITEM BUDGET\n\n`;
      mdContent += `Tabel berikut mengelompokkan anggaran berdasarkan jenis beban legal untuk mempermudah analisis struktur biaya:\n\n`;

      const catNames = Array.from(new Set(activeBudgets.map(b => b.Category))).filter(Boolean);
      catNames.forEach((cat, idx) => {
        mdContent += `### 2.${idx + 1}. Kategori Beban: **${cat}**\n\n`;
        mdContent += `| Kode Budget | Deskripsi Anggaran | PIC Pengelola | Plafon Anggaran (IDR) | Realisasi Terpakai (IDR) | Sisa Anggaran (IDR) | Penyerapan (%) |\n`;
        mdContent += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n`;

        const catBudgets = activeBudgets.filter(b => b.Category === cat);
        let catTotalBudget = 0;
        let catTotalSpent = 0;

        catBudgets.forEach(b => {
          const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
          const rem = b.BudgetAmount - spent;
          const rate = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;
          
          catTotalBudget += b.BudgetAmount;
          catTotalSpent += spent;

          mdContent += `| **${b.BudgetCode}** | ${b.Description || "-"} | ${b.PIC || "-"} | ${formatRupiah(b.BudgetAmount)} | ${formatRupiah(spent)} | ${formatRupiah(rem)} | ${rate.toFixed(1)}% |\n`;
        });

        const catTotalRem = catTotalBudget - catTotalSpent;
        const catTotalRate = catTotalBudget > 0 ? (catTotalSpent / catTotalBudget) * 100 : 0;

        mdContent += `| **SUBTOTAL KATEGORI ${cat}** | | | **${formatRupiah(catTotalBudget)}** | **${formatRupiah(catTotalSpent)}** | **${formatRupiah(catTotalRem)}** | **${catTotalRate.toFixed(1)}%** |\n\n`;

        mdContent += `**Catatan Konteks Kategori ${cat}:**\n`;
        mdContent += `Kategori beban **${cat}** memiliki komitmen plafon **${formatRupiah(catTotalBudget)}** dengan tingkat penyerapan sebesar **${catTotalRate.toFixed(1)}%**. Sisa alokasi dana **${formatRupiah(catTotalRem)}** mencukupi untuk mendukung kegiatan operasional divisi hukum hingga akhir masa fiskal.\n\n`;
      });

      // TABEL 3: REKAPITULASI PLAN BUDGET (RENCANA VS REALISASI)
      mdContent += `## TABEL 3: REKAPITULASI PLAN BUDGET (RENCANA ANGGARAN VS REALISASI)\n\n`;
      mdContent += `Rincian rencana alokasi anggaran (Plan Budget) dan pengurangan nilainya oleh Actual Cost secara real-time:\n\n`;

      if (plans.length > 0) {
        mdContent += `| Kode Plan | Kode Master | Nama Rencana | Target Selesai | Anggaran Rencana (IDR) | Realisasi Pengeluaran (IDR) | Sisa Plan Balance (IDR) | Status Plan |\n`;
        mdContent += `| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |\n`;

        let planTotalAlloc = 0;
        let planTotalSpent = 0;

        plans.forEach(p => {
          const master = budgets.find(b => b.BudgetID === p.BudgetID);
          const pSpent = activeActuals.filter(a => a.PlanID === p.PlanID).reduce((sum, a) => sum + a.Amount, 0);
          const pRem = p.PlannedAmount - pSpent;
          
          planTotalAlloc += p.PlannedAmount;
          planTotalSpent += pSpent;

          mdContent += `| **${p.PlanCode}** | ${master?.BudgetCode || "-"} | ${p.Title} | ${p.StartDate || "-"} s/d ${p.EndDate || "-"} | ${formatRupiah(p.PlannedAmount)} | ${formatRupiah(pSpent)} | ${formatRupiah(pRem)} | ${p.Status} |\n`;
        });

        const planTotalRem = planTotalAlloc - planTotalSpent;
        const planTotalRate = planTotalAlloc > 0 ? (planTotalSpent / planTotalAlloc) * 100 : 0;

        mdContent += `| **TOTAL REKAPITULASI PLAN BUDGET** | | | | **${formatRupiah(planTotalAlloc)}** | **${formatRupiah(planTotalSpent)}** | **${formatRupiah(planTotalRem)}** | **${planTotalRate.toFixed(1)}% Util** |\n\n`;

        mdContent += `**Catatan Konteks Plan Budget:**\n`;
        mdContent += `Terdaftar **${plans.length} item Rencana Anggaran (Plan Budget)** dengan komitmen total **${formatRupiah(planTotalAlloc)}**. Realisasi transaksi yang terhubung ke Plan Budget telah menyerap **${formatRupiah(planTotalSpent)}**, menyisakan batas alokasi Rencana sebesar **${formatRupiah(planTotalRem)}**.\n\n`;
      } else {
        mdContent += `*Belum ada data Plan Budget terdaftar pada periode ini.*\n\n`;
      }

      // TABEL 4: JURNAL TRANSAKSI REALISASI (ACTUAL COST)
      mdContent += `## TABEL 4: JURNAL TRANSAKSI REALISASI (ACTUAL COST) PER STATUS PEMBAYARAN\n\n`;
      mdContent += `Daftar seluruh pencatatan pengeluaran aktual yang telah diverifikasi dan disetujui:\n\n`;

      mdContent += `| Tanggal | Kode Budget | Kategori | Deskripsi Transaksi | Invoice / Referensi | Nominal Realisasi (IDR) | Verifikator |\n`;
      mdContent += `| :--- | :--- | :--- | :--- | :--- | :---: | :--- |\n`;

      let actualsSum = 0;
      activeActuals.forEach(a => {
        const bCode = budgets.find(b => b.BudgetID === a.BudgetID)?.BudgetCode || "N/A";
        actualsSum += a.Amount;
        mdContent += `| ${a.TransactionDate} | **${bCode}** | ${a.Category} | ${a.Description} | ${a.ReferenceNumber || "-"} | **${formatRupiah(a.Amount)}** | ${a.CreatedBy} |\n`;
      });

      mdContent += `| **TOTAL JURNAL REALISASI (ACTUAL COST)** | | | | | **${formatRupiah(actualsSum)}** | |\n\n`;

      mdContent += `**Catatan Konteks Jurnal Transaksi:**\n`;
      mdContent += `Tercatat **${activeActuals.length} transaksi pengeluaran sah** dengan nilai pencatatan kumulatif sebesar **${formatRupiah(actualsSum)}**. Seluruh transaksi telah dilengkapi nomor referensi/invoice dan verifikasi internal yang akuntabel.\n\n`;

      const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laporan_Ekspor_Markdown_Terpisah_${reportYear}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast("Dokumen Markdown dengan 4 tabel terpisah, subtotal & catatan berhasil diekspor!", "success");
    } catch (err) {
      console.error(err);
      addToast("Gagal mengekspor dokumen Markdown.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-gray-800">Financial Reports</h1>
          <p className="text-xs text-gray-500">Hasil rekapitulasi data pengeluaran terstruktur untuk audit internal Legal Department</p>
        </div>

        <div className="flex items-center space-x-2 self-start">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:text-brand-red hover:bg-red-50/50 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV Detail</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:text-brand-red hover:bg-red-50/50 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            title="Ekspor dokumen laporan terstruktur dalam bentuk tabel Markdown terpisah"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Ekspor Markdown</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-brand-dark text-white hover:bg-black px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Select Report Interface */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
        
        {/* Left Side: Report Selector Rail */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-2 h-fit">
          <p className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-widest px-2 mb-3">Jenis Laporan</p>
          
          <button
            onClick={() => setSelectedReport("annual")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              selectedReport === "annual" 
                ? "bg-red-50 text-brand-red font-bold" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4.5 h-4.5" />
              <span>Rolling Forecast Report</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSelectedReport("monthly")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              selectedReport === "monthly" 
                ? "bg-red-50 text-brand-red font-bold" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-4.5 h-4.5" />
              <span>Monthly Budget Report</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSelectedReport("category")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              selectedReport === "category" 
                ? "bg-red-50 text-brand-red font-bold" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4.5 h-4.5" />
              <span>Category Summary</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSelectedReport("actual")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              selectedReport === "actual" 
                ? "bg-red-50 text-brand-red font-bold" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4.5 h-4.5" />
              <span>Actual Cost Report</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSelectedReport("utilization")}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              selectedReport === "utilization" 
                ? "bg-red-50 text-brand-red font-bold" 
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity className="w-4.5 h-4.5" />
              <span>Budget Utilization Report</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Quick year selection */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <span className="text-[10px] text-gray-400 font-mono pl-2 block mb-1">Tahun Fiskal:</span>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(e.target.value)}
              className="w-full text-xs py-1.5 px-3 border border-gray-200 rounded-xl bg-white focus:outline-none cursor-pointer"
            >
              <option value="All">Semua Tahun Fiskal</option>
              {years.map(y => (
                <option key={y} value={y.toString()}>{y} (April {y} - Maret {y + 1})</option>
              ))}
              {!years.includes(2026) && <option value="2026">2026 (April 2026 - Maret 2027)</option>}
            </select>
          </div>
        </div>

        {/* Right Side: Report Sheet Frame (Print area core) */}
        <div className="md:col-span-3 bg-white border border-gray-100 p-6 rounded-2xl shadow-xs space-y-6 print:p-0 print:border-none print:shadow-none">
          
          {/* Header Inside Sheet */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-5">
            <div>
              <p className="text-[10px] font-mono text-brand-red font-semibold uppercase tracking-wider">PT AJINOMOTO INDONESIA</p>
              <h2 className="text-lg font-bold font-display text-gray-800 capitalize">
                {selectedReport === "annual" && "Rolling Forecast Report"}
                {selectedReport === "monthly" && "Monthly Budget Report"}
                {selectedReport === "category" && "Category Summary Report"}
                {selectedReport === "actual" && "Actual Cost Expense Report"}
                {selectedReport === "utilization" && "Budget Utilization Audit"}
              </h2>
              <p className="text-xs text-gray-400">Rekapitulasi Keuangan Divisi Hukum Internal | Tahun Anggaran {reportYear}</p>
            </div>
            <span className="text-[10px] font-mono text-gray-400">Tanggal Rekap: {new Date().toISOString().split("T")[0]}</span>
          </div>

          {/* Simple Financial Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Total Budget</p>
              <p className="text-xs font-bold text-gray-800 mt-1">{formatRupiah(totalBudget)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Total Terpakai</p>
              <p className="text-xs font-bold text-brand-red mt-1">{formatRupiah(totalActual)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Sisa Anggaran</p>
              <p className="text-xs font-bold text-emerald-600 mt-1">{formatRupiah(remainingBudget)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Tingkat Utilisasi</p>
              <p className="text-xs font-bold text-gray-800 mt-1">{utilizationRate.toFixed(1)}%</p>
            </div>
          </div>

          {/* Report Specific Table Render */}
          <div className="overflow-x-auto">
            {/* 1. Rolling Forecast Report Table */}
            {selectedReport === "annual" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-right">Realisasi</th>
                    <th className="py-2.5 px-3 text-right">Sisa Anggaran</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeBudgets.map(b => {
                    const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
                    return (
                      <tr key={b.BudgetID} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-dark">{b.BudgetCode}</td>
                        <td className="py-2.5 px-3">{b.Category}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-gray-800">{formatRupiah(b.BudgetAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-brand-red">{formatRupiah(spent)}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${b.BudgetAmount - spent < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatRupiah(b.BudgetAmount - spent)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">Active</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* 2. Monthly Report Table */}
            {selectedReport === "monthly" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Bulan</th>
                    <th className="py-2.5 px-3 text-right">Realisasi Pengeluaran (Actual)</th>
                    <th className="py-2.5 px-3 text-center">Proporsi Terhadap Total Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyBreakdown.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-semibold text-gray-700">{m.monthName}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-brand-dark">{formatRupiah(m.spent)}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-[10px] font-mono text-gray-500 w-10 text-right">
                            {totalActual > 0 ? ((m.spent / totalActual) * 100).toFixed(1) : "0.0"}%
                          </span>
                          <div className="w-24 bg-gray-100 h-1.5 rounded-full">
                            <div 
                              className="bg-brand-red h-1.5 rounded-full"
                              style={{ width: `${totalActual > 0 ? (m.spent / totalActual) * 100 : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. Category Summary Table */}
            {selectedReport === "category" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Kategori Legal</th>
                    <th className="py-2.5 px-3 text-right">Nominal Kumulatif</th>
                    <th className="py-2.5 px-3 text-right">Realisasi Kumulatif</th>
                    <th className="py-2.5 px-3 text-right">Sisa Kumulatif</th>
                    <th className="py-2.5 px-3 text-center">Utilisasi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categorySummary.map((c, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-bold text-brand-dark">{c.categoryName}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-gray-600">{formatRupiah(c.budget)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-brand-red">{formatRupiah(c.spent)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${c.remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatRupiah(c.remaining)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold ${c.utilization > 100 ? "text-red-600" : "text-gray-700"}`}>
                          {c.utilization.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. Actual Cost Report Table */}
            {selectedReport === "actual" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Deskripsi</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-center no-print">Bukti</th>
                    <th className="py-2.5 px-3">Pencatat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeActuals.map(a => {
                    const code = budgets.find(bg => bg.BudgetID === a.BudgetID)?.BudgetCode || "N/A";
                    return (
                      <tr key={a.ActualID} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono text-gray-500 whitespace-nowrap">{a.TransactionDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-dark">{code}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{a.Category}</td>
                        <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate" title={a.Description}>{a.Description}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-800">{formatRupiah(a.Amount)}</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap no-print">
                          {a.AttachmentName ? (
                            <button
                              onClick={() => setPreviewAttachment({
                                name: a.AttachmentName!,
                                data: a.AttachmentData!,
                                type: a.AttachmentType || "image/png"
                              })}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-brand-red bg-red-50 hover:bg-brand-red hover:text-white transition-all cursor-pointer"
                              title="Pratinjau Bukti"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-[60px] truncate">{a.AttachmentName}</span>
                            </button>
                          ) : (
                            <span className="text-gray-300 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{a.CreatedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* 5. Budget Utilization Report Table */}
            {selectedReport === "utilization" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase bg-gray-50/50">
                    <th className="py-2.5 px-3">Kode</th>
                    <th className="py-2.5 px-3">Nominal (Rp)</th>
                    <th className="py-2.5 px-3">Realisasi (Rp)</th>
                    <th className="py-2.5 px-3 text-center">Status Utilisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeBudgets.map(b => {
                    const spent = activeActuals.filter(a => a.BudgetID === b.BudgetID).reduce((sum, a) => sum + a.Amount, 0);
                    const rate = b.BudgetAmount > 0 ? (spent / b.BudgetAmount) * 100 : 0;
                    return (
                      <tr key={b.BudgetID} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-dark">{b.BudgetCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-600">{formatRupiah(b.BudgetAmount)}</td>
                        <td className="py-2.5 px-3 font-bold text-brand-red">{formatRupiah(spent)}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                              rate > 100 ? "bg-red-100 text-red-700" :
                              rate > 85 ? "bg-amber-100 text-amber-700" :
                              rate > 50 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {rate.toFixed(1)}% {rate > 100 ? "Over Budget" : rate > 85 ? "Mendekati Batas" : "Wajar"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Report Footer / Signature (Printed ONLY) */}
          <div className="hidden print-only mt-14 pt-8 border-t border-gray-200 flex justify-end text-xs">
            <div className="w-64 text-center space-y-2">
              <p className="text-gray-700 font-semibold">Disusun oleh Legal Department</p>
              <div className="h-16 flex items-center justify-center">
                <span className="text-gray-600 font-sans italic text-base font-semibold tracking-widest">( ttd. )</span>
              </div>
              <div className="border-t border-gray-400 pt-1">
                <p className="font-bold text-gray-900">Legal Department</p>
                <p className="text-[10px] text-gray-500 font-mono">{getCompanyDisplayName(activeCompany)}</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-4 animate-fade-in backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center bg-gray-50 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-gray-800">
                <FileText className="w-4 h-4 text-brand-red" />
                <span className="text-xs font-bold font-display truncate max-w-[400px]">{previewAttachment.name}</span>
              </div>
              <button 
                onClick={() => setPreviewAttachment(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
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
                    className="inline-flex items-center justify-center space-x-2 text-xs font-bold text-white bg-brand-red hover:bg-red-700 active:scale-95 transition-all px-5 py-2.5 rounded-xl shadow-sm hover:shadow"
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
                className="px-4 py-2 text-xs font-semibold bg-brand-dark text-white rounded-xl hover:bg-black transition-colors"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
