/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  TrendingUp, 
  DollarSign, 
  AlertCircle, 
  ChevronRight, 
  Calendar,
  FileText,
  Paperclip,
  Eye,
  X,
  Target,
  BarChart2,
  Table as TableIcon,
  Filter,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Info,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Mail,
  Send,
  Printer,
  Sparkles,
  Building,
  TrendingDown,
  Clock,
  Plus,
  Trash2,
  UserCheck,
  Check,
  Lock,
  Bell,
  Save
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Line, 
  Legend,
  Area,
  ComposedChart,
  ReferenceLine,
  LabelList
} from "recharts";
import { User, Budget, PlanBudget, Actual, Category, UserRole } from "../types";
import { AjinomotoLogo } from "./AjinomotoLogo";

interface DashboardViewProps {
  budgets: Budget[];
  plans?: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  currentUser: User;
  users: User[];
  onNavigate: (view: string) => void;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
  activeCompany?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International";
}

// Custom Tooltip for Plan vs Realisasi Chart
const CustomPlanVsActualTooltip = ({ active, payload, formatRupiah }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 border border-gray-200/80 rounded-2xl shadow-xl text-xs space-y-2 min-w-[230px]">
        <div className="flex justify-between items-start border-b border-gray-100 pb-2">
          <div>
            <p className="font-display font-bold text-gray-900 text-sm">{data.fullName || data.code}</p>
            <p className="text-[10px] text-gray-500 font-medium">{data.category || "Semua Kategori"}</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
            data.isOver ? "bg-red-100 text-red-700 border border-red-200" :
            data.Utilization > 85 ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"
          }`}>
            {data.Utilization}% Utilisasi
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between text-gray-600">
            <span>Rencana Pengeluaran (Plan):</span>
            <span className="font-mono font-bold text-slate-900">{formatRupiah(data.Plan)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Realisasi Pengeluaran (Actual):</span>
            <span className="font-mono font-bold text-brand-red">{formatRupiah(data.Realisasi)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-gray-100 pt-1">
            <span>Sisa Plan Budget:</span>
            <span className={`font-mono ${data.Remaining < 0 ? "text-red-600" : "text-emerald-700"}`}>
              {formatRupiah(data.Remaining)}
            </span>
          </div>
          {data.plansCount !== undefined && (
            <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
              <span>Rencana & Transaksi:</span>
              <span className="font-mono">{data.plansCount} Plan / {data.txCount} Realisasi</span>
            </div>
          )}
        </div>

        {/* Mini progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
          <div 
            className={`h-full rounded-full ${data.isOver ? "bg-red-600" : data.Utilization > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(data.Utilization, 100)}%` }}
          />
        </div>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Monthly Expenditure Trend Chart
const CustomMonthlyTooltip = ({ active, payload, formatRupiah }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 border border-gray-200/80 rounded-2xl shadow-xl text-xs space-y-2 min-w-[210px]">
        <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
          <p className="font-bold text-gray-900 font-display">{data.fullName}</p>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-red-50 text-brand-red rounded-md font-bold">
            {data.JumlahTransaksi} Transaksi
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-gray-600">
            <span>Realisasi Pengeluaran:</span>
            <span className="font-mono font-bold text-brand-red">{formatRupiah(data.Pengeluaran)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Akumulasi YTD:</span>
            <span className="font-mono font-semibold text-teal-700">{formatRupiah(data.AkumulasiYTD)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-[10px]">
            <span>Rata-rata / Kuitansi:</span>
            <span className="font-mono">{formatRupiah(data.RataRata)}</span>
          </div>
          {data.MoMGrowth !== 0 && (
            <div className="flex justify-between text-[10px] pt-1 border-t border-gray-100">
              <span className="text-gray-500">MoM Growth:</span>
              <span className={`font-mono font-bold flex items-center ${data.MoMGrowth > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {data.MoMGrowth > 0 ? "+" : ""}{data.MoMGrowth}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardView({
  budgets,
  plans = [],
  actuals,
  categories,
  currentUser,
  users = [],
  onNavigate,
  addToast,
  activeCompany = "ALL"
}: DashboardViewProps) {
  const getCompanyDisplayName = (comp?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International") => {
    if (comp === "PT Ajinomoto Indonesia") return "PT Ajinomoto Indonesia";
    if (comp === "PT Ajinex International") return "PT Ajinex International";
    return "PT Ajinomoto Indonesia & PT Ajinex International";
  };
  const getCompanyDisplayUpper = (comp?: "ALL" | "PT Ajinomoto Indonesia" | "PT Ajinex International") => {
    if (comp === "PT Ajinomoto Indonesia") return "PT AJINOMOTO INDONESIA";
    if (comp === "PT Ajinex International") return "PT AJINEX INTERNATIONAL";
    return "PT AJINOMOTO INDONESIA & PT AJINEX INTERNATIONAL";
  };

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

  // Resolves names dynamically based on user database
  const resolveUserName = (input: string) => {
    if (!input) return "-";
    const matchByEmail = users.find(u => u.Email.toLowerCase() === input.toLowerCase());
    if (matchByEmail) {
      return matchByEmail.Name;
    }
    const matchByName = users.find(u => {
      const uNameClean = u.Name.replace(/\s*\((Admin|Staff)\)/gi, "").trim().toLowerCase();
      const inputClean = input.replace(/\s*\((Admin|Staff)\)/gi, "").trim().toLowerCase();
      return uNameClean === inputClean || u.Name.toLowerCase() === input.toLowerCase();
    });
    if (matchByName) {
      return matchByName.Name;
    }
    return input.replace(/\s*\((Admin|Staff)\)/gi, "").trim();
  };

  // Robust Category normalization & matching helper
  const normalizeCat = (str?: string) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .replace(/&/g, " dan ")
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const isCategoryMatch = (catA?: string, catB?: string) => {
    if (!catA || !catB) return false;
    const nA = normalizeCat(catA);
    const nB = normalizeCat(catB);
    if (nA === nB) return true;
    if (nA.includes(nB) || nB.includes(nA)) return true;
    const aliases: [string, string][] = [
      ["passport visa", "visa passport"],
      ["tamu tka", "foreign guest"],
      ["keterangan rencana kabupaten krk factory", "krk factory"],
      ["pbg slf all factory", "pbg dan slf all factory"],
      ["bejana dan alat alat", "bejana alat alat"]
    ];
    for (const [x, y] of aliases) {
      if ((nA.includes(x) && nB.includes(y)) || (nA.includes(y) && nB.includes(x))) return true;
    }
    return false;
  };

  // Comprehensive Category Metrics Resolver
  const getCategoryMetrics = (catName: string) => {
    // 1. Matched Plans (filtered strictly by activeCompany scope)
    const catPlans = plans.filter((p) => 
      isCategoryMatch(p.Category, catName) || 
      (p.BudgetID && isCategoryMatch(budgets.find((b) => b.BudgetID === p.BudgetID)?.Category, catName))
    );
    const planSum = catPlans.reduce((s, p) => s + (p.PlannedAmount || 0), 0);

    // 2. Matched Budgets (filtered strictly by activeCompany scope)
    const catBudgets = budgets.filter((b) => isCategoryMatch(b.Category, catName));
    const budgetSum = catBudgets.reduce((s, b) => s + (b.BudgetAmount || 0), 0);

    // 3. Target Plan: use planSum if defined, otherwise fallback to budgetSum
    const target = planSum > 0 ? planSum : budgetSum;

    // 4. Matched Actuals (filtered strictly by activeCompany scope)
    const catActuals = actuals.filter((a) =>
      isCategoryMatch(a.Category, catName) ||
      (a.PlanID && isCategoryMatch(plans.find((p) => p.PlanID === a.PlanID)?.Category, catName)) ||
      (a.BudgetID && isCategoryMatch(budgets.find((b) => b.BudgetID === a.BudgetID)?.Category, catName))
    );
    const actual = catActuals.reduce((s, a) => s + (a.Amount || 0), 0);
    const remaining = target - actual;
    const util = target > 0 ? (actual / target) * 100 : 0;

    return { target, actual, remaining, util, planSum, budgetSum };
  };

  // List of all unique categories strictly scoped to active company data
  const consolidatedCategories = useMemo(() => {
    const list: string[] = [];

    // Derive strictly from active budgets, plans, and actuals to prevent cross-company category pollution
    budgets.forEach((b) => {
      if (b.Category && b.Category.trim() && !list.some((existing) => isCategoryMatch(existing, b.Category))) {
        list.push(b.Category.trim());
      }
    });

    plans.forEach((p) => {
      if (p.Category && p.Category.trim() && !list.some((existing) => isCategoryMatch(existing, p.Category))) {
        list.push(p.Category.trim());
      }
    });

    actuals.forEach((a) => {
      if (a.Category && a.Category.trim() && !list.some((existing) => isCategoryMatch(existing, a.Category))) {
        list.push(a.Category.trim());
      }
    });

    // If ALL is selected and there are master categories that match no current entries, add them
    if (activeCompany === "ALL" && list.length === 0) {
      categories.forEach((c) => {
        const name = typeof c === "string" ? c : c?.CategoryName;
        if (name && name.trim() && !list.some((existing) => isCategoryMatch(existing, name))) {
          list.push(name.trim());
        }
      });
    }

    return list;
  }, [budgets, plans, actuals, categories, activeCompany]);

  // Compute standard KPIs
  const activeBudgets = budgets.filter(b => b.Status === "Active");
  const totalBudget = activeBudgets.reduce((sum, b) => sum + b.BudgetAmount, 0);
  const totalActual = actuals.reduce((sum, a) => sum + a.Amount, 0);
  const remainingBudget = totalBudget - totalActual;
  const utilizationRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  // Plan Budget KPIs
  const totalPlanAmount = plans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);
  const totalPlanSpent = actuals.filter(a => a.PlanID).reduce((sum, a) => sum + (a.Amount || 0), 0);
  const remainingPlanAmount = totalPlanAmount - totalPlanSpent;

  // Formatting Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  // Compact nominal chart label formatter (e.g. 38.6M, 500.4M, 1.2B)
  const formatChartLabel = (val: number) => {
    if (val === undefined || val === null || val === 0) return "";
    const abs = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    if (abs >= 1_000_000_000) {
      const num = abs / 1_000_000_000;
      return `${sign}${num % 1 === 0 ? num : num.toFixed(1)}B`;
    }
    if (abs >= 1_000_000) {
      const num = abs / 1_000_000;
      return `${sign}${num % 1 === 0 ? num : num.toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      const num = abs / 1_000;
      return `${sign}${num % 1 === 0 ? num : num.toFixed(0)}rb`;
    }
    return `${sign}${abs}`;
  };

  // Custom SVG Text Label with crisp white halo/outline for high contrast on chart lines
  const RenderCustomChartLabel = (props: any) => {
    const { x, y, value, stroke, fill, position } = props;
    if (value === undefined || value === null || value === 0) return null;

    const formatted = formatChartLabel(value);
    if (!formatted) return null;

    const yOffset = position === "bottom" ? 14 : -10;

    return (
      <g transform={`translate(${x},${y + yOffset})`}>
        <text
          x={0}
          y={0}
          dy={0}
          fill={stroke || fill || "#1E293B"}
          fontSize={10}
          fontWeight="800"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          textAnchor="middle"
          stroke="#ffffff"
          strokeWidth={3.5}
          paintOrder="stroke fill"
        >
          {formatted}
        </text>
      </g>
    );
  };

  // Global & Section Slicer / Filter States
  const [chartFilterCategory, setChartFilterCategory] = useState<string>("All");
  const [chartFilterYear, setChartFilterYear] = useState<string>("2026");
  const [forecastViewMode, setForecastViewMode] = useState<"line" | "bar" | "combi" | "variance">("line");
  const [monthlyChartType, setMonthlyChartType] = useState<"area" | "bar" | "table">("area");
  const [showChartLabels, setShowChartLabels] = useState<boolean>(true);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<{ monthIndex: number; monthName: string } | null>(null);

  // Slicer for Monthly Budget Usage
  const [slicerMonthFilter, setSlicerMonthFilter] = useState<string>("All"); // "All" or monthIndex string
  const [slicerOnlyWithSpent, setSlicerOnlyWithSpent] = useState<boolean>(false);

  // Slicer for Tabel Sisa Plafon & Plan Belum Terealisasi
  const [plafonFilterStatus, setPlafonFilterStatus] = useState<"all" | "outstanding" | "critical" | "deficit">("all");
  const [plafonSearchTerm, setPlafonSearchTerm] = useState<string>("");
  const [plafonFilterCategory, setPlafonFilterCategory] = useState<string>("All");

  // Summary Report & Email Dispatch Modal States
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [emailRecipient, setEmailRecipient] = useState<string>("direksi@ajinomoto.co.id, finance@ajinomoto.co.id");
  const [emailSubject, setEmailSubject] = useState<string>(
    `Executive Summary & Trend Anggaran Legal ${getCompanyDisplayName(activeCompany)}`
  );
  const [emailNotes, setEmailNotes] = useState<string>(
    `Dengan hormat,\n\nBersama email ini kami sampaikan Laporan Executive Summary & Performance Anggaran Legal Department ${getCompanyDisplayName(activeCompany)} untuk periode berjalan.\n\nRincian lengkap mengenai evaluasi plafon budget, posisi realisasi actual, sisa anggaran, serta analisis trend pengeluaran bulanan dapat Bapak/Ibu periksa pada dokumen PDF resmi yang terlampir di dalam email ini.\n\nDemikian laporan ini kami sampaikan. Apabila terdapat pertanyaan atau memerlukan koordinasi lebih lanjut, Bapak/Ibu dapat menghubungi Divisi Legal.\n\nAtas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\nHormat kami,\nLegal Department ${getCompanyDisplayName(activeCompany)}`
  );
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailActiveTab, setEmailActiveTab] = useState<"summary" | "email" | "schedule">("summary");

  useEffect(() => {
    const compName = getCompanyDisplayName(activeCompany);
    setEmailSubject(`Executive Summary & Trend Anggaran Legal ${compName}`);
    setEmailNotes(
      `Dengan hormat,\n\nBersama email ini kami sampaikan Laporan Executive Summary & Performance Anggaran Legal Department ${compName} untuk periode berjalan.\n\nRincian lengkap mengenai evaluasi plafon budget, posisi realisasi actual, sisa anggaran, serta analisis trend pengeluaran bulanan dapat Bapak/Ibu periksa pada dokumen PDF resmi yang terlampir di dalam email ini.\n\nDemikian laporan ini kami sampaikan. Apabila terdapat pertanyaan atau memerlukan koordinasi lebih lanjut, Bapak/Ibu dapat menghubungi Divisi Legal.\n\nAtas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\nHormat kami,\nLegal Department ${compName}`
    );
    setAutoSchedule(prev => ({
      ...prev,
      subject: `Otomatis: Executive Summary & Trend Anggaran Legal ${compName}`
    }));
  }, [activeCompany]);

  // Saved Email Recipients State
  interface SavedRecipientItem {
    id: string;
    name: string;
    email: string;
    department?: string;
  }
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipientItem[]>([
    { id: "er1", name: "Direksi Legal & Compliance", email: "direksi@ajinomoto.co.id", department: "Executive Board" },
    { id: "er2", name: "Finance & Accounting Division", email: "finance@ajinomoto.co.id", department: "Finance" },
    { id: "er3", name: "Head of Legal Department", email: "head.legal@ajinomoto.co.id", department: "Legal" },
    { id: "er4", name: "Wahyu Waullilamri Kurniawan", email: "admin@ajinomoto.co.id", department: "Legal Admin" }
  ]);
  const [showAddRecipientForm, setShowAddRecipientForm] = useState<boolean>(false);
  const [newRecipName, setNewRecipName] = useState<string>("");
  const [newRecipEmail, setNewRecipEmail] = useState<string>("");
  const [newRecipDept, setNewRecipDept] = useState<string>("");

  // Auto-Schedule State
  const [autoSchedule, setAutoSchedule] = useState({
    enabled: true,
    frequency: "Weekly" as "Daily" | "Weekly" | "Monthly",
    dayOfWeek: "Monday",
    dayOfMonth: 1,
    sendTime: "08:00",
    recipients: ["direksi@ajinomoto.co.id", "finance@ajinomoto.co.id"],
    subject: `Otomatis: Executive Summary & Trend Anggaran Legal ${getCompanyDisplayName(activeCompany)}`,
    notes: "Laporan ini dikirimkan secara otomatis oleh sistem setiap jadwal yang ditentukan.",
    lastSent: "2026-07-27T08:00:00Z",
    nextSchedule: "2026-08-03T08:00:00Z"
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Fetch recipients, auto schedule, and saved email template on mount
  useEffect(() => {
    fetch("/api/email-recipients")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSavedRecipients(data);
        }
      })
      .catch(err => console.error("Error loading email recipients:", err));

    fetch("/api/auto-email-schedule")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === "object") {
          setAutoSchedule(data);
        }
      })
      .catch(err => console.error("Error loading auto email schedule:", err));

    fetch("/api/email-template")
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === "object") {
          if (data.subject) setEmailSubject(data.subject);
          if (data.notes) setEmailNotes(data.notes);
        }
      })
      .catch(err => console.error("Error loading saved email template:", err));
  }, []);

  // Handler to permanently save email template format
  const handleSaveEmailTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const res = await fetch("/api/email-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailSubject,
          notes: emailNotes,
          userEmail: currentUser.Email,
          userName: currentUser.Name
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        addToast("Format & isi pesan badan email berhasil disimpan!", "success");
      } else {
        addToast(data.error || "Gagal menyimpan format email", "error");
      }
    } catch (err: any) {
      addToast(`Error: ${err?.message || String(err)}`, "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // 1. Data for Monthly Spending (Connected to Actual Costs) + Slicer
  const getMonthlyData = () => {
    const fiscalMonths = [
      { name: "Apr", fullName: "April", index: 3 },
      { name: "Mei", fullName: "Mei", index: 4 },
      { name: "Jun", fullName: "Juni", index: 5 },
      { name: "Jul", fullName: "Juli", index: 6 },
      { name: "Agu", fullName: "Agustus", index: 7 },
      { name: "Sep", fullName: "September", index: 8 },
      { name: "Okt", fullName: "Oktober", index: 9 },
      { name: "Nov", fullName: "November", index: 10 },
      { name: "Des", fullName: "Desember", index: 11 },
      { name: "Jan", fullName: "Januari", index: 0 },
      { name: "Feb", fullName: "Februari", index: 1 },
      { name: "Mar", fullName: "Maret", index: 2 }
    ];

    let runningYtd = 0;
    let runningPlanYtd = 0;

    let result = fiscalMonths.map((m, idx, array) => {
      // 1. Calculate actual costs for this month
      const monthActuals = actuals.filter(act => {
        const parentBudget = budgets.find(b => b.BudgetID === act.BudgetID);
        
        // Year filter
        if (chartFilterYear !== "All") {
          if (!parentBudget || parentBudget.Year.toString() !== chartFilterYear) {
            return false;
          }
        }
        
        // Category filter
        if (chartFilterCategory !== "All" && act.Category !== chartFilterCategory) {
          return false;
        }

        const d = new Date(act.TransactionDate);
        return d.getMonth() === m.index;
      });

      const spent = monthActuals.reduce((sum, act) => sum + act.Amount, 0);
      const txCount = monthActuals.length;
      runningYtd += spent;

      // 2. Calculate Plan Budget for this month
      const monthPlans = plans.filter(p => {
        const parentBudget = budgets.find(b => b.BudgetID === p.BudgetID);
        const category = p.Category || parentBudget?.Category;
        const year = parentBudget?.Year || (p.StartDate ? new Date(p.StartDate).getFullYear() : 2026);

        if (chartFilterYear !== "All" && year.toString() !== chartFilterYear) {
          return false;
        }
        if (chartFilterCategory !== "All" && category !== chartFilterCategory) {
          return false;
        }

        if (!p.StartDate) return false;
        const d = new Date(p.StartDate);
        return d.getMonth() === m.index;
      });

      const planned = monthPlans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);
      runningPlanYtd += planned;

      // Calculate MoM growth
      let momGrowth = 0;
      if (idx > 0) {
        const prevMonthIndex = array[idx - 1].index;
        const prevSpent = actuals.filter(act => {
          const parentBudget = budgets.find(b => b.BudgetID === act.BudgetID);
          if (chartFilterYear !== "All") {
            if (!parentBudget || parentBudget.Year.toString() !== chartFilterYear) return false;
          }
          if (chartFilterCategory !== "All" && act.Category !== chartFilterCategory) return false;
          const d = new Date(act.TransactionDate);
          return d.getMonth() === prevMonthIndex;
        }).reduce((sum, act) => sum + act.Amount, 0);

        if (prevSpent > 0) {
          momGrowth = ((spent - prevSpent) / prevSpent) * 100;
        } else if (spent > 0) {
          momGrowth = 100;
        }
      }

      return {
        name: m.name,
        fullName: m.fullName,
        monthIndex: m.index,
        Pengeluaran: spent,
        PlanBudget: planned,
        PlanYTD: runningPlanYtd,
        JumlahTransaksi: txCount,
        AkumulasiYTD: runningYtd,
        RataRata: txCount > 0 ? Math.round(spent / txCount) : 0,
        MoMGrowth: Number(momGrowth.toFixed(1))
      };
    });

    // Apply Slicer filters
    if (slicerMonthFilter !== "All") {
      result = result.filter(m => m.monthIndex.toString() === slicerMonthFilter);
    }

    if (slicerOnlyWithSpent) {
      result = result.filter(m => m.Pengeluaran > 0);
    }

    return result;
  };

  // 2. Data for Plan vs Realisasi Anggaran (Monthly Plan Budget vs Realisasi)
  const getPlanVsActualData = () => {
    const fiscalMonths = [
      { name: "Apr", fullName: "April", index: 3 },
      { name: "Mei", fullName: "Mei", index: 4 },
      { name: "Jun", fullName: "Juni", index: 5 },
      { name: "Jul", fullName: "Juli", index: 6 },
      { name: "Agu", fullName: "Agustus", index: 7 },
      { name: "Sep", fullName: "September", index: 8 },
      { name: "Okt", fullName: "Oktober", index: 9 },
      { name: "Nov", fullName: "November", index: 10 },
      { name: "Des", fullName: "Desember", index: 11 },
      { name: "Jan", fullName: "Januari", index: 0 },
      { name: "Feb", fullName: "Februari", index: 1 },
      { name: "Mar", fullName: "Maret", index: 2 }
    ];

    return fiscalMonths.map(m => {
      // Filter plans for this month
      const monthPlans = plans.filter(p => {
        const parentBudget = budgets.find(b => b.BudgetID === p.BudgetID);
        const category = p.Category || parentBudget?.Category;
        const year = parentBudget?.Year || (p.StartDate ? new Date(p.StartDate).getFullYear() : 2026);

        if (chartFilterYear !== "All" && year.toString() !== chartFilterYear) {
          return false;
        }
        if (chartFilterCategory !== "All" && category !== chartFilterCategory) {
          return false;
        }

        if (!p.StartDate) return false;
        const d = new Date(p.StartDate);
        return d.getMonth() === m.index;
      });

      // Filter actuals for this month
      const monthActuals = actuals.filter(act => {
        const parentBudget = budgets.find(b => b.BudgetID === act.BudgetID);
        const category = act.Category || parentBudget?.Category;
        const year = parentBudget?.Year || (act.TransactionDate ? new Date(act.TransactionDate).getFullYear() : 2026);

        if (chartFilterYear !== "All" && year.toString() !== chartFilterYear) {
          return false;
        }
        if (chartFilterCategory !== "All" && category !== chartFilterCategory) {
          return false;
        }

        if (!act.TransactionDate) return false;
        const d = new Date(act.TransactionDate);
        return d.getMonth() === m.index;
      });

      const planned = monthPlans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);
      const spent = monthActuals.reduce((sum, act) => sum + (act.Amount || 0), 0);
      const remaining = planned - spent;
      const utilization = planned > 0 ? (spent / planned) * 100 : (spent > 0 ? 100 : 0);

      return {
        code: m.fullName,
        shortCode: m.name,
        category: chartFilterCategory !== "All" ? chartFilterCategory : "Semua Kategori",
        Plan: planned,
        Realisasi: spent,
        Remaining: remaining,
        Utilization: Number(utilization.toFixed(1)),
        isOver: spent > planned && planned > 0,
        monthIndex: m.index,
        fullName: m.fullName,
        plansCount: monthPlans.length,
        txCount: monthActuals.length
      };
    });
  };

  // 3. Data for Realisasi vs Remaining Budget (Pie / Donut Chart)
  const getRealisasiVsRemainingPieData = () => {
    const barData = getPlanVsActualData();
    const totalPlan = barData.reduce((sum, m) => sum + m.Plan, 0);
    const totalActual = barData.reduce((sum, m) => sum + m.Realisasi, 0);
    const totalRemaining = totalPlan - totalActual;
    const isOver = totalRemaining < 0;
    const overAmount = isOver ? Math.abs(totalRemaining) : 0;
    const remainingPos = Math.max(0, totalRemaining);

    const actualPct = totalPlan > 0 ? Number(((totalActual / totalPlan) * 100).toFixed(1)) : (totalActual > 0 ? 100 : 0);
    const remainingPct = totalPlan > 0 ? Number(((remainingPos / totalPlan) * 100).toFixed(1)) : 0;

    const slices = [];

    // Slice 1: Realisasi Pengeluaran
    if (totalActual > 0 || totalPlan === 0) {
      slices.push({
        name: "Realisasi Pengeluaran",
        value: totalActual,
        percentage: actualPct,
        color: "#E60012", // Brand Red
        key: "Realisasi"
      });
    }

    // Slice 2: Sisa Plan Budget
    if (remainingPos > 0) {
      slices.push({
        name: "Sisa Plan Budget",
        value: remainingPos,
        percentage: remainingPct,
        color: "#10B981", // Emerald Green
        key: "Remaining"
      });
    }

    return {
      slices,
      totalPlan,
      totalActual,
      totalRemaining,
      remainingPos,
      actualPct,
      remainingPct,
      isOver,
      overAmount
    };
  };

  // 4. Data for Sisa Plafon & Plan Budget Belum Terealisasi Table
  const getSisaPlafonTableData = () => {
    let result = budgets.map(b => {
      const bActuals = actuals.filter(act => act.BudgetID === b.BudgetID);
      const spentCost = bActuals.reduce((sum, act) => sum + act.Amount, 0);
      const remainingPlafon = b.BudgetAmount - spentCost;
      const utilization = b.BudgetAmount > 0 ? (spentCost / b.BudgetAmount) * 100 : 0;

      // Matching plans for this budget
      const bPlans = plans.filter(p => p.BudgetID === b.BudgetID);
      const totalPlanned = bPlans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);
      
      // Calculate plan spent vs outstanding plan (belum terealisasi)
      // Outstanding plan: Plans that are NOT "Completed" or "Cancelled"
      const unfulfilledPlans = bPlans.filter(p => p.Status !== "Completed" && p.Status !== "Cancelled");
      const planBelumTerealisasi = unfulfilledPlans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);

      return {
        budgetId: b.BudgetID,
        code: b.BudgetCode,
        category: b.Category,
        description: b.Description,
        year: b.Year,
        pic: b.PIC,
        plafonAmount: b.BudgetAmount,
        realisasiAmount: spentCost,
        sisaPlafonAmount: remainingPlafon,
        utilizationPct: Number(utilization.toFixed(1)),
        plansCount: bPlans.length,
        totalPlanAmount: totalPlanned,
        planBelumTerealisasi: planBelumTerealisasi,
        isOver: spentCost > b.BudgetAmount,
        isCritical: (remainingPlafon / (b.BudgetAmount || 1)) < 0.2 && remainingPlafon >= 0
      };
    });

    // Filter Year
    if (chartFilterYear !== "All") {
      result = result.filter(r => r.year.toString() === chartFilterYear);
    }

    // Filter Category Slicer
    if (plafonFilterCategory !== "All") {
      result = result.filter(r => r.category === plafonFilterCategory);
    }

    // Search Term Slicer
    if (plafonSearchTerm.trim()) {
      const term = plafonSearchTerm.toLowerCase().trim();
      result = result.filter(r => 
        r.code.toLowerCase().includes(term) || 
        r.description.toLowerCase().includes(term) || 
        r.category.toLowerCase().includes(term) ||
        r.pic.toLowerCase().includes(term)
      );
    }

    // Status Preset Slicer
    if (plafonFilterStatus === "outstanding") {
      result = result.filter(r => r.planBelumTerealisasi > 0);
    } else if (plafonFilterStatus === "critical") {
      result = result.filter(r => r.isCritical);
    } else if (plafonFilterStatus === "deficit") {
      result = result.filter(r => r.isOver);
    }

    // Sort agar nilai realisasi paling banyak ditaruh paling atas
    return result.sort((a, b) => (b.realisasiAmount || 0) - (a.realisasiAmount || 0));
  };

  // 5. Data for Fiscal Year Usage Progress (Bulan Berjalan & Bulan Mendatang s.d. Akhir FY)
  const getFiscalYearUsageProgress = () => {
    // 12 months in Fiscal Year sequence (April to March)
    const fiscalMonths = [
      { code: "04", short: "April", abbr: "Apr", q: "Q1", index: 3, mNo: 1 },
      { code: "05", short: "Mei", abbr: "Mei", q: "Q1", index: 4, mNo: 2 },
      { code: "06", short: "Juni", abbr: "Jun", q: "Q1", index: 5, mNo: 3 },
      { code: "07", short: "Juli", abbr: "Jul", q: "Q2", index: 6, mNo: 4 },
      { code: "08", short: "Agustus", abbr: "Aug", q: "Q2", index: 7, mNo: 5 },
      { code: "09", short: "September", abbr: "Sept", q: "Q2", index: 8, mNo: 6 },
      { code: "10", short: "Oktober", abbr: "Okt", q: "Q3", index: 9, mNo: 7 },
      { code: "11", short: "November", abbr: "Nov", q: "Q3", index: 10, mNo: 8 },
      { code: "12", short: "Desember", abbr: "Dec", q: "Q3", index: 11, mNo: 9 },
      { code: "01", short: "Januari", abbr: "Jan", q: "Q4", index: 0, mNo: 10 },
      { code: "02", short: "Februari", abbr: "Feb", q: "Q4", index: 1, mNo: 11 },
      { code: "03", short: "Maret", abbr: "Mar", q: "Q4", index: 2, mNo: 12 }
    ];

    const currentDate = new Date();
    const currentRealMonthCode = (currentDate.getMonth() + 1).toString().padStart(2, "0");
    const currentFYMonthObj = fiscalMonths.find(m => m.code === currentRealMonthCode) || fiscalMonths[4]; // Default August (08)
    
    const totalPlafonFY = totalBudget; // total active budget plafon

    let runningActualCumulative = 0;
    
    const monthlyList = fiscalMonths.map((m) => {
      const monthActuals = actuals.filter(act => {
        const parentBudget = budgets.find(b => b.BudgetID === act.BudgetID);
        const category = act.Category || parentBudget?.Category;
        const year = parentBudget?.Year || (act.TransactionDate ? new Date(act.TransactionDate).getFullYear() : 2026);

        if (chartFilterYear !== "All" && year.toString() !== chartFilterYear) return false;
        if (chartFilterCategory !== "All" && category !== chartFilterCategory) return false;

        if (!act.TransactionDate) return false;
        const d = new Date(act.TransactionDate);
        return d.getMonth() === m.index;
      });

      const monthPlans = plans.filter(p => {
        const parentBudget = budgets.find(b => b.BudgetID === p.BudgetID);
        const category = p.Category || parentBudget?.Category;
        const year = parentBudget?.Year || (p.StartDate ? new Date(p.StartDate).getFullYear() : 2026);

        if (chartFilterYear !== "All" && year.toString() !== chartFilterYear) return false;
        if (chartFilterCategory !== "All" && category !== chartFilterCategory) return false;

        if (!p.StartDate) return false;
        const d = new Date(p.StartDate);
        return d.getMonth() === m.index;
      });

      const actualAmt = monthActuals.reduce((sum, act) => sum + (act.Amount || 0), 0);
      const planAmt = monthPlans.reduce((sum, p) => sum + (p.PlannedAmount || 0), 0);

      const actualVsRfPct = planAmt > 0 ? (actualAmt / planAmt) * 100 : (actualAmt > 0 ? 100 : 0);

      runningActualCumulative += actualAmt;
      const usagePct = totalPlafonFY > 0 ? (runningActualCumulative / totalPlafonFY) * 100 : 0;

      const isCurrentMonth = m.code === currentRealMonthCode;
      const isPastMonth = m.mNo < currentFYMonthObj.mNo;
      const isFutureMonth = m.mNo > currentFYMonthObj.mNo;

      return {
        ...m,
        actualAmt,
        planAmt,
        actualVsRfPct: Number(actualVsRfPct.toFixed(1)),
        runningActualCumulative,
        usagePct: Number(usagePct.toFixed(2)),
        isCurrentMonth,
        isPastMonth,
        isFutureMonth
      };
    });

    const totalActualFY = monthlyList.reduce((sum, m) => sum + m.actualAmt, 0);
    const totalPlanFY = monthlyList.reduce((sum, m) => sum + m.planAmt, 0);
    const totalActualVsRfPctFY = totalPlanFY > 0 ? (totalActualFY / totalPlanFY) * 100 : 0;

    const currentMonthData = monthlyList.find(m => m.isCurrentMonth) || monthlyList[4];

    const futureMonths = monthlyList.filter(m => m.isFutureMonth);
    const futurePlanTotal = futureMonths.reduce((sum, m) => sum + m.planAmt, 0);
    const futureActualTotal = futureMonths.reduce((sum, m) => sum + m.actualAmt, 0);

    const projectedFinalFYTotal = currentMonthData.runningActualCumulative + futurePlanTotal;
    const projectedFinalFYUsagePct = totalPlafonFY > 0 ? (projectedFinalFYTotal / totalPlafonFY) * 100 : 0;

    return {
      monthlyList,
      totalActualFY,
      totalPlanFY,
      totalActualVsRfPctFY: Number(totalActualVsRfPctFY.toFixed(1)),
      currentMonthData,
      futureMonths,
      futurePlanTotal,
      futureActualTotal,
      projectedFinalFYTotal,
      projectedFinalFYUsagePct: Number(projectedFinalFYUsagePct.toFixed(1)),
      totalPlafonFY
    };
  };

  const monthlyData = getMonthlyData();
  const barChartData = getPlanVsActualData();
  const pieData = getRealisasiVsRemainingPieData();
  const sisaPlafonTableData = getSisaPlafonTableData();

  // Slicer Metrics for Monthly Spending Dashboard
  const maxMonthlyExpense = Math.max(...monthlyData.map(d => d.Pengeluaran), 0);
  const peakMonthData = monthlyData.find(d => d.Pengeluaran > 0 && d.Pengeluaran === maxMonthlyExpense);
  const totalMonthlyTxCount = monthlyData.reduce((sum, d) => sum + d.JumlahTransaksi, 0);
  const totalMonthlySpentSlice = monthlyData.reduce((sum, d) => sum + d.Pengeluaran, 0);
  const avgMonthlyExpense = monthlyData.length > 0 ? totalMonthlySpentSlice / monthlyData.length : 0;

  // Slicer Metrics for Plan vs Realisasi Card
  const totalPlanChart = barChartData.reduce((sum, d) => sum + d.Plan, 0);
  const totalRealisasiChart = barChartData.reduce((sum, d) => sum + d.Realisasi, 0);
  const totalRemainingChart = totalPlanChart - totalRealisasiChart;
  const avgUtilizationChart = totalPlanChart > 0 ? (totalRealisasiChart / totalPlanChart) * 100 : 0;
  const deficitCount = barChartData.filter(d => d.isOver).length;

  // Slicer Metrics for Sisa Plafon & Plan Table
  const totalPlafonTable = sisaPlafonTableData.reduce((sum, r) => sum + r.plafonAmount, 0);
  const totalRealisasiTable = sisaPlafonTableData.reduce((sum, r) => sum + r.realisasiAmount, 0);
  const totalSisaPlafonTable = sisaPlafonTableData.reduce((sum, r) => sum + r.sisaPlafonAmount, 0);
  const totalPlanBelumTerealisasiTable = sisaPlafonTableData.reduce((sum, r) => sum + r.planBelumTerealisasi, 0);

  // Trend Summary Metrics Calculations
  const monthlyDataList = getMonthlyData();
  const sortedMonthsBySpend = [...monthlyDataList].sort((a, b) => b.Pengeluaran - a.Pengeluaran);
  const peakMonth = sortedMonthsBySpend[0] && sortedMonthsBySpend[0].Pengeluaran > 0 ? sortedMonthsBySpend[0] : null;
  const activeMonthsList = monthlyDataList.filter(m => m.Pengeluaran > 0);
  const lowestMonth = activeMonthsList.length > 0 ? [...activeMonthsList].sort((a, b) => a.Pengeluaran - b.Pengeluaran)[0] : null;
  
  const totalSpentAllMonths = monthlyDataList.reduce((sum, m) => sum + m.Pengeluaran, 0);
  const activeMonthsCount = activeMonthsList.length || 1;
  const avgMonthlyBurn = Math.round(totalSpentAllMonths / activeMonthsCount) || 0;
  const yearEndProjection = (avgMonthlyBurn || 0) * 12;

  // Category breakdown for trend
  const catSpendingMap: Record<string, number> = {};
  actuals.forEach(a => {
    catSpendingMap[a.Category] = (catSpendingMap[a.Category] || 0) + a.Amount;
  });
  const topCatEntry = Object.entries(catSpendingMap).sort((a, b) => b[1] - a[1])[0];
  const topCategoryInfo = topCatEntry ? { name: topCatEntry[0], amount: topCatEntry[1] } : null;

  // Download CSV Handler
  const handleDownloadSummaryCSV = () => {
    const csvRows = [
      ["EXECUTIVE SUMMARY & TREND ANGGARAN LEGAL PT AJINOMOTO INDONESIA"],
      [`Tanggal Cetak Laporan: ${new Date().toLocaleDateString("id-ID")}`],
      [""],
      ["1. RINGKASAN UTAMA FINANSIAL"],
      ["Total Plafon Budget (Master)", totalBudget],
      ["Total Plan Budget (Rencana)", totalPlanAmount],
      ["Total Realisasi Pengeluaran (Actual)", totalActual],
      ["Sisa Plafon Anggaran", remainingBudget],
      ["Tingkat Utilisasi Anggaran (%)", utilizationRate.toFixed(2)],
      ["Total Transaksi Realisasi", actuals.length],
      [""],
      ["2. METRIK TREND PENGELUARAN & FORECAST"],
      ["Bulan Pengeluaran Tertinggi (Peak Month)", peakMonth ? `${peakMonth.fullName} (${formatRupiah(peakMonth.Pengeluaran)})` : "-"],
      ["Bulan Pengeluaran Terendah", lowestMonth ? `${lowestMonth.fullName} (${formatRupiah(lowestMonth.Pengeluaran)})` : "-"],
      ["Rata-rata Run-Rate Bulanan", formatRupiah(avgMonthlyBurn)],
      ["Proyeksi Pengeluaran Akhir Tahun", formatRupiah(yearEndProjection)],
      ["Kategori Legal Terbesar", topCategoryInfo ? `${topCategoryInfo.name} (${formatRupiah(topCategoryInfo.amount)})` : "-"],
      [""],
      ["3. RINCIAN PERKEMBANGAN TREND BULANAN"],
      ["Bulan", "Pengeluaran (Rp)", "Jumlah Transaksi", "Akumulasi YTD (Rp)", "MoM Growth (%)"],
      ...monthlyDataList.map(m => [m.fullName, m.Pengeluaran, m.JumlahTransaksi, m.AkumulasiYTD, `${m.MoMGrowth}%`])
    ];

    const csvContent = csvRows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Legal_Budget_Executive_Summary_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Laporan Summary CSV berhasil di-download!", "success");
  };

  // Recipient and Schedule Management Handlers
  const handleSaveNewRecipient = async () => {
    if (!newRecipEmail || !newRecipEmail.includes("@")) {
      addToast("Masukkan email penerima yang valid.", "error");
      return;
    }
    try {
      const res = await fetch("/api/email-recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRecipName || newRecipEmail.split("@")[0],
          email: newRecipEmail,
          department: newRecipDept || "General",
          userEmail: currentUser.Email,
          userName: currentUser.Name
        })
      });
      const data = await res.json();
      if (data.error) {
        addToast(data.error, "error");
        return;
      }
      setSavedRecipients(prev => [...prev, data]);
      if (emailRecipient) {
        if (!emailRecipient.includes(data.email)) {
          setEmailRecipient(prev => `${prev}, ${data.email}`);
        }
      } else {
        setEmailRecipient(data.email);
      }
      addToast(`Penerima '${data.name}' berhasil disimpan ke daftar.`, "success");
      setNewRecipName("");
      setNewRecipEmail("");
      setNewRecipDept("");
      setShowAddRecipientForm(false);
    } catch (err) {
      addToast("Gagal menyimpan penerima baru.", "error");
    }
  };

  const handleDeleteRecipient = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/email-recipients/${id}?userEmail=${encodeURIComponent(currentUser.Email)}&userName=${encodeURIComponent(currentUser.Name)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSavedRecipients(prev => prev.filter(r => r.id !== id));
        addToast(`Penerima '${name}' telah dihapus dari daftar.`, "info");
      }
    } catch (err) {
      addToast("Gagal menghapus penerima.", "error");
    }
  };

  const handleSaveAutoSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const res = await fetch("/api/auto-email-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...autoSchedule,
          userEmail: currentUser.Email,
          userName: currentUser.Name
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast("Jadwal pengiriman email otomatis berhasil disimpan & diperbarui!", "success");
      } else {
        addToast("Gagal menyimpan jadwal otomatis.", "error");
      }
    } catch (err) {
      addToast("Gagal menghubungi server untuk jadwal otomatis.", "error");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Send Email Summary Handler
  const handleSendEmailSummary = async () => {
    if (!emailRecipient || !emailRecipient.includes("@")) {
      addToast("Harap masukkan atau pilih alamat email penerima yang valid.", "error");
      return;
    }

    setIsSendingEmail(true);
    try {
      let pdfBase64 = "";
      try {
        const pdfDoc = generatePdfDocInstance();
        pdfBase64 = pdfDoc.output("datauristring").split(",")[1];
      } catch (pdfErr) {
        console.warn("Could not generate PDF attachment in client:", pdfErr);
      }

      const response = await fetch("/api/send-email-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: emailRecipient,
          recipientName: emailRecipient.includes(",") ? "Direksi & Management" : emailRecipient.split("@")[0],
          subject: emailSubject || `Executive Summary & Trend Anggaran Legal ${getCompanyDisplayName(activeCompany)}`,
          notes: emailNotes,
          senderEmail: "noreply-legalbudget@ajinomoto.co.id",
          senderName: "Legal Department Budget System",
          pdfBase64,
          summaryData: {
            totalBudget,
            totalPlanAmount,
            totalActual,
            remainingBudget,
            utilizationRate: Number(utilizationRate.toFixed(1)),
            peakMonthName: peakMonth?.fullName,
            peakMonthAmount: peakMonth?.Pengeluaran,
            avgMonthlyBurn,
            topCategoryName: topCategoryInfo?.name
          }
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        addToast(data.message || `Executive Summary (beserta Lampiran PDF) berhasil dikirim ke: ${emailRecipient}!`, "success");

        if (data.previewUrl) {
          window.open(data.previewUrl, "_blank");
        }
      } else {
        addToast(data.error || "Gagal mengirim email summary.", "error");
      }
    } catch (err) {
      addToast("Terjadi kesalahan koneksi saat mengirim email summary.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Helper to construct Executive Summary & Trend PDF Document (High-Fidelity Vector Report)
  const generatePdfDocInstance = () => {
    const pdf = new jsPDF("p", "mm", "a4");
    const margin = 12;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - margin * 2; // 186mm

    const addHeaderBanner = (pageTitle: string) => {
      // Top crisp corporate accent bar
      pdf.setFillColor(230, 0, 18); // #E60012
      pdf.rect(0, 0, pageWidth, 2.8, "F");

      // Brand Slogan (Eat Well, Live Well.)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.8);
      pdf.setTextColor(230, 0, 18);
      pdf.text("Eat Well, Live Well.", margin, 7.5);

      // Company title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(getCompanyDisplayUpper(activeCompany), margin, 12.2);

      // Report identifier badge
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(220, 38, 38);
      pdf.text("FY 2026 OFFICIAL EXECUTIVE REPORT", pageWidth - margin, 9.5, { align: "right" });

      // Department & System subtitle
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.2);
      pdf.setTextColor(100, 116, 139);
      pdf.text("LEGAL & COMPLIANCE DEPARTMENT  •  BUDGET PERFORMANCE SUMMARY", margin, 16.5);

      // Date right-aligned
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.2);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        "Tanggal: " + new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        pageWidth - margin,
        15.5,
        { align: "right" }
      );

      // Divider rule
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.3);
      pdf.line(margin, 20.5, pageWidth - margin, 20.5);
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`${getCompanyDisplayUpper(activeCompany)} - LEGAL DEPARTMENT BUDGET SYSTEM`, margin, pageHeight - 8.5);

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(6.8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Verified System Output • Confidential & Proprietary", margin, pageHeight - 4.8);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Halaman ${pageNum} dari ${totalPages}`, pageWidth - margin, pageHeight - 8.5, { align: "right" });
    };

    // --- PAGE 1: EXECUTIVE SUMMARY & VISUAL TREND CHART ---
    addHeaderBanner("PAGE 1");

    let y = 29;

    // Report Title using Executive Sans
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("EXECUTIVE SUMMARY & PERFORMANCE ANGGARAN FY 2026", margin, y);
    y += 6.5;

    // Subtitle using Clean Sans-Serif
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text("Laporan evaluasi komprehensif realisasi anggaran hukum, efisiensi penyerapan, dan analisis run-rate bulanan divisi.", margin, y);
    y += 5.5;

    // Section line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.4);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 1. 4 KPI Financial Summary Cards Grid
    const cardWidth = 43.5;
    const cardHeight = 22.5;
    const cardGap = 4;

    // Card 1: Plafon Budget
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, "FD");
    pdf.setFillColor(100, 116, 139);
    pdf.rect(margin, y, 2.2, cardHeight, "F"); // Left accent bar
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text("TOTAL PLAFON BUDGET", margin + 4.5, y + 6);
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(formatRupiah(totalBudget), margin + 4.5, y + 13.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("Anggaran Dasar FY 2026", margin + 4.5, y + 18.5);

    // Card 2: Total Realisasi
    const c2X = margin + cardWidth + cardGap;
    pdf.setFillColor(254, 242, 242);
    pdf.setDrawColor(254, 202, 202);
    pdf.roundedRect(c2X, y, cardWidth, cardHeight, 2, 2, "FD");
    pdf.setFillColor(220, 38, 38);
    pdf.rect(c2X, y, 2.2, cardHeight, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(185, 28, 28);
    pdf.text("TOTAL REALISASI (ACTUAL)", c2X + 4.5, y + 6);
    pdf.setFontSize(10.5);
    pdf.setTextColor(220, 38, 38);
    pdf.text(formatRupiah(totalActual), c2X + 4.5, y + 13.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(185, 28, 28);
    pdf.text("Total Pengeluaran Real", c2X + 4.5, y + 18.5);

    // Card 3: Sisa Plafon
    const c3X = c2X + cardWidth + cardGap;
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(187, 247, 208);
    pdf.roundedRect(c3X, y, cardWidth, cardHeight, 2, 2, "FD");
    pdf.setFillColor(22, 163, 74);
    pdf.rect(c3X, y, 2.2, cardHeight, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(21, 128, 61);
    pdf.text("SISA PLAFON ANGGARAN", c3X + 4.5, y + 6);
    pdf.setFontSize(10.5);
    pdf.setTextColor(22, 163, 74);
    pdf.text(formatRupiah(remainingBudget), c3X + 4.5, y + 13.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(21, 128, 61);
    pdf.text("Dana Belum Terpakai", c3X + 4.5, y + 18.5);

    // Card 4: Utilisasi %
    const c4X = c3X + cardWidth + cardGap;
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(c4X, y, cardWidth, cardHeight, 2, 2, "FD");
    pdf.setFillColor(37, 99, 235);
    pdf.rect(c4X, y, 2.2, cardHeight, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(30, 64, 175);
    pdf.text("PERSENTASE UTILISASI", c4X + 4.5, y + 6);
    pdf.setFontSize(11.5);
    pdf.setTextColor(30, 58, 138);
    pdf.text(`${utilizationRate.toFixed(1)}%`, c4X + 4.5, y + 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(30, 64, 175);
    pdf.text("Tingkat Penyerapan YTD", c4X + 4.5, y + 18.5);

    y += cardHeight + 8;

    // 2. Section: A. ANALISIS TREND & POLA PENGELUARAN TAHUN 2026
    pdf.setFillColor(230, 0, 18);
    pdf.rect(margin, y - 3, 2.2, 4.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("A. ANALISIS TREND & POLA PENGELUARAN TAHUN 2026", margin + 4.5, y);
    y += 5.5;

    // 3 Detailed Trend Cards (Peak Month, Burn Rate, Year-End Projection)
    const trendCardW = 59.3;
    const trendCardH = 24;
    const trendGap = 4;

    // Trend Card 1: Peak Month
    pdf.setFillColor(255, 251, 235);
    pdf.setDrawColor(253, 230, 138);
    pdf.roundedRect(margin, y, trendCardW, trendCardH, 2.2, 2.2, "FD");
    pdf.setFillColor(217, 119, 6);
    pdf.rect(margin, y, 2.2, trendCardH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(180, 83, 9);
    pdf.text("PEAK SPENDING MONTH", margin + 4.5, y + 5.8);
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text(peakMonth ? peakMonth.fullName : "Belum Ada Data", margin + 4.5, y + 11.5);
    pdf.setFontSize(9);
    pdf.setTextColor(220, 38, 38);
    pdf.text(peakMonth ? formatRupiah(peakMonth.Pengeluaran) : "Rp 0", margin + 4.5, y + 16.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(180, 83, 9);
    pdf.text("Bulan pengeluaran terbesar FY 2026", margin + 4.5, y + 21);

    // Trend Card 2: Monthly Burn Rate
    const tc2X = margin + trendCardW + trendGap;
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(tc2X, y, trendCardW, trendCardH, 2.2, 2.2, "FD");
    pdf.setFillColor(37, 99, 235);
    pdf.rect(tc2X, y, 2.2, trendCardH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(30, 64, 175);
    pdf.text("MONTHLY BURN RATE", tc2X + 4.5, y + 5.8);
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Rata-rata Run-Rate", tc2X + 4.5, y + 11.5);
    pdf.setFontSize(9);
    pdf.setTextColor(29, 78, 216);
    pdf.text(`${formatRupiah(avgMonthlyBurn)} / bln`, tc2X + 4.5, y + 16.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(30, 64, 175);
    pdf.text("Berdasarkan bulan aktif bertransaksi", tc2X + 4.5, y + 21);

    // Trend Card 3: Year-End Projection
    const tc3X = tc2X + trendCardW + trendGap;
    pdf.setFillColor(236, 253, 245);
    pdf.setDrawColor(167, 243, 208);
    pdf.roundedRect(tc3X, y, trendCardW, trendCardH, 2.2, 2.2, "FD");
    pdf.setFillColor(5, 150, 105);
    pdf.rect(tc3X, y, 2.2, trendCardH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.2);
    pdf.setTextColor(6, 95, 70);
    pdf.text("PROYEKSI AKHIR TAHUN", tc3X + 4.5, y + 5.8);
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Estimasi Total 12 Bulan", tc3X + 4.5, y + 11.5);
    pdf.setFontSize(9);
    pdf.setTextColor(4, 120, 87);
    pdf.text(formatRupiah(yearEndProjection), tc3X + 4.5, y + 16.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(6, 95, 70);
    pdf.text(yearEndProjection > totalBudget ? "⚠️ Berpotensi Melebihi Plafon" : "✓ Dalam Batas Plafon Aman", tc3X + 4.5, y + 21);

    y += trendCardH + 5;

    // Dominant Legal Category Banner
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y, contentWidth, 9, 2, 2, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text("KATEGORI LEGAL DOMINAN:", margin + 4, y + 5.8);
    pdf.setFontSize(8.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(topCategoryInfo ? topCategoryInfo.name : "-", margin + 48, y + 5.8);
    pdf.setFontSize(8.5);
    pdf.setTextColor(220, 38, 38);
    pdf.text(topCategoryInfo ? formatRupiah(topCategoryInfo.amount) : "Rp 0", margin + contentWidth - 4, y + 5.8, { align: "right" });

    y += 14;

    // 3. Section: B. GRAFIK VISUAL TREND PENGELUARAN & RUN-RATE BULANAN
    pdf.setFillColor(230, 0, 18);
    pdf.rect(margin, y - 3, 2.2, 4.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("B. GRAFIK VISUAL TREND PENGELUARAN & RUN-RATE BULANAN", margin + 4.5, y);
    y += 4.5;

    // Chart Box Container
    const chartBoxH = 82;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y, contentWidth, chartBoxH, 3, 3, "FD");

    // Helper for formatting chart values compactly (e.g. 2.0B, 351.8M, 361rb, 0M)
    const formatCompactChartVal = (val: number): string => {
      if (!val || val <= 0) return "0M";
      if (val >= 1000000000) {
        const bVal = val / 1000000000;
        return bVal % 1 === 0 ? `${bVal.toFixed(0)}B` : `${bVal.toFixed(1)}B`;
      }
      if (val >= 1000000) {
        const mVal = val / 1000000;
        return mVal % 1 === 0 ? `${mVal.toFixed(0)}M` : `${mVal.toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${Math.round(val / 1000)}rb`;
      }
      return `${val}`;
    };

    // Chart Plot Dimensions
    const plotLeft = margin + 20;
    const plotRight = margin + contentWidth - 8;
    const plotW = plotRight - plotLeft; // ~160mm
    const plotTop = y + 10;
    const plotBottom = y + 62;
    const plotH = plotBottom - plotTop; // ~52mm

    // Calculate Max Value for Chart Y Axis with nice rounded headroom
    const rawMaxVal = Math.max(
      ...monthlyDataList.map((m) => Math.max(m.Pengeluaran || 0, (m as any).PlanBudget || 0)),
      avgMonthlyBurn || 0,
      1000000
    );
    // Add 15% headroom so peaks are well below the top boundary
    const maxChartVal = rawMaxVal * 1.15;

    // Horizontal Grid Lines & Y-Axis Labels
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.setTextColor(100, 116, 139);
    
    // 5 Horizontal Grid Lines (0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const gridY = plotBottom - (i / 4) * plotH;
      
      // Light dashed horizontal grid line
      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.35);
      for (let gx = plotLeft; gx < plotRight; gx += 3.5) {
        pdf.line(gx, gridY, Math.min(gx + 2, plotRight), gridY);
      }

      // Small tick mark on Y-axis
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);
      pdf.line(plotLeft - 1.5, gridY, plotLeft, gridY);

      const val = (maxChartVal * i) / 4;
      const valStr = formatCompactChartVal(val);
      pdf.text(valStr, plotLeft - 2.5, gridY + 1.2, { align: "right" });
    }

    // Vertical Y-axis line
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.6);
    pdf.line(plotLeft, plotTop, plotLeft, plotBottom);

    const stepW = plotW / 12;

    // Baseline X-axis line
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.6);
    pdf.line(plotLeft, plotBottom, plotRight, plotBottom);

    // Draw Month Labels on X-axis and subtle vertical grid tick marks
    monthlyDataList.forEach((m, idx) => {
      const ptX = plotLeft + idx * stepW + stepW / 2;
      
      // Small vertical tick mark on X-axis
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.4);
      pdf.line(ptX, plotBottom, ptX, plotBottom + 1.5);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.2);
      pdf.setTextColor(71, 85, 105);
      pdf.text(m.name, ptX, plotBottom + 5.2, { align: "center" });
    });

    // Calculate Exact Coordinates for Realisasi & Plan Points
    const realisasiPoints: { x: number; y: number; val: number; name: string }[] = monthlyDataList.map((m, idx) => ({
      x: plotLeft + idx * stepW + stepW / 2,
      y: plotBottom - ((m.Pengeluaran || 0) / maxChartVal) * plotH,
      val: m.Pengeluaran || 0,
      name: m.name
    }));

    const planPoints: { x: number; y: number; val: number; name: string }[] = monthlyDataList.map((m, idx) => ({
      x: plotLeft + idx * stepW + stepW / 2,
      y: plotBottom - (((m as any).PlanBudget || 0) / maxChartVal) * plotH,
      val: (m as any).PlanBudget || 0,
      name: m.name
    }));

    // Smooth Catmull-Rom Spline Interpolator
    const getCatmullRomSpline = (
      points: { x: number; y: number }[],
      numSegments = 20,
      clampBottom?: number,
      clampTop?: number
    ): { x: number; y: number }[] => {
      if (points.length === 0) return [];
      if (points.length === 1) return [points[0]];

      const result: { x: number; y: number }[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        for (let j = (i === 0 ? 0 : 1); j <= numSegments; j++) {
          const t = j / numSegments;
          const t2 = t * t;
          const t3 = t2 * t;

          // Catmull-Rom spline formula
          let px = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
          );
          let py = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
          );

          if (clampBottom !== undefined && py > clampBottom) py = clampBottom;
          if (clampTop !== undefined && py < clampTop) py = clampTop;

          result.push({ x: px, y: py });
        }
      }
      return result;
    };

    // 1. Generate High-Resolution Smooth Spline Curve Points
    const smoothPlanSpline = getCatmullRomSpline(planPoints, 20, plotBottom, plotTop - 1);
    const smoothRealisasiSpline = getCatmullRomSpline(realisasiPoints, 20, plotBottom, plotTop - 1);

    // 2. Soft Area Shading for Plan Budget (Light Cool Slate Gradient)
    if (smoothPlanSpline.length > 1) {
      pdf.setFillColor(241, 245, 249);
      for (let i = 0; i < smoothPlanSpline.length - 1; i++) {
        const p1 = smoothPlanSpline[i];
        const p2 = smoothPlanSpline[i + 1];
        pdf.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, plotBottom, "F");
        pdf.triangle(p2.x, p2.y, p2.x, plotBottom, p1.x, plotBottom, "F");
      }
    }

    // 3. Soft Area Shading for Realisasi Actual (Light Rose/Pink Gradient)
    if (smoothRealisasiSpline.length > 1) {
      pdf.setFillColor(254, 226, 226);
      for (let i = 0; i < smoothRealisasiSpline.length - 1; i++) {
        const p1 = smoothRealisasiSpline[i];
        const p2 = smoothRealisasiSpline[i + 1];
        pdf.triangle(p1.x, p1.y, p2.x, p2.y, p1.x, plotBottom, "F");
        pdf.triangle(p2.x, p2.y, p2.x, plotBottom, p1.x, plotBottom, "F");
      }
    }

    // 4. Draw Smooth Plan Budget Curve (Deep Charcoal / Slate #1E293B)
    if (smoothPlanSpline.length > 1) {
      pdf.setDrawColor(30, 41, 59);
      pdf.setLineWidth(1.3);
      for (let i = 0; i < smoothPlanSpline.length - 1; i++) {
        pdf.line(smoothPlanSpline[i].x, smoothPlanSpline[i].y, smoothPlanSpline[i + 1].x, smoothPlanSpline[i + 1].y);
      }
    }

    // 5. Draw Smooth Realisasi Actual Curve (Vivid Red #DC2626 / #E60012)
    if (smoothRealisasiSpline.length > 1) {
      pdf.setDrawColor(220, 38, 38);
      pdf.setLineWidth(1.4);
      for (let i = 0; i < smoothRealisasiSpline.length - 1; i++) {
        pdf.line(smoothRealisasiSpline[i].x, smoothRealisasiSpline[i].y, smoothRealisasiSpline[i + 1].x, smoothRealisasiSpline[i + 1].y);
      }
    }

    // 6. Draw Plan Budget Markers & Value Labels (Slate Nodes)
    planPoints.forEach((pt, idx) => {
      // Outer slate circle
      pdf.setFillColor(30, 41, 59);
      pdf.circle(pt.x, pt.y, 1.35, "F");
      // Inner white center
      pdf.setFillColor(255, 255, 255);
      pdf.circle(pt.x, pt.y, 0.65, "F");

      // Draw Value Label above Plan node if > 0
      if (pt.val > 0) {
        const valStr = formatCompactChartVal(pt.val);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(5.8);
        pdf.setTextColor(15, 23, 42);
        
        // Offset label safely above point
        const labelY = Math.max(plotTop + 1, pt.y - 3.2);
        pdf.text(valStr, pt.x, labelY, { align: "center" });
      }
    });

    // 7. Draw Realisasi Actual Markers & Value Labels (Red Nodes)
    realisasiPoints.forEach((pt, idx) => {
      // Outer red circle
      pdf.setFillColor(220, 38, 38);
      pdf.circle(pt.x, pt.y, 1.35, "F");
      // Inner white center
      pdf.setFillColor(255, 255, 255);
      pdf.circle(pt.x, pt.y, 0.65, "F");

      // Draw Value Label for Realisasi (Actual)
      const valStr = formatCompactChartVal(pt.val);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5.8);
      
      const planPt = planPoints[idx];
      let labelY = pt.y - 3.2;

      // Avoid label overlap if Plan & Realisasi points are close
      if (planPt && planPt.val > 0 && Math.abs(pt.y - planPt.y) < 4.5) {
        if (pt.y >= planPt.y) {
          labelY = pt.y + 4.2; // place below node
        } else {
          labelY = pt.y - 4.2; // place higher
        }
      }

      if (labelY > plotBottom - 1) {
        labelY = pt.y - 3.2;
      }

      pdf.setTextColor(185, 28, 28);
      pdf.text(valStr, pt.x, labelY, { align: "center" });
    });

    // 8. Elegant Centered Bottom Legend (Matching Reference Image)
    const legendBottomY = y + chartBoxH - 4.8;
    const legendCenterX = margin + contentWidth / 2;

    pdf.setFontSize(7.2);
    pdf.setFont("helvetica", "bold");

    // Item 1: Realisasi Pengeluaran (Actual) [Red]
    const leg1X = legendCenterX - 45;
    pdf.setDrawColor(220, 38, 38);
    pdf.setLineWidth(1.3);
    pdf.line(leg1X - 7, legendBottomY - 1, leg1X + 1, legendBottomY - 1);
    pdf.setFillColor(220, 38, 38);
    pdf.circle(leg1X - 3, legendBottomY - 1, 1.2, "F");
    pdf.setFillColor(255, 255, 255);
    pdf.circle(leg1X - 3, legendBottomY - 1, 0.55, "F");
    pdf.setTextColor(220, 38, 38);
    pdf.text("Realisasi Pengeluaran (Actual)", leg1X + 3.5, legendBottomY);

    // Item 2: Rencana Pengeluaran (Plan Budget) [Dark Charcoal]
    const leg2X = legendCenterX + 22;
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(1.3);
    pdf.line(leg2X - 7, legendBottomY - 1, leg2X + 1, legendBottomY - 1);
    pdf.setFillColor(30, 41, 59);
    pdf.circle(leg2X - 3, legendBottomY - 1, 1.2, "F");
    pdf.setFillColor(255, 255, 255);
    pdf.circle(leg2X - 3, legendBottomY - 1, 0.55, "F");
    pdf.setTextColor(30, 41, 59);
    pdf.text("Rencana Pengeluaran (Plan Budget)", leg2X + 3.5, legendBottomY);

    // --- PAGE 2: DETAILED TABULAR BREAKDOWN REPORTS ---
    pdf.addPage();
    addHeaderBanner("PAGE 2");
    y = 29;

    // 4. Section: C. BREAKDOWN PERFORMANCE TREND PENGELUARAN BULANAN
    pdf.setFillColor(230, 0, 18);
    pdf.rect(margin, y - 3, 2.2, 4.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("C. BREAKDOWN PERFORMANCE TREND PENGELUARAN BULANAN", margin + 4.5, y);
    y += 5;

    // Table 1 Header (Strictly aligned columns: X=16, 92, 117, 162, 194)
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, y, contentWidth, 7.5, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Bulan", margin + 4, y + 4.8);
    pdf.text("Realisasi Actual (Rp)", margin + 80, y + 4.8, { align: "right" });
    pdf.text("Transaksi", margin + 105, y + 4.8, { align: "center" });
    pdf.text("Akumulasi YTD (Rp)", margin + 150, y + 4.8, { align: "right" });
    pdf.text("MoM Growth (%)", margin + 182, y + 4.8, { align: "right" });
    y += 7.5;

    // Table 1 Rows (sorted by month order Apr - Mar)
    monthlyDataList.forEach((m, idx) => {
      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, contentWidth, 6.2, "F");
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(m.fullName, margin + 4, y + 4.2);

      pdf.setTextColor(220, 38, 38);
      pdf.text(formatRupiah(m.Pengeluaran), margin + 80, y + 4.2, { align: "right" });

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      pdf.text(String(m.JumlahTransaksi), margin + 105, y + 4.2, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text(formatRupiah(m.AkumulasiYTD), margin + 150, y + 4.2, { align: "right" });

      if (m.MoMGrowth === 0) {
        pdf.setTextColor(148, 163, 184);
        pdf.text("-", margin + 182, y + 4.2, { align: "right" });
      } else if (m.MoMGrowth > 0) {
        pdf.setTextColor(220, 38, 38);
        pdf.text(`+${m.MoMGrowth}%`, margin + 182, y + 4.2, { align: "right" });
      } else {
        pdf.setTextColor(22, 163, 74);
        pdf.text(`${m.MoMGrowth}%`, margin + 182, y + 4.2, { align: "right" });
      }

      y += 6.2;
    });

    // Table 1 Total Summary Row (Zero collision with amounts)
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, y, contentWidth, 7.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.2);
    pdf.setTextColor(15, 23, 42);
    pdf.text("TOTAL REALISASI TAHUN 2026", margin + 4, y + 4.7);
    pdf.setTextColor(185, 28, 28);
    pdf.text(formatRupiah(totalActual), margin + 80, y + 4.7, { align: "right" });
    const totalTx = monthlyDataList.reduce((s, m) => s + m.JumlahTransaksi, 0);
    pdf.setTextColor(15, 23, 42);
    pdf.text(String(totalTx), margin + 105, y + 4.7, { align: "center" });
    pdf.text(formatRupiah(totalActual), margin + 150, y + 4.7, { align: "right" });
    pdf.text("-", margin + 182, y + 4.7, { align: "right" });

    y += 13;

    // 5. Section: D. BREAKDOWN REALISASI PER KATEGORI LEGAL
    pdf.setFillColor(230, 0, 18);
    pdf.rect(margin, y - 3, 2.2, 4.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("D. BREAKDOWN REALISASI PER KATEGORI LEGAL", margin + 4.5, y);
    y += 5;

    // Table 2 Header (Strictly aligned: X=16, 102, 142, 176, 194)
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, y, contentWidth, 7.5, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Kategori Legal", margin + 4, y + 4.8);
    pdf.text("Target Plan (Rp)", margin + 90, y + 4.8, { align: "right" });
    pdf.text("Realisasi Actual (Rp)", margin + 130, y + 4.8, { align: "right" });
    pdf.text("Sisa Anggaran (Rp)", margin + 164, y + 4.8, { align: "right" });
    pdf.text("Utilisasi", margin + 182, y + 4.8, { align: "right" });
    y += 7.5;

    // Table 2 Rows (sorted by actual amount descending, then target descending)
    const sortedCategories = [...consolidatedCategories].sort((catA, catB) => {
      const metricA = getCategoryMetrics(catA);
      const metricB = getCategoryMetrics(catB);
      return metricB.actual - metricA.actual || metricB.target - metricA.target;
    });

    sortedCategories.forEach((catName, index) => {
      const { target: catTarget, actual: catActual, remaining: catRemaining, util: catUtil } = getCategoryMetrics(catName);

      if (y > 265) {
        addFooter(pdf.getNumberOfPages(), pdf.getNumberOfPages());
        pdf.addPage();
        addHeaderBanner(`PAGE ${pdf.getNumberOfPages()}`);
        y = 29;
      }

      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, contentWidth, 7.2, "F");
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);
      // Safely truncate category name to prevent collision with Target Plan at X=102
      const displayCat = catName.length > 26 ? catName.substring(0, 24) + "..." : catName;
      pdf.text(displayCat, margin + 4, y + 4.6);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(71, 85, 105);
      pdf.text(formatRupiah(catTarget), margin + 90, y + 4.6, { align: "right" });

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(220, 38, 38);
      pdf.text(formatRupiah(catActual), margin + 130, y + 4.6, { align: "right" });

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(22, 163, 74);
      pdf.text(formatRupiah(catRemaining), margin + 164, y + 4.6, { align: "right" });

      // Clean percentage text without overlapping rectangle bar
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      const utilStr = `${isNaN(catUtil) ? "0.0" : catUtil.toFixed(1)}%`;
      pdf.text(utilStr, margin + 182, y + 4.6, { align: "right" });

      y += 7.2;
    });

    y += 10;

    // 6. Section: E. RINCIAN ALOKASI PLAN ANGGARAN UTAMA
    if (y > 230) {
      addFooter(pdf.getNumberOfPages(), pdf.getNumberOfPages());
      pdf.addPage();
      addHeaderBanner(`PAGE ${pdf.getNumberOfPages()}`);
      y = 29;
    }

    pdf.setFillColor(230, 0, 18);
    pdf.rect(margin, y - 3, 2.2, 4.2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text("E. RINCIAN ALOKASI PLAN ANGGARAN UTAMA (TOP LEGAL PLANS)", margin + 4.5, y);
    y += 5;

    // Table 3 Header (Strictly aligned: X=16, 40, 142, 176, 194)
    pdf.setFillColor(30, 41, 59);
    pdf.rect(margin, y, contentWidth, 7.5, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("Kode Plan", margin + 4, y + 4.8);
    pdf.text("Judul Program / Plan Legal", margin + 28, y + 4.8);
    pdf.text("Target Plan (Rp)", margin + 130, y + 4.8, { align: "right" });
    pdf.text("Realisasi (Rp)", margin + 164, y + 4.8, { align: "right" });
    pdf.text("Utilisasi", margin + 182, y + 4.8, { align: "right" });
    y += 7.5;

    // Table 3 Rows (sorted by actual amount descending)
    const sortedPlans = [...plans].sort((a, b) => {
      const actA = actuals.filter((item) => item.PlanID === a.PlanID).reduce((s, item) => s + (item.Amount || 0), 0);
      const actB = actuals.filter((item) => item.PlanID === b.PlanID).reduce((s, item) => s + (item.Amount || 0), 0);
      return actB - actA;
    });

    sortedPlans.slice(0, 15).forEach((p, idx) => {
      const pActual = actuals.filter((a) => a.PlanID === p.PlanID).reduce((s, a) => s + a.Amount, 0);
      const util = p.PlannedAmount > 0 ? (pActual / p.PlannedAmount) * 100 : 0;

      if (y > 265) {
        addFooter(pdf.getNumberOfPages(), pdf.getNumberOfPages());
        pdf.addPage();
        addHeaderBanner(`PAGE ${pdf.getNumberOfPages()}`);
        y = 29;
      }

      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, contentWidth, 6.8, "F");
      }

      pdf.setFontSize(7.8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(71, 85, 105);
      pdf.text(p.PlanCode || "-", margin + 4, y + 4.4);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
      const displayTitle = p.Title ? (p.Title.length > 40 ? p.Title.substring(0, 38) + "..." : p.Title) : "-";
      pdf.text(displayTitle, margin + 28, y + 4.4);

      pdf.setTextColor(71, 85, 105);
      pdf.text(formatRupiah(p.PlannedAmount), margin + 130, y + 4.4, { align: "right" });

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(220, 38, 38);
      pdf.text(formatRupiah(pActual), margin + 164, y + 4.4, { align: "right" });

      pdf.setTextColor(15, 23, 42);
      pdf.text(`${util.toFixed(1)}%`, margin + 182, y + 4.4, { align: "right" });

      y += 6.8;
    });

    // Add Footers to all pages dynamically
    const totalPgs = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPgs; p++) {
      pdf.setPage(p);
      addFooter(p, totalPgs);
    }

    return pdf;
  };

  // Direct jsPDF fallback generator if html2canvas fails
  const generateDirectPdfFallback = () => {
    const pdf = generatePdfDocInstance();
    const fileName = `${getCompanyDisplayUpper(activeCompany).replace(/[^A-Z]/g, "_")}_Legal_Executive_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);
    addToast(`Laporan PDF '${fileName}' berhasil di-download!`, "success");
  };

  // PDF Downloader Handler using high-fidelity vector PDF (identical to email attachment & Ringkasan Trend view)
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      addToast("Sedang menyusun & meng-generate file PDF Eksekutif & Trend...", "info");
      await new Promise((r) => setTimeout(r, 150));
      generateDirectPdfFallback();
    } catch (err) {
      console.error("PDF generation error:", err);
      addToast("Gagal meng-generate file PDF.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Welcome & Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-brand-dark via-gray-900 to-gray-900 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red opacity-10 rounded-full blur-3xl transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="hidden sm:flex bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shrink-0 items-center justify-center">
            <AjinomotoLogo variant="icon" theme="white" height={36} width={36} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono text-red-400 tracking-widest font-bold uppercase">{getCompanyDisplayUpper(activeCompany)}</p>
              <span className="text-[9px] bg-brand-red/80 text-white px-2 py-0.5 rounded-full font-mono uppercase">Eat Well, Live Well.</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Halo, {currentUser.Name}</h1>
            <p className="text-gray-300 text-sm">Selamat datang di sistem manajemen dan monitoring anggaran internal Legal Department.</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEmailRecipient(currentUser.Email || "direksi@ajinomoto.co.id");
              setEmailActiveTab("summary");
              setShowSummaryModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-95 border border-red-500/30"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Summary &amp; Trend Analysis</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-80" />
          </button>

          <div className="flex items-center space-x-2 bg-white/10 px-3.5 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
            <Calendar className="w-4 h-4 text-brand-red" />
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-mono">Tahun Anggaran</p>
              <p className="text-xs font-semibold text-white">2026 (Active)</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Budget Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-dark"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold font-mono">Total Budget (Plafon)</span>
              <h3 className="text-xl md:text-2xl font-display font-bold text-gray-800">{formatRupiah(totalBudget)}</h3>
              <p className="text-[11px] text-gray-400">Total plafon anggaran terdaftar</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl text-brand-dark group-hover:bg-brand-dark group-hover:text-white transition-all duration-300">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Actual Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-red"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold font-mono">Total Realisasi (Actual)</span>
              <h3 className="text-xl md:text-2xl font-display font-bold text-gray-800">{formatRupiah(totalActual)}</h3>
              <p className="text-[11px] text-gray-400">Total pengeluaran tercatat</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Remaining Budget Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold font-mono">Sisa Plafon Budget</span>
              <h3 className={`text-xl md:text-2xl font-display font-bold ${remainingBudget < 0 ? "text-red-600" : "text-gray-800"}`}>
                {formatRupiah(remainingBudget)}
              </h3>
              <p className="text-[11px] text-gray-400">Sisa dana plafon tersedia</p>
            </div>
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${remainingBudget < 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white"}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Budget Utilization Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 relative group overflow-hidden">
          <div className={`absolute top-0 left-0 w-1.5 h-full ${utilizationRate > 100 ? "bg-red-600" : utilizationRate > 80 ? "bg-amber-500" : "bg-blue-500"}`}></div>
          <div className="flex justify-between items-start">
            <div className="space-y-2 w-full">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold font-mono">Tingkat Utilisasi</span>
              <div className="flex items-baseline space-x-2">
                <h3 className="text-xl md:text-2xl font-display font-bold text-gray-800">{utilizationRate.toFixed(1)}%</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  utilizationRate > 100 ? "bg-red-100 text-red-700" :
                  utilizationRate > 80 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {utilizationRate > 100 ? "Over Limit" : utilizationRate > 80 ? "Warning" : "Healthy"}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    utilizationRate > 100 ? "bg-red-600" :
                    utilizationRate > 80 ? "bg-amber-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Budget Monitoring Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-gray-800 p-5 rounded-2xl text-white shadow-md border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-display font-bold text-base text-white">Ringkasan Plan Budget (Rencana Operasional)</h3>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono border border-amber-500/30 font-semibold">
                {plans.length} Rencana Terdaftar
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">
              Rencana penggunaan Master Budget yang terus dipantau realisasinya secara real-time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
          <div className="pr-4 border-r border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Plan</span>
            <span className="text-sm font-bold text-white">{formatRupiah(totalPlanAmount)}</span>
          </div>
          <div className="pr-4 border-r border-white/10">
            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Realisasi Cost</span>
            <span className="text-sm font-bold text-emerald-400">{formatRupiah(totalPlanSpent)}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Sisa Plan</span>
            <span className={`text-sm font-bold ${remainingPlanAmount < 0 ? "text-red-400" : "text-amber-300"}`}>
              {formatRupiah(remainingPlanAmount)}
            </span>
          </div>
          <button
            onClick={() => onNavigate("plan-budget")}
            className="ml-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>Kelola Plan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Global Chart Filters & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-red-50 text-brand-red rounded-xl">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display text-gray-800 uppercase tracking-wider">Filter Global Dashboard</h3>
            <p className="text-[11px] text-gray-400">Filter tahun dan kategori berlaku menyeluruh pada semua grafik dan tabel di bawah</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/80">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px] text-gray-500 font-medium">Tahun:</span>
            <select
              value={chartFilterYear}
              onChange={(e) => setChartFilterYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="2026">2026 (Aktif)</option>
              <option value="2025">2025</option>
              <option value="All">Semua Tahun</option>
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/80">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[11px] text-gray-500 font-medium">Kategori:</span>
            <select
              value={chartFilterCategory}
              onChange={(e) => setChartFilterCategory(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="All">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.CategoryID} value={c.CategoryName}>
                  {c.CategoryName}
                </option>
              ))}
            </select>
          </div>

          {(chartFilterCategory !== "All" || chartFilterYear !== "2026") && (
            <button
              onClick={() => {
                setChartFilterCategory("All");
                setChartFilterYear("2026");
              }}
              className="text-[11px] text-brand-red font-semibold hover:underline px-2 py-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Full-Width Section Layout (No Legal AI Advisor column) */}
      <div className="space-y-6 w-full">
        
        {/* ========================================================================= */}
        {/* SECTION: PERSENTASE PENGGUNAAN BUDGET BULAN BERJALAN & BULAN MENDATANG     */}
        {/* ========================================================================= */}
        {(() => {
          const fyData = getFiscalYearUsageProgress();
          return (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-5 w-full">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-gradient-to-br from-red-500 to-brand-red text-white rounded-xl shadow-xs">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-gray-900 font-display">
                        Monitoring Persentase Penggunaan Budget Bulan Berjalan &amp; Bulan Mendatang (FY)
                      </h3>
                      <span className="bg-red-50 text-brand-red text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border border-red-200">
                        April - Maret (12 Bulan)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Analisis persentase dan nominal penggunaan anggaran bulan berjalan serta proyeksi penyelesaian hingga akhir Fiscal Year
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                  <Calendar className="w-3.5 h-3.5 text-brand-red" />
                  <span className="text-xs font-medium text-gray-600">Plafon FY Target:</span>
                  <span className="text-xs font-bold font-mono text-gray-900">{formatRupiah(fyData.totalPlafonFY)}</span>
                </div>
              </div>

              {/* Highlights Grid: Bulan Berjalan vs Bulan Mendatang */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CARD 1: BULAN BERJALAN */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-white border border-slate-700 shadow-sm relative overflow-hidden space-y-3">
                  <div className="absolute top-0 right-0 p-8 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                        <Clock className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">Bulan Berjalan (Current Month)</span>
                        <h4 className="text-lg font-display font-bold text-white">
                          {fyData.currentMonthData.short} (M0{fyData.currentMonthData.mNo} FY)
                        </h4>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-400/20 text-amber-300 rounded-full border border-amber-400/30">
                      Usage YTD: {fyData.currentMonthData.usagePct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">Realisasi (Actual)</span>
                      <span className="text-base font-bold text-brand-red font-mono block mt-0.5">
                        {formatRupiah(fyData.currentMonthData.actualAmt)}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Pengeluaran tercatat</span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-400 uppercase font-mono block">Rencana Forecast (RF)</span>
                      <span className="text-base font-bold text-amber-300 font-mono block mt-0.5">
                        {formatRupiah(fyData.currentMonthData.planAmt)}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Target rencana bulan ini</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-gray-300">Pencapaian vs Target Plan (Actual vs RF):</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                      fyData.currentMonthData.actualVsRfPct > 100 
                        ? "bg-red-500/20 text-red-300 border border-red-500/30" 
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}>
                      {fyData.currentMonthData.actualVsRfPct}%
                    </span>
                  </div>
                </div>

                {/* CARD 2: BULAN MENDATANG SAMPAI AKHIR FISCAL YEAR */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white border border-teal-800 shadow-sm relative overflow-hidden space-y-3">
                  <div className="absolute top-0 right-0 p-8 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>

                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                        <Target className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Bulan Mendatang s.d. Akhir FY</span>
                        <h4 className="text-lg font-display font-bold text-white">
                          Sisa {fyData.futureMonths.length} Bulan FY ({fyData.futureMonths[0]?.abbr || "Sep"} - {fyData.futureMonths[fyData.futureMonths.length - 1]?.abbr || "Mar"})
                        </h4>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-400/20 text-emerald-300 rounded-full border border-emerald-400/30">
                      Proyeksi Final: {fyData.projectedFinalFYUsagePct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-300 uppercase font-mono block">Plan Forecast Sisa Bulan</span>
                      <span className="text-base font-bold text-teal-300 font-mono block mt-0.5">
                        {formatRupiah(fyData.futurePlanTotal)}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Target nominal diselesaikan</span>
                    </div>

                    <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                      <span className="text-[10px] text-gray-300 uppercase font-mono block">Proyeksi Total Akhir FY</span>
                      <span className="text-base font-bold text-white font-mono block mt-0.5">
                        {formatRupiah(fyData.projectedFinalFYTotal)}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">Actual YTD + Future Plans</span>
                    </div>
                  </div>

                  {/* Progress Bar Proyeksi Final */}
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-300">Estimasi Ketercapaian Terhadap Plafon:</span>
                      <span className="font-mono font-bold text-teal-300">{fyData.projectedFinalFYUsagePct}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          fyData.projectedFinalFYUsagePct > 100 ? "bg-red-500" : "bg-emerald-400"
                        }`}
                        style={{ width: `${Math.min(fyData.projectedFinalFYUsagePct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Matrix Breakdown Table (Matching Excel/Spreadsheet Layout) */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="w-4 h-4 text-brand-red" />
                    <span className="text-xs font-bold text-gray-800 font-display">
                      Tabel Matriks Penggunaan Budget Fiscal Year (Quartal &amp; Bulanan)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-gray-500">
                    Format Laporan Keuangan Standard
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      {/* Row 1: Quartals Header */}
                      <tr className="bg-blue-100/70 border-b border-blue-200 text-blue-950 text-center font-bold font-mono">
                        <th className="p-2 border-r border-blue-200/80 text-left bg-blue-100 w-36">Quartal</th>
                        <th colSpan={3} className="p-2 border-r border-blue-200/80">Q1</th>
                        <th colSpan={3} className="p-2 border-r border-blue-200/80">Q2</th>
                        <th colSpan={3} className="p-2 border-r border-blue-200/80">Q3</th>
                        <th colSpan={3} className="p-2 border-r border-blue-200/80">Q4</th>
                        <th className="p-2 bg-blue-200/70 text-blue-950 font-extrabold w-32">Total FY</th>
                      </tr>

                      {/* Row 2: Months Header */}
                      <tr className="bg-emerald-100/80 border-b border-emerald-200/80 text-emerald-950 text-center font-bold">
                        <th className="p-2 border-r border-emerald-200/80 text-left bg-emerald-100">Month</th>
                        {fyData.monthlyList.map((m) => (
                          <th 
                            key={m.code} 
                            className={`p-2 border-r border-emerald-200/80 min-w-[72px] ${
                              m.isCurrentMonth ? "bg-amber-200 text-amber-950 font-extrabold ring-2 ring-amber-400 inset-0" : ""
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>{m.short}</span>
                              {m.isCurrentMonth && (
                                <span className="text-[8px] px-1 bg-amber-500 text-white rounded font-mono uppercase mt-0.5">
                                  Aktif
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 bg-emerald-200/70 text-emerald-950 font-extrabold">Total</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                      {/* Row 1: Actual (Realisasi) */}
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-gray-900 border-r border-gray-200 bg-gray-50 font-sans">
                          Actual (Realisasi)
                        </td>
                        {fyData.monthlyList.map((m) => (
                          <td 
                            key={m.code} 
                            className={`p-2 text-right border-r border-gray-200 font-bold ${
                              m.isCurrentMonth ? "bg-amber-50/80 text-brand-red font-black" : "text-gray-800"
                            }`}
                          >
                            {m.actualAmt > 0 ? (m.actualAmt / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "0"}
                          </td>
                        ))}
                        <td className="p-2 text-right font-extrabold text-brand-red bg-red-50/50">
                          {(fyData.totalActualFY / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                        </td>
                      </tr>

                      {/* Row 2: RF / Plan Budget */}
                      <tr className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-gray-900 border-r border-gray-200 bg-gray-50 font-sans">
                          RF / Plan Budget
                        </td>
                        {fyData.monthlyList.map((m) => (
                          <td 
                            key={m.code} 
                            className={`p-2 text-right border-r border-gray-200 ${
                              m.isCurrentMonth ? "bg-amber-50/80 font-bold text-amber-900" : "text-gray-700"
                            }`}
                          >
                            {m.planAmt > 0 ? (m.planAmt / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : "0"}
                          </td>
                        ))}
                        <td className="p-2 text-right font-extrabold text-gray-900 bg-gray-100/50">
                          {(fyData.totalPlanFY / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                        </td>
                      </tr>

                      {/* Row 3: Actual vs RF (%) */}
                      <tr className="hover:bg-gray-50/80 transition-colors bg-slate-50/40">
                        <td className="p-2.5 font-bold text-gray-900 border-r border-gray-200 bg-gray-50 font-sans">
                          Actual vs RF (%)
                        </td>
                        {fyData.monthlyList.map((m) => (
                          <td 
                            key={m.code} 
                            className={`p-2 text-right border-r border-gray-200 font-bold ${
                              m.actualVsRfPct > 100 ? "text-red-600" : m.actualVsRfPct > 80 ? "text-amber-600" : "text-emerald-700"
                            } ${m.isCurrentMonth ? "bg-amber-50/80" : ""}`}
                          >
                            {m.planAmt > 0 || m.actualAmt > 0 ? `${Math.round(m.actualVsRfPct)}%` : "-"}
                          </td>
                        ))}
                        <td className="p-2 text-right font-extrabold text-blue-900 bg-blue-50/50">
                          {Math.round(fyData.totalActualVsRfPctFY)}%
                        </td>
                      </tr>

                      {/* Row 4: Cumulative Usage (%) */}
                      <tr className="bg-emerald-50/60 font-bold">
                        <td className="p-2.5 text-emerald-950 border-r border-emerald-200/80 bg-emerald-100/60 font-sans">
                          Usage (%)
                        </td>
                        {fyData.monthlyList.map((m) => (
                          <td 
                            key={m.code} 
                            className={`p-2 text-right border-r border-emerald-200/80 text-emerald-900 ${
                              m.isCurrentMonth ? "bg-amber-100 text-amber-950 font-extrabold" : ""
                            }`}
                          >
                            {m.usagePct.toFixed(2)}%
                          </td>
                        ))}
                        <td className="p-2 text-right font-extrabold text-emerald-950 bg-emerald-200/80">
                          100.00%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-500 flex flex-wrap items-center justify-between gap-2">
                  <span>* Catatan: Angka nominal ditampilkan dalam jutaan Rupiah (Rp). Usage (%) dihitung secara kumulatif dari April hingga Maret.</span>
                  <span className="font-semibold text-gray-700">Dukungan Laporan Otomatis FY</span>
                </div>
              </div>
            </div>
          );
        })()}
        
        {/* ========================================================================= */}
        {/* CHART 1 (ITEM 1 & 4): DASHBOARD TREN PENGELUARAN BULANAN DENGAN SLICER    */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-gray-800 font-display">Dashboard Tren Pengeluaran Bulanan (Realisasi)</h3>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border border-emerald-200">
                  Live Slicer Realisasi
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Grafik dan tabel penggunaan budget per bulan yang dapat dislice berdasarkan bulan, kategori, dan nominal realisasi</p>
            </div>

            {/* Slicers & View Selector Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Slicer Month Dropdown */}
              <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200 text-xs">
                <span className="text-[10px] text-gray-500 font-medium font-mono uppercase">Slicer Bulan:</span>
                <select
                  value={slicerMonthFilter}
                  onChange={(e) => setSlicerMonthFilter(e.target.value)}
                  className="bg-transparent font-bold text-gray-800 focus:outline-none cursor-pointer"
                >
                  <option value="All">Semua Bulan (12 Bulan)</option>
                  <option value="3">April</option>
                  <option value="4">Mei</option>
                  <option value="5">Juni</option>
                  <option value="6">Juli</option>
                  <option value="7">Agustus</option>
                  <option value="8">September</option>
                  <option value="9">Oktober</option>
                  <option value="10">November</option>
                  <option value="11">Desember</option>
                  <option value="0">Januari</option>
                  <option value="1">Februari</option>
                  <option value="2">Maret</option>
                </select>
              </div>

              {/* Slicer Toggle Spent Only */}
              <button
                onClick={() => setSlicerOnlyWithSpent(!slicerOnlyWithSpent)}
                className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all cursor-pointer ${
                  slicerOnlyWithSpent 
                    ? "bg-brand-red text-white border-brand-red shadow-2xs" 
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {slicerOnlyWithSpent ? "✓ Hanya Ada Realisasi (> Rp0)" : "+ Slicer Realisasi > Rp0"}
              </button>

              {/* View Selector Buttons */}
              <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/50 ml-auto lg:ml-0">
                <button
                  onClick={() => setMonthlyChartType("area")}
                  className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    monthlyChartType === "area" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Tampilan Grafik Area & Akumulasi YTD"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-brand-red" />
                  <span className="hidden sm:inline">Area & YTD</span>
                </button>
                <button
                  onClick={() => setMonthlyChartType("bar")}
                  className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    monthlyChartType === "bar" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Tampilan Grafik Batang Bulanan"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-brand-red" />
                  <span className="hidden sm:inline">Batang</span>
                </button>
                <button
                  onClick={() => setMonthlyChartType("table")}
                  className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    monthlyChartType === "table" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Tampilan Tabel Breakdown Bulanan"
                >
                  <TableIcon className="w-3.5 h-3.5 text-brand-red" />
                  <span className="hidden sm:inline">Tabel Detail</span>
                </button>
              </div>
            </div>
          </div>

          {/* Slicer Monthly Stat Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-gray-900 to-slate-800 p-3.5 rounded-xl text-white shadow-xs">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Realisasi (Slicer)</span>
              <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono">{formatRupiah(totalMonthlySpentSlice)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Bulan Tertinggi (Peak)</span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono truncate block" title={peakMonthData ? peakMonthData.fullName : "-"}>
                {peakMonthData ? `${peakMonthData.name} (${formatRupiah(peakMonthData.Pengeluaran)})` : "-"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Rata-rata / Bulan</span>
              <span className="text-xs sm:text-sm font-bold text-teal-300 font-mono">{formatRupiah(avgMonthlyExpense)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Transaksi Slicer</span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono">{totalMonthlyTxCount} Kuitansi</span>
            </div>
          </div>

          {/* Monthly Chart or Table Render */}
          {monthlyChartType === "table" ? (
            <div className="overflow-x-auto my-2 border border-gray-200/80 rounded-xl bg-white shadow-3xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-500 font-mono font-bold">
                    <th className="py-2.5 px-3">Bulan Anggaran</th>
                    <th className="py-2.5 px-3 text-right">Realisasi (Actual)</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Transaksi</th>
                    <th className="py-2.5 px-3 text-right">Akumulasi YTD</th>
                    <th className="py-2.5 px-3 text-right">Rata-rata / Kuitansi</th>
                    <th className="py-2.5 px-3 text-center">MoM Growth</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans text-gray-700">
                  {monthlyData.length > 0 ? (
                    monthlyData.map((m) => {
                      const isPeak = peakMonthData && peakMonthData.monthIndex === m.monthIndex && m.Pengeluaran > 0;
                      return (
                        <tr key={m.monthIndex} className={`hover:bg-gray-50/70 transition-colors ${isPeak ? "bg-red-50/30" : ""}`}>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 flex items-center space-x-1.5">
                            <span>{m.fullName}</span>
                            {isPeak && (
                              <span className="bg-red-100 text-brand-red text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                                PEAK
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-red">
                            {formatRupiah(m.Pengeluaran)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 font-mono">
                              {m.JumlahTransaksi} Kuitansi
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-teal-800 font-medium">
                            {formatRupiah(m.AkumulasiYTD)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-gray-500 text-[11px]">
                            {m.RataRata > 0 ? formatRupiah(m.RataRata) : "-"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {m.MoMGrowth !== 0 ? (
                              <span className={`inline-flex items-center text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md ${
                                m.MoMGrowth > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {m.MoMGrowth > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                {m.MoMGrowth}%
                              </span>
                            ) : (
                              <span className="text-gray-300 font-mono text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {m.JumlahTransaksi > 0 ? (
                              <button
                                onClick={() => setSelectedMonthDetail({ monthIndex: m.monthIndex, monthName: m.fullName })}
                                className="inline-flex items-center space-x-1 text-[10px] font-bold text-brand-red bg-red-50 hover:bg-brand-red hover:text-white px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Rincian</span>
                              </button>
                            ) : (
                              <span className="text-gray-300 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Tidak ada data bulanan yang memenuhi filter slicer saat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-72 w-full pt-1">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {monthlyChartType === "area" ? (
                    <ComposedChart data={monthlyData} margin={{ top: 25, right: 15, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMonthlyArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E60012" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#E60012" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="colorYTDLine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0D9488" stopOpacity={1} />
                          <stop offset="100%" stopColor="#14B8A6" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4B5563" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#0D9488" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <Tooltip content={<CustomMonthlyTooltip formatRupiah={formatRupiah} />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Area yAxisId="left" type="monotone" dataKey="Pengeluaran" name="Realisasi Bulanan (Rp)" fill="url(#colorMonthlyArea)" stroke="#E60012" strokeWidth={3} activeDot={{ r: 6 }}>
                        {showChartLabels && <LabelList dataKey="Pengeluaran" position="top" content={RenderCustomChartLabel} />}
                      </Area>
                      <Line yAxisId="right" type="monotone" dataKey="AkumulasiYTD" name="Akumulasi YTD (Rp)" stroke="#0D9488" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, fill: "#0D9488" }}>
                        {showChartLabels && <LabelList dataKey="AkumulasiYTD" position="top" content={RenderCustomChartLabel} />}
                      </Line>
                    </ComposedChart>
                  ) : (
                    <BarChart 
                      data={monthlyData} 
                      margin={{ top: 25, right: 10, left: -15, bottom: 0 }}
                      onClick={(e: any) => {
                        if (e && e.activePayload && e.activePayload.length) {
                          const data = e.activePayload[0].payload;
                          if (data.JumlahTransaksi > 0) {
                            setSelectedMonthDetail({ monthIndex: data.monthIndex, monthName: data.fullName });
                          }
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="colorMonthlyBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E60012" stopOpacity={1} />
                          <stop offset="100%" stopColor="#99000D" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4B5563" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <Tooltip content={<CustomMonthlyTooltip formatRupiah={formatRupiah} />} />
                      <Bar dataKey="Pengeluaran" name="Pengeluaran Bulanan (Klik Batang untuk Detail)" fill="url(#colorMonthlyBar)" radius={[6, 6, 0, 0]} barSize={22} className="cursor-pointer">
                        {showChartLabels && <LabelList dataKey="Pengeluaran" position="top" content={RenderCustomChartLabel} />}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 space-y-1">
                  <Info className="w-5 h-5 text-gray-300" />
                  <p>Tidak ada data realisasi bulanan yang cocok dengan filter slicer saat ini.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CHART 2 (ITEM 2): GRAFIK PLAN VS REALISASI ANGGARAN (BULANAN)           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-gray-800 font-display">Grafik Plan Budget vs Realisasi (Bulanan)</h3>
                  {deficitCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono">
                      {deficitCount} Bulan Over Plan
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Membandingkan rencana pengeluaran budget (Plan Budget) dengan pengeluaran realisasi per bulan</p>
              </div>

              {/* View Mode & Label Toggle Switcher */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setShowChartLabels(!showChartLabels)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-semibold border transition-all cursor-pointer flex items-center space-x-1 ${
                    showChartLabels 
                      ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs font-bold" 
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                  title="Tampilkan / Sembunyikan Label Angka Nominal pada Grafik"
                >
                  <span className="font-mono text-[10px] font-black">Rp</span>
                  <span>{showChartLabels ? "Angka: ON" : "Angka: OFF"}</span>
                </button>

                <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                  <button
                    onClick={() => setForecastViewMode("line")}
                    className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      forecastViewMode === "line" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                    title="Tampilan Tren Garis Fluktuasi Bulanan"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Tren Garis</span>
                  </button>
                  <button
                    onClick={() => setForecastViewMode("bar")}
                    className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      forecastViewMode === "bar" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                    title="Tampilan Batang Bersandingan"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Side-by-Side</span>
                  </button>
                  <button
                    onClick={() => setForecastViewMode("combi")}
                    className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      forecastViewMode === "combi" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                    title="Tampilan Kombo dengan Garis Utilisasi (%)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Combi %</span>
                  </button>
                  <button
                    onClick={() => setForecastViewMode("variance")}
                    className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      forecastViewMode === "variance" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                    title="Tampilan Selisih / Variansi Anggaran"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Variansi Sisa</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Top Stat Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Plan Budget</span>
                <span className="text-xs font-bold text-gray-900 font-mono">{formatRupiah(totalPlanChart)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Realisasi</span>
                <span className="text-xs font-bold text-brand-red font-mono">{formatRupiah(totalRealisasiChart)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Sisa Plan Budget</span>
                <span className={`text-xs font-bold font-mono ${totalRemainingChart < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {formatRupiah(totalRemainingChart)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Rata-Rata Utilisasi</span>
                <span className="text-xs font-bold text-blue-700 font-mono">{avgUtilizationChart.toFixed(1)}%</span>
              </div>
            </div>

            {/* Chart Render Canvas */}
            <div className="h-72 w-full pt-2">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {forecastViewMode === "line" ? (
                    <ComposedChart data={barChartData} margin={{ top: 28, right: 15, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPlanLine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1E293B" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#1E293B" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorActualLine" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E60012" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#E60012" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="shortCode" tick={{ fontSize: 11, fill: "#4B5563" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <Tooltip content={<CustomPlanVsActualTooltip formatRupiah={formatRupiah} />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Area type="monotone" dataKey="Plan" name="Rencana Pengeluaran (Plan Budget)" fill="url(#colorPlanLine)" stroke="#1E293B" strokeWidth={2.5} dot={{ r: 4, fill: "#1E293B" }}>
                        {showChartLabels && <LabelList dataKey="Plan" position="top" content={RenderCustomChartLabel} />}
                      </Area>
                      <Area type="monotone" dataKey="Realisasi" name="Realisasi Pengeluaran (Actual)" fill="url(#colorActualLine)" stroke="#E60012" strokeWidth={3} dot={{ r: 5, fill: "#E60012", strokeWidth: 2, stroke: "#ffffff" }}>
                        {showChartLabels && <LabelList dataKey="Realisasi" position="top" content={RenderCustomChartLabel} />}
                      </Area>
                    </ComposedChart>
                  ) : forecastViewMode === "bar" ? (
                    <BarChart data={barChartData} margin={{ top: 25, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1E293B" stopOpacity={1} />
                          <stop offset="100%" stopColor="#475569" stopOpacity={0.9} />
                        </linearGradient>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E60012" stopOpacity={1} />
                          <stop offset="100%" stopColor="#FF4D4D" stopOpacity={0.85} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="shortCode" tick={{ fontSize: 11, fill: "#4B5563" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <Tooltip content={<CustomPlanVsActualTooltip formatRupiah={formatRupiah} />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="Plan" name="Rencana Pengeluaran (Plan Budget)" fill="url(#colorPlan)" radius={[6, 6, 0, 0]} barSize={14}>
                        {showChartLabels && <LabelList dataKey="Plan" position="top" content={RenderCustomChartLabel} />}
                      </Bar>
                      <Bar dataKey="Realisasi" name="Realisasi Pengeluaran (Actual)" fill="url(#colorActual)" radius={[6, 6, 0, 0]} barSize={14}>
                        {showChartLabels && <LabelList dataKey="Realisasi" position="top" content={RenderCustomChartLabel} />}
                      </Bar>
                    </BarChart>
                  ) : forecastViewMode === "combi" ? (
                    <ComposedChart data={barChartData} margin={{ top: 25, right: 15, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActualBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E60012" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="shortCode" tick={{ fontSize: 11, fill: "#4B5563" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#2563EB" }} unit="%" domain={[0, 'auto']} />
                      <Tooltip content={<CustomPlanVsActualTooltip formatRupiah={formatRupiah} />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar yAxisId="left" dataKey="Realisasi" name="Realisasi Cost (Rp)" fill="url(#colorActualBar)" radius={[6, 6, 0, 0]} barSize={20}>
                        {showChartLabels && <LabelList dataKey="Realisasi" position="top" content={RenderCustomChartLabel} />}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="Utilization" name="Utilisasi (%)" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: "#2563EB" }}>
                        {showChartLabels && <LabelList dataKey="Utilization" position="top" formatter={(val: number) => val > 0 ? `${val.toFixed(1)}%` : ""} style={{ fontSize: "9px", fontWeight: "bold", fill: "#2563EB" }} />}
                      </Line>
                      <ReferenceLine yAxisId="right" y={100} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '100% Target', fill: '#EF4444', fontSize: 10, position: 'insideTopRight' }} />
                    </ComposedChart>
                  ) : (
                    <BarChart data={barChartData} margin={{ top: 25, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVariancePos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorVarianceNeg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                          <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="shortCode" tick={{ fontSize: 11, fill: "#4B5563" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickFormatter={(tick) => `${(tick / 1000000).toFixed(0)}M`} />
                      <Tooltip content={<CustomPlanVsActualTooltip formatRupiah={formatRupiah} />} />
                      <ReferenceLine y={0} stroke="#9CA3AF" />
                      <Bar dataKey="Remaining" name="Selisih / Sisa Plan Budget" radius={[6, 6, 0, 0]} barSize={22}>
                        {showChartLabels && <LabelList dataKey="Remaining" position="top" content={RenderCustomChartLabel} />}
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.Remaining >= 0 ? "url(#colorVariancePos)" : "url(#colorVarianceNeg)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 space-y-1">
                  <Info className="w-5 h-5 text-gray-300" />
                  <p>Tidak ada data anggaran aktif yang memenuhi kriteria filter.</p>
                </div>
              )}
            </div>

            {/* Month Badge Legend */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-500 overflow-x-auto gap-1">
              <span className="font-semibold text-gray-700 shrink-0">Bulan Anggaran:</span>
              {barChartData.map((m) => (
                <span key={m.shortCode} className="px-1.5 py-0.5 bg-gray-50 rounded border border-gray-200/60 font-mono text-[10px] hover:bg-gray-100 transition-all cursor-default" title={`${m.fullName}: Plan ${formatRupiah(m.Plan)} | Realisasi ${formatRupiah(m.Realisasi)}`}>
                  {m.shortCode}
                </span>
              ))}
            </div>
          </div>

          {/* Chart 3: Proporsi Realisasi vs Sisa Budget */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
            <div className="border-b border-gray-100 pb-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-800 font-display">Realisasi vs Sisa Budget</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Komparasi Realisasi Pengeluaran vs Sisa Plan Budget</p>
            </div>

            <div className="h-64 flex flex-col justify-center">
              {pieData.slices.length > 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2">
                  {/* Donut Chart with Center Text */}
                  <div className="w-full h-36 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.slices}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.slices.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any) => [
                            `${formatRupiah(Number(value))}`, 
                            name
                          ]}
                          contentStyle={{ background: "white", border: "1px solid #f0f0f0", borderRadius: "12px", fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Donut Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-base font-bold font-mono text-gray-900">{pieData.actualPct}%</span>
                      <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Terpakai</span>
                    </div>
                  </div>

                  {/* Breakdown Cards */}
                  <div className="w-full pt-1 space-y-1.5 border-t border-gray-100">
                    {/* Realisasi Card */}
                    <div className="flex items-center justify-between text-[11px] bg-red-50/50 p-2 rounded-xl border border-red-100">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-red shrink-0"></span>
                        <div>
                          <p className="font-bold text-gray-800 leading-tight">Realisasi Pengeluaran</p>
                          <p className="text-[10px] text-gray-500 font-mono">{pieData.actualPct}% dari Plan</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-brand-red">{formatRupiah(pieData.totalActual)}</span>
                    </div>

                    {/* Sisa Plan Card */}
                    <div className={`flex items-center justify-between text-[11px] p-2 rounded-xl border ${
                      pieData.isOver 
                        ? "bg-amber-50/60 border-amber-200 text-amber-900" 
                        : "bg-emerald-50/50 border-emerald-100 text-emerald-900"
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pieData.isOver ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                        <div>
                          <p className="font-bold leading-tight">{pieData.isOver ? "Over Budget / Defisit" : "Sisa Plan Budget"}</p>
                          <p className="text-[10px] opacity-75 font-mono">
                            {pieData.isOver ? `Melebihi Plan` : `${pieData.remainingPct}% Tersedia`}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold">
                        {pieData.isOver ? `+${formatRupiah(pieData.overAmount)}` : formatRupiah(pieData.totalRemaining)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  Belum ada data realisasi / plan budget
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABEL (ITEM 5): TABEL SISA PLAFON & PLAN BUDGET BELUM TEREALISASI        */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-gray-800 font-display">Tabel Sisa Plafon & Plan Budget Belum Terealisasi</h3>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border border-amber-200">
                  Slicer Sisa Plafon & Plan
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Pemantauan sisa plafon anggaran beserta komitmen rencana biaya (Plan Budget) yang belum terealisasi</p>
            </div>

            {/* Slicers and Search Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Slicer */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Kode / Deskripsi..."
                  value={plafonSearchTerm}
                  onChange={(e) => setPlafonSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-brand-red w-44"
                />
              </div>

              {/* Slicer Category Dropdown */}
              <div className="flex items-center space-x-1.5 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-200 text-xs">
                <span className="text-[10px] text-gray-500 font-medium font-mono uppercase">Kategori:</span>
                <select
                  value={plafonFilterCategory}
                  onChange={(e) => setPlafonFilterCategory(e.target.value)}
                  className="bg-transparent font-bold text-gray-800 focus:outline-none cursor-pointer max-w-[140px] truncate"
                >
                  <option value="All">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.CategoryID} value={c.CategoryName}>
                      {c.CategoryName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset Status Buttons Slicer */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60">
                <button
                  onClick={() => setPlafonFilterStatus("all")}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    plafonFilterStatus === "all" ? "bg-white text-gray-900 shadow-2xs" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setPlafonFilterStatus("outstanding")}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    plafonFilterStatus === "outstanding" ? "bg-amber-500 text-white shadow-2xs" : "text-amber-700 hover:bg-amber-50"
                  }`}
                  title="Plan Belum Terealisasi > Rp0"
                >
                  Plan Outstanding
                </button>
                <button
                  onClick={() => setPlafonFilterStatus("critical")}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    plafonFilterStatus === "critical" ? "bg-amber-600 text-white shadow-2xs" : "text-amber-700 hover:bg-amber-50"
                  }`}
                  title="Sisa Plafon < 20%"
                >
                  Sisa Kritis (&lt;20%)
                </button>
                <button
                  onClick={() => setPlafonFilterStatus("deficit")}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    plafonFilterStatus === "deficit" ? "bg-red-600 text-white shadow-2xs" : "text-red-700 hover:bg-red-50"
                  }`}
                  title="Sisa Plafon < Rp0"
                >
                  Over Limit
                </button>
              </div>
            </div>
          </div>

          {/* Slicer Dynamic Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 p-4 rounded-xl text-white shadow-xs">
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Plafon (Slicer)</span>
              <span className="text-xs sm:text-sm font-bold text-white font-mono">{formatRupiah(totalPlafonTable)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Realisasi Cost</span>
              <span className="text-xs sm:text-sm font-bold text-red-400 font-mono">{formatRupiah(totalRealisasiTable)}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Total Sisa Plafon</span>
              <span className={`text-xs sm:text-sm font-bold font-mono ${totalSisaPlafonTable < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatRupiah(totalSisaPlafonTable)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Plan Belum Terealisasi</span>
              <span className="text-xs sm:text-sm font-bold text-amber-300 font-mono">{formatRupiah(totalPlanBelumTerealisasiTable)}</span>
            </div>
          </div>

          {/* Table Render */}
          <div className="overflow-x-auto border border-gray-200/90 rounded-xl bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono font-bold">
                  <th className="py-3 px-3">Kode Budget</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Deskripsi Anggaran</th>
                  <th className="py-3 px-3 text-right">Plafon Budget (Rp)</th>
                  <th className="py-3 px-3 text-right">Realisasi Cost (Rp)</th>
                  <th className="py-3 px-3 text-right">Sisa Plafon (Rp)</th>
                  <th className="py-3 px-3 text-right">Plan Belum Terealisasi (Rp)</th>
                  <th className="py-3 px-3 text-center">Utilisasi / Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans text-gray-700">
                {sisaPlafonTableData.length > 0 ? (
                  sisaPlafonTableData.map((row) => (
                    <tr key={row.budgetId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-dark whitespace-nowrap">
                        {row.code}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-800 max-w-xs truncate" title={row.description}>
                        {row.description}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        {formatRupiah(row.plafonAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-brand-red whitespace-nowrap">
                        {formatRupiah(row.realisasiAmount)}
                      </td>
                      <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                        row.sisaPlafonAmount < 0 ? "text-red-600" : row.isCritical ? "text-amber-600" : "text-emerald-700"
                      }`}>
                        {formatRupiah(row.sisaPlafonAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        {row.planBelumTerealisasi > 0 ? (
                          <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200">
                            {formatRupiah(row.planBelumTerealisasi)}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                            row.isOver ? "bg-red-100 text-red-700" :
                            row.isCritical ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {row.utilizationPct}% ({row.isOver ? "Defisit" : row.isCritical ? "Kritis" : "Aman"})
                          </span>
                          <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${row.isOver ? "bg-red-600" : row.isCritical ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${Math.min(row.utilizationPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      Tidak ada data sisa plafon / plan budget yang cocok dengan kriteria filter slicer saat ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Bottom Section: Recent Transactions & Quick Nav */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-100 mb-4 gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 font-display">10 Transaksi Realisasi Terakhir</h3>
            <p className="text-xs text-gray-400">Daftar pencatatan pengeluaran aktual terbaru dari Legal Department</p>
          </div>
          <button 
            onClick={() => onNavigate("actuals")}
            className="flex items-center text-xs font-semibold text-brand-red hover:text-red-700 transition-colors self-start cursor-pointer"
          >
            <span>Kelola Transaksi</span>
            <ChevronRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50">
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Kode</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Deskripsi</th>
                <th className="py-2.5 px-3 text-right">Nominal</th>
                <th className="py-2.5 px-3 text-center">Bukti</th>
                <th className="py-2.5 px-3">Pencatat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actuals.length > 0 ? (
                actuals.slice(0, 10).map((act) => {
                  const bCode = budgets.find(b => b.BudgetID === act.BudgetID)?.BudgetCode || "N/A";
                  return (
                    <tr key={act.ActualID} className="hover:bg-gray-50/70 transition-colors duration-150">
                      <td className="py-3 px-3 font-mono text-gray-600 whitespace-nowrap">
                        {act.TransactionDate}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-brand-dark">
                        {bCode}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          {act.Category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs truncate" title={act.Description}>
                        {act.Description}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                        {formatRupiah(act.Amount)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {act.AttachmentName ? (
                          <button
                            onClick={() => setPreviewAttachment({
                              name: act.AttachmentName!,
                              data: act.AttachmentData!,
                              type: act.AttachmentType || "image/png"
                            })}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-brand-red bg-red-50 hover:bg-brand-red hover:text-white transition-all cursor-pointer"
                            title="Pratinjau Bukti"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[60px] truncate">{act.AttachmentName}</span>
                          </button>
                        ) : (
                          <span className="text-gray-300 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {resolveUserName(act.CreatedBy).split(" ")[0]}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Belum ada pengeluaran aktual yang dicatat dalam sistem.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Selected Month Detail Modal */}
      {selectedMonthDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center bg-gray-900 text-white px-6 py-4 border-b border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-red text-white rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display">Rincian Realisasi Pengeluaran: {selectedMonthDetail.monthName}</h3>
                  <p className="text-xs text-gray-300">Daftar kuitansi & transaksi aktual yang dibukukan pada bulan {selectedMonthDetail.monthName}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMonthDetail(null)}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(() => {
                const monthActualsList = actuals.filter(act => {
                  const parentBudget = budgets.find(b => b.BudgetID === act.BudgetID);
                  if (chartFilterYear !== "All" && parentBudget && parentBudget.Year.toString() !== chartFilterYear) {
                    return false;
                  }
                  if (chartFilterCategory !== "All" && act.Category !== chartFilterCategory) {
                    return false;
                  }
                  const d = new Date(act.TransactionDate);
                  return d.getMonth() === selectedMonthDetail.monthIndex;
                });

                const monthSum = monthActualsList.reduce((sum, act) => sum + act.Amount, 0);

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">Total Pengeluaran {selectedMonthDetail.monthName}</span>
                        <h4 className="text-xl font-bold font-mono text-brand-red">{formatRupiah(monthSum)}</h4>
                      </div>
                      <span className="px-3 py-1 bg-white font-mono text-xs font-bold text-gray-800 rounded-lg border border-red-200/80 self-start sm:self-auto">
                        {monthActualsList.length} Transaksi Terdaftar
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono font-bold">
                            <th className="py-3 px-3">Tanggal</th>
                            <th className="py-3 px-3">Kode Budget</th>
                            <th className="py-3 px-3">Kategori</th>
                            <th className="py-3 px-3">Keterangan</th>
                            <th className="py-3 px-3 text-right">Jumlah (Rp)</th>
                            <th className="py-3 px-3 text-center">Bukti</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans text-gray-700">
                          {monthActualsList.map((act) => {
                            const b = budgets.find(x => x.BudgetID === act.BudgetID);
                            return (
                              <tr key={act.ActualID} className="hover:bg-gray-50">
                                <td className="py-3 px-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                                  {act.TransactionDate}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-brand-dark whitespace-nowrap">
                                  {b ? b.BudgetCode : "-"}
                                </td>
                                <td className="py-3 px-3 font-semibold text-gray-700">
                                  {act.Category}
                                </td>
                                <td className="py-3 px-3 text-gray-600 max-w-[220px] truncate" title={act.Description}>
                                  {act.Description}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-brand-red whitespace-nowrap">
                                  {formatRupiah(act.Amount)}
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  {act.AttachmentData ? (
                                    <button
                                      onClick={() => setPreviewAttachment({
                                        name: act.AttachmentName!,
                                        data: act.AttachmentData!,
                                        type: act.AttachmentType || "image/png"
                                      })}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-brand-red bg-red-50 hover:bg-brand-red hover:text-white transition-all cursor-pointer"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span>Lihat Bukti</span>
                                    </button>
                                  ) : (
                                    <span className="text-gray-300 font-mono">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectedMonthDetail(null)}
                className="px-5 py-2 text-xs font-bold bg-gray-900 text-white rounded-xl hover:bg-black transition-colors cursor-pointer"
              >
                Tutup Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXECUTIVE SUMMARY & EMAIL DISPATCH MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-brand-dark via-gray-900 to-brand-dark text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-wider bg-red-950/60 px-2 py-0.5 rounded border border-red-800">
                      {getCompanyDisplayName(activeCompany)}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">Legal Department</span>
                  </div>
                  <h3 className="text-lg font-bold font-display tracking-tight text-white mt-0.5">
                    Executive Summary &amp; Trend Anggaran
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Sub-Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-1.5 bg-gray-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setEmailActiveTab("summary")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    emailActiveTab === "summary"
                      ? "bg-white text-brand-dark shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 text-brand-red" />
                  <span>Ringkasan &amp; Trend Chart</span>
                </button>
                <button
                  onClick={() => setEmailActiveTab("email")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    emailActiveTab === "email"
                      ? "bg-white text-brand-dark shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kirim Email</span>
                </button>
                <button
                  onClick={() => setEmailActiveTab("schedule")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                    emailActiveTab === "schedule"
                      ? "bg-white text-brand-dark shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Jadwal Otomatis</span>
                  {autoSchedule.enabled && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </button>
              </div>

              {/* Action Download & Print Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadSummaryCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  title="Download laporan summary versi CSV Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download CSV</span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="px-3 py-1.5 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Download Laporan Executive Summary versi PDF"
                >
                  {isGeneratingPDF ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Memproses PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {emailActiveTab === "summary" && (
                <div id="pdf-summary-report-content" className="space-y-6 p-2 bg-white rounded-2xl">
                  {/* Branding Report Header for PDF capture */}
                  <div className="pb-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <AjinomotoLogo variant="horizontal" height={34} />
                      <div className="hidden sm:block h-7 w-px bg-gray-200"></div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-widest block">{getCompanyDisplayUpper(activeCompany)} - LEGAL DEPARTMENT</span>
                        <h3 className="font-display font-bold text-gray-900 text-sm sm:text-base">EXECUTIVE SUMMARY &amp; TREND PERFORMANCE ANGGARAN</h3>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-gray-400 font-mono">
                      <span>Tanggal Laporan: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                    </div>
                  </div>
                  {/* Financial KPI Summary Cards Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] text-gray-500 font-mono uppercase block">Total Plafon Budget</span>
                      <span className="font-mono font-bold text-sm md:text-base text-gray-900">{formatRupiah(totalBudget)}</span>
                    </div>

                    <div className="bg-red-50/60 p-3.5 rounded-2xl border border-red-100">
                      <span className="text-[10px] text-brand-red font-mono uppercase block">Realisasi (Actual Cost)</span>
                      <span className="font-mono font-bold text-sm md:text-base text-brand-red">{formatRupiah(totalActual)}</span>
                    </div>

                    <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                      <span className="text-[10px] text-emerald-800 font-mono uppercase block">Sisa Plafon</span>
                      <span className="font-mono font-bold text-sm md:text-base text-emerald-700">{formatRupiah(remainingBudget)}</span>
                    </div>

                    <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-100">
                      <span className="text-[10px] text-blue-800 font-mono uppercase block">Tingkat Utilisasi</span>
                      <span className="font-mono font-bold text-sm md:text-base text-blue-900">{utilizationRate.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Trend Highlights Panel */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-brand-red" />
                        <h4 className="font-bold text-gray-900 font-display text-sm">Analisis Trend &amp; Pola Pengeluaran Bulanan</h4>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Tahun 2026</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Peak Month Card */}
                      <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-amber-800 uppercase flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                          <span>Peak Spending Month</span>
                        </span>
                        <p className="font-bold text-gray-900 text-sm">
                          {peakMonth ? peakMonth.fullName : "Belum Ada Data"}
                        </p>
                        <p className="font-mono font-bold text-brand-red text-xs">
                          {peakMonth ? formatRupiah(peakMonth.Pengeluaran) : "Rp 0"}
                        </p>
                        <p className="text-[10px] text-gray-500">Bulan pengeluaran terbesar dalam tahun berjalan.</p>
                      </div>

                      {/* Burn Rate Card */}
                      <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-blue-800 uppercase flex items-center gap-1">
                          <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Monthly Burn Rate</span>
                        </span>
                        <p className="font-bold text-gray-900 text-sm">Rata-rata Pengeluaran</p>
                        <p className="font-mono font-bold text-blue-900 text-xs">{formatRupiah(avgMonthlyBurn)} / bulan</p>
                        <p className="text-[10px] text-gray-500">Berdasarkan bulan aktif dengan realisasi transaksi.</p>
                      </div>

                      {/* Year End Forecast Card */}
                      <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                        <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Proyeksi Akhir Tahun</span>
                        </span>
                        <p className="font-bold text-gray-900 text-sm">Estimasi Total 12 Bulan</p>
                        <p className="font-mono font-bold text-emerald-800 text-xs">{formatRupiah(yearEndProjection)}</p>
                        <p className="text-[10px] text-gray-500">
                          {yearEndProjection > totalBudget ? "⚠️ Berpotensi melebihi total plafon!" : "✓ Dalam batas plafon aman"}
                        </p>
                      </div>

                    </div>

                    {/* Top Category Trend Info */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-mono uppercase block">Kategori Legal Dominan</span>
                        <span className="font-bold text-gray-800 text-xs">{topCategoryInfo ? topCategoryInfo.name : "-"}</span>
                      </div>
                      <span className="font-mono font-bold text-brand-red text-xs">
                        {topCategoryInfo ? formatRupiah(topCategoryInfo.amount) : "Rp 0"}
                      </span>
                    </div>

                    {/* Visual Trend Summary Chart */}
                    <div className="pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-brand-red" />
                          <span>Grafik Visual Trend Pengeluaran, Plan Budget &amp; Run-Rate Bulanan</span>
                        </span>
                        <div className="flex flex-wrap items-center gap-3 text-[10px]">
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-1.5 bg-brand-red rounded-full inline-block"></span>
                            <span className="text-gray-700 font-semibold">Trend Realisasi Bulanan</span>
                          </span>
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-1 bg-emerald-600 rounded-full inline-block"></span>
                            <span className="text-emerald-800 font-semibold">Trend Plan Budget</span>
                          </span>
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-1 bg-blue-600 rounded-full inline-block border-t border-dashed border-blue-600"></span>
                            <span className="text-gray-600 font-medium">Akumulasi YTD</span>
                          </span>
                          <span className="flex items-center space-x-1.5">
                            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block"></span>
                            <span className="text-gray-600 font-medium">Rata-rata Run-Rate</span>
                          </span>
                        </div>
                      </div>

                      <div className="h-64 w-full bg-slate-50/60 p-3 rounded-2xl border border-gray-200">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={monthlyDataList} margin={{ top: 20, right: 15, left: -15, bottom: 0 }}>
                            <defs>
                              <linearGradient id="summaryRealisasiGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E60012" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#E60012" stopOpacity={0.02} />
                              </linearGradient>
                              <linearGradient id="summaryYtdGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(val) => `${val / 1000000}M`} />
                            <Tooltip
                              formatter={(value: any, name: any) => [
                                formatRupiah(Number(value)),
                                name === "Pengeluaran" ? "Trend Realisasi" : name === "PlanBudget" ? "Plan Budget" : name
                              ]}
                              labelFormatter={(lbl) => `Bulan: ${lbl}`}
                              contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "11px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            {/* Trend Area & Curved Spline Line for Realisasi Bulanan */}
                            <Area
                              type="monotone"
                              dataKey="Pengeluaran"
                              stroke="#E60012"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#summaryRealisasiGradient)"
                              name="Pengeluaran"
                              dot={{ r: 4.5, fill: "#E60012", strokeWidth: 2, stroke: "#ffffff" }}
                              activeDot={{ r: 7, stroke: "#E60012", strokeWidth: 2.5, fill: "#ffffff" }}
                            >
                              {showChartLabels && <LabelList dataKey="Pengeluaran" position="top" content={RenderCustomChartLabel} />}
                            </Area>
                            {/* Trend Line for Plan Budget Bulanan */}
                            <Line
                              type="monotone"
                              dataKey="PlanBudget"
                              stroke="#10b981"
                              strokeWidth={2.5}
                              strokeDasharray="5 3"
                              dot={{ r: 3.5, fill: "#10b981", strokeWidth: 1.5, stroke: "#ffffff" }}
                              activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                              name="Plan Budget"
                            />
                            {/* Trend Line for Akumulasi YTD */}
                            <Line
                              type="monotone"
                              dataKey="AkumulasiYTD"
                              stroke="#2563eb"
                              strokeWidth={2.5}
                              strokeDasharray="4 4"
                              dot={{ r: 3, fill: "#2563eb", strokeWidth: 1.5, stroke: "#ffffff" }}
                              name="Akumulasi YTD"
                            />
                            <ReferenceLine
                              y={avgMonthlyBurn}
                              stroke="#f59e0b"
                              strokeDasharray="3 3"
                              label={{ value: `Avg: ${formatRupiah(avgMonthlyBurn)}`, fill: "#d97706", fontSize: 9, position: "insideTopRight" }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* Monthly Trend Table Breakdown */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-gray-800 font-display text-xs uppercase tracking-wider font-mono">
                      Breakdown Performance Trend Pengeluaran Bulanan
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 text-gray-600 font-mono font-bold border-b border-gray-200">
                            <th className="py-2.5 px-3">Bulan</th>
                            <th className="py-2.5 px-3 text-right">Realisasi (Rp)</th>
                            <th className="py-2.5 px-3 text-center">Transaksi</th>
                            <th className="py-2.5 px-3 text-right">Akumulasi YTD</th>
                            <th className="py-2.5 px-3 text-center">MoM Growth</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {monthlyDataList.map((m) => (
                            <tr key={m.fullName} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-bold text-gray-900">{m.fullName}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-red">{formatRupiah(m.Pengeluaran)}</td>
                              <td className="py-2.5 px-3 text-center font-mono">{m.JumlahTransaksi}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-gray-700">{formatRupiah(m.AkumulasiYTD)}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {m.MoMGrowth === 0 ? (
                                  <span className="text-gray-400">-</span>
                                ) : m.MoMGrowth > 0 ? (
                                  <span className="text-red-600">+{m.MoMGrowth}%</span>
                                ) : (
                                  <span className="text-emerald-600">{m.MoMGrowth}%</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Breakdown Realisasi per Kategori Legal Table */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-gray-800 font-display text-xs uppercase tracking-wider font-mono">
                      Breakdown Realisasi per Kategori Legal
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 text-gray-600 font-mono font-bold border-b border-gray-200">
                            <th className="py-2.5 px-3">Kategori Legal</th>
                            <th className="py-2.5 px-3 text-right">Target Plan (Rp)</th>
                            <th className="py-2.5 px-3 text-right">Realisasi Actual (Rp)</th>
                            <th className="py-2.5 px-3 text-right">Sisa Anggaran (Rp)</th>
                            <th className="py-2.5 px-3 text-center">Utilisasi (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {[...consolidatedCategories]
                            .sort((catA, catB) => {
                              const metricA = getCategoryMetrics(catA);
                              const metricB = getCategoryMetrics(catB);
                              return metricB.actual - metricA.actual || metricB.target - metricA.target;
                            })
                            .map((catName) => {
                              const { target: catTarget, actual: catActual, remaining: catRemaining, util: catUtil } = getCategoryMetrics(catName);
                              return (
                                <tr key={catName} className="hover:bg-gray-50/80">
                                  <td className="py-2.5 px-3 font-bold text-gray-900">{catName}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{formatRupiah(catTarget)}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-red">{formatRupiah(catActual)}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatRupiah(catRemaining)}</td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-800">
                                    {isNaN(catUtil) ? "0.0" : catUtil.toFixed(1)}%
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rincian Alokasi Plan Anggaran Utama */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-gray-800 font-display text-xs uppercase tracking-wider font-mono">
                      Rincian Alokasi Plan Anggaran Utama
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 text-gray-600 font-mono font-bold border-b border-gray-200">
                            <th className="py-2.5 px-3">Kode Plan</th>
                            <th className="py-2.5 px-3">Judul Program / Plan</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3 text-right">Target Plan (Rp)</th>
                            <th className="py-2.5 px-3 text-right">Realisasi (Rp)</th>
                            <th className="py-2.5 px-3 text-center">Utilisasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {[...plans]
                            .sort((a, b) => {
                              const actualA = actuals.filter((item) => item.PlanID === a.PlanID).reduce((s, item) => s + (item.Amount || 0), 0);
                              const actualB = actuals.filter((item) => item.PlanID === b.PlanID).reduce((s, item) => s + (item.Amount || 0), 0);
                              return actualB - actualA;
                            })
                            .map((p) => {
                            const pActual = actuals.filter((a) => a.PlanID === p.PlanID).reduce((s, a) => s + a.Amount, 0);
                            const util = p.PlannedAmount > 0 ? (pActual / p.PlannedAmount) * 100 : 0;
                            return (
                              <tr key={p.PlanID} className="hover:bg-gray-50/80">
                                <td className="py-2.5 px-3 font-mono font-bold text-gray-800">{p.PlanCode}</td>
                                <td className="py-2.5 px-3 font-medium text-gray-900">{p.Title}</td>
                                <td className="py-2.5 px-3 text-gray-600">{p.Category}</td>
                                <td className="py-2.5 px-3 text-right font-mono text-gray-700">{formatRupiah(p.PlannedAmount)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-red">{formatRupiah(pActual)}</td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                    util > 100 ? "bg-red-100 text-red-800" : util > 70 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                  }`}>
                                    {util.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rincian Transaksi Realisasi Pengeluaran Legal Terkini */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-gray-800 font-display text-xs uppercase tracking-wider font-mono">
                      Rincian Transaksi Realisasi Pengeluaran Legal Terkini
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 text-gray-600 font-mono font-bold border-b border-gray-200">
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3">Uraian / Deskripsi Pengeluaran</th>
                            <th className="py-2.5 px-3">No. Referensi / Invoice</th>
                            <th className="py-2.5 px-3">PIC</th>
                            <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-sans">
                          {[...actuals]
                            .sort((a, b) => (b.Amount || 0) - (a.Amount || 0))
                            .slice(0, 15)
                            .map((act) => (
                            <tr key={act.ActualID} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-mono text-gray-700 font-medium whitespace-nowrap">{act.TransactionDate}</td>
                              <td className="py-2.5 px-3 font-medium text-gray-800">{act.Category}</td>
                              <td className="py-2.5 px-3 text-gray-900">{act.Description}</td>
                              <td className="py-2.5 px-3 font-mono text-gray-600">{act.ReferenceNumber || "-"}</td>
                              <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">{act.CreatedBy || "-"}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-brand-red whitespace-nowrap">{formatRupiah(act.Amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Catatan Legal & Signoff Footer */}
                  <div className="pt-4 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between text-[11px] text-gray-500 space-y-2 md:space-y-0">
                    <div>
                      <p className="font-bold text-gray-800">{getCompanyDisplayUpper(activeCompany)} - LEGAL DEPARTMENT</p>
                      <p>Laporan ini merupakan dokumen resmi internal untuk pemantauan dan evaluasi kinerja anggaran.</p>
                    </div>
                    <div className="text-right font-mono text-[10px] text-gray-400">
                      <span>Verified System Output • Confidential</span>
                    </div>
                  </div>

                </div>
              )}

              {emailActiveTab === "email" && (
                /* TAB 2: EMAIL DISPATCH FORM WITH SAVED RECIPIENTS */
                <div className="space-y-5 max-w-2xl mx-auto py-2">
                  
                  {/* Notice Banner */}
                  <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-start space-x-3">
                    <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 space-y-1">
                      <p className="font-bold">Pengiriman Laporan Executive Summary via Email</p>
                      <p className="text-[11px] leading-relaxed text-blue-800">
                        Pilih alamat email penerima dari daftar tersimpan di bawah ini atau masukkan email baru. Sistem akan menyimpan alamat email tersebut agar tidak perlu diisi ulang di masa mendatang.
                      </p>
                    </div>
                  </div>

                  {/* Saved Recipients Chips Selector */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        <span>Daftar Penerima Email Terdaftar (1-Click Select):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddRecipientForm(!showAddRecipientForm)}
                        className="text-[11px] font-bold text-brand-red hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Penerima Baru</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {savedRecipients.map((rec) => {
                        const isSelected = emailRecipient.includes(rec.email);
                        return (
                          <div
                            key={rec.id}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer ${
                              isSelected
                                ? "bg-red-50 border-brand-red text-brand-red font-bold shadow-xs"
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
                            }`}
                            onClick={() => {
                              if (isSelected) {
                                // Remove email from comma-separated list
                                const emails = emailRecipient.split(",").map(e => e.trim()).filter(e => e !== rec.email);
                                setEmailRecipient(emails.join(", "));
                              } else {
                                // Append email
                                setEmailRecipient(prev => prev ? `${prev}, ${rec.email}` : rec.email);
                              }
                            }}
                          >
                            <span>{rec.name}</span>
                            <span className="text-[10px] opacity-75">({rec.email})</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-brand-red" />}
                            <button
                              type="button"
                              title="Hapus penerima ini"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecipient(rec.id, rec.name);
                              }}
                              className="text-gray-400 hover:text-red-600 ml-1 p-0.5 rounded hover:bg-gray-200 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inline Add Recipient Form */}
                    {showAddRecipientForm && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-gray-300 space-y-3 animate-fade-in">
                        <p className="text-xs font-bold text-gray-800">Simpan Email Penerima Baru Ke Sistem:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Nama / Jabatan (e.g. Direksi Legal)"
                            value={newRecipName}
                            onChange={(e) => setNewRecipName(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                          <input
                            type="email"
                            placeholder="Alamat Email (e.g. direksi@ajinomoto.co.id)"
                            value={newRecipEmail}
                            onChange={(e) => setNewRecipEmail(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Divisi / Departemen"
                            value={newRecipDept}
                            onChange={(e) => setNewRecipDept(e.target.value)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowAddRecipientForm(false)}
                            className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveNewRecipient}
                            className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                          >
                            Simpan Penerima
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Form Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-700">Tujuan Email (Bisa Lebih Dari Satu, Pisahkan Koma)</label>
                        {savedRecipients.length > 0 && (
                          <select
                            onChange={(e) => {
                              const selectedEmail = e.target.value;
                              if (selectedEmail) {
                                setEmailRecipient((prev) => {
                                  if (!prev) return selectedEmail;
                                  const list = prev.split(",").map((x) => x.trim());
                                  if (!list.includes(selectedEmail)) {
                                    return `${prev}, ${selectedEmail}`;
                                  }
                                  return prev;
                                });
                                e.target.value = "";
                              }
                            }}
                            defaultValue=""
                            className="text-[11px] font-bold text-brand-red bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-red-100 transition-colors"
                          >
                            <option value="" disabled>+ Pilih / Tambah Penerima dari Daftar...</option>
                            {savedRecipients.map((rec) => (
                              <option key={rec.id} value={rec.email}>
                                {rec.name} ({rec.email})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="contoh: direksi@ajinomoto.co.id, finance@ajinomoto.co.id"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium"
                      />
                      <div className="flex flex-col space-y-1 text-[11px] bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl mt-1">
                        <div className="flex items-center space-x-1.5 text-blue-800 font-bold">
                          <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Privasi Pengirim &amp; Penerima Aktif</span>
                        </div>
                        <p className="text-blue-700 leading-snug">
                          • <strong>Email Pengirim Disembunyikan:</strong> Dikirim atas nama <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">Legal Department Budget System</code>.
                        </p>
                        <p className="text-blue-700 leading-snug">
                          • <strong>Privasi BCC:</strong> Semua penerima dimasukkan ke dalam daftar BCC sehingga tidak dapat saling melihat alamat email satu sama lain.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700">Subjek Email</label>
                      <input
                        type="text"
                        required
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-2">
                          <label className="block text-xs font-bold text-gray-700">Format &amp; Isi Pesan Badan Email</label>
                          <button
                            type="button"
                            onClick={handleSaveEmailTemplate}
                            disabled={isSavingTemplate}
                            className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors shadow-xs"
                            title="Simpan format dan isi pesan ini ke database sebagai template default"
                          >
                            <Save className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{isSavingTemplate ? "Menyimpan..." : "Simpan Format Pesan"}</span>
                          </button>
                        </div>
                        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 shrink-0">Template:</span>
                          <button
                            type="button"
                            onClick={() => setEmailNotes(
                              `Dengan hormat,\n\nBersama email ini kami sampaikan Laporan Executive Summary & Performance Anggaran Legal Department ${getCompanyDisplayName(activeCompany)} untuk periode berjalan.\n\nRincian lengkap mengenai evaluasi plafon budget, posisi realisasi actual, sisa anggaran, serta analisis trend pengeluaran bulanan dapat Bapak/Ibu periksa pada dokumen PDF resmi yang terlampir di dalam email ini.\n\nDemikian laporan ini kami sampaikan. Apabila terdapat pertanyaan atau memerlukan koordinasi lebih lanjut, Bapak/Ibu dapat menghubungi Divisi Legal.\n\nAtas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\nHormat kami,\nLegal Department ${getCompanyDisplayName(activeCompany)}`
                            )}
                            className="text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors shrink-0"
                          >
                            Memo Standard
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailNotes(
                              `Yth. Bapak/Ibu Jajaran Direksi & Executive Management,\n\nBerikut disajikan dokumen evaluasi berkala dan performa penyerapan anggaran hukum (Legal Budget) ${getCompanyDisplayName(activeCompany)}.\n\nDokumen PDF terlampir menyajikan:\n- Evaluasi utilisasi plafon budget per kategori legal\n- Monitoring run-rate & peak spending month\n- Proyeksi efisiensi dan sisa alokasi anggaran divisi\n\nAtas perhatian dan arahan Bapak/Ibu, kami ucapkan terima kasih.\n\nHormat kami,\nDivisi Hukum & Kepatuhan Internal`
                            )}
                            className="text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors shrink-0"
                          >
                            Evaluasi Direksi
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailNotes(
                              `Rekan-rekan Tim Legal & Finance,\n\nTerlampir laporan pembaharuan status realisasi anggaran legal terbaru. Mohon dapat mempelajari lampiran PDF untuk penyesuaian rencana pengeluaran bulan berikutnya.\n\nApabila terdapat penyesuaian plan atau invoice aktual yang perlu diverifikasi, mohon segera koordinasikan.\n\nTerima kasih.`
                            )}
                            className="text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-md transition-colors shrink-0"
                          >
                            Notifikasi Tim
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={6}
                          required
                          value={emailNotes}
                          onChange={(e) => setEmailNotes(e.target.value)}
                          placeholder="Tuliskan isi atau pesan formal email di sini..."
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red font-medium leading-relaxed"
                        />
                      </div>

                      {/* Quick formatting toolbar */}
                      <div className="flex items-center space-x-1.5 pt-0.5">
                        <span className="text-[10px] text-gray-400 font-bold">Tambah Format:</span>
                        <button
                          type="button"
                          onClick={() => setEmailNotes(prev => prev + "\n- Poin Laporan: ")}
                          className="text-[10px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors font-mono"
                        >
                          + Poin List (- )
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailNotes(prev => prev + "\n\nCatatan Penting: ")}
                          className="text-[10px] text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors"
                        >
                          + Catatan
                        </button>
                      </div>
                    </div>

                    {/* Preview summary data & attachment box */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                        <p className="text-[10px] font-mono font-bold text-gray-500 uppercase">Detail Pengirim &amp; Lampiran File</p>
                        <span className="text-[10px] font-bold text-red-700 bg-red-100/80 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 border border-red-200">
                          <Paperclip className="w-3 h-3 text-red-600 shrink-0" />
                          <span>Lampiran PDF: Executive_Summary_Report.pdf</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                        <div>
                          <span className="text-gray-500">Pengirim System:</span>{" "}
                          <span className="font-bold text-gray-900">Legal Department Budget System</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Privasi Penerima:</span>{" "}
                          <span className="font-bold text-blue-700">Mode BCC (Tersembunyi)</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total Plafon Budget:</span>{" "}
                          <span className="font-mono font-bold text-gray-900">{formatRupiah(totalBudget)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Isi Email:</span>{" "}
                          <span className="font-bold text-emerald-700">Terformat Rapih + PDF Terlampir</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSendEmailSummary}
                        disabled={isSendingEmail}
                        className="w-full py-3 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingEmail ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Mengirim Email...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Kirim Executive Summary via Email</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {emailActiveTab === "schedule" && (
                /* TAB 3: AUTOMATED SUMMARY EMAIL SCHEDULE */
                <div className="space-y-5 max-w-2xl mx-auto py-2">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-900 space-y-1">
                      <p className="font-bold">Pengaturan Jadwal Pengiriman Email Otomatis</p>
                      <p className="text-[11px] leading-relaxed text-purple-800">
                        Atur jadwal otomatis agar sistem mengirimkan Executive Summary &amp; Trend Analysis ke jajaran direksi/management secara berkala tanpa perlu pengiriman manual.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
                    
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <span className="font-bold text-gray-900 text-xs block">Status Pengiriman Otomatis</span>
                        <span className="text-[11px] text-gray-500">
                          {autoSchedule.enabled ? "Pengiriman otomatis saat ini [AKTIF]" : "Pengiriman otomatis [NONAKTIF]"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                          autoSchedule.enabled ? "bg-emerald-600 justify-end" : "bg-gray-300 justify-start"
                        }`}
                      >
                        <span className="w-4 h-4 bg-white rounded-full shadow-md"></span>
                      </button>
                    </div>

                    {/* Frequency & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700">Frekuensi Pengiriman</label>
                        <select
                          value={autoSchedule.frequency}
                          onChange={(e) => setAutoSchedule(prev => ({ ...prev, frequency: e.target.value as any }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                        >
                          <option value="Daily">Harian (Setiap Hari Kerja)</option>
                          <option value="Weekly">Mingguan (Setiap Hari Senin)</option>
                          <option value="Monthly">Bulanan (Setiap Tanggal 1)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-700">Jam Pengiriman (WIB)</label>
                        <select
                          value={autoSchedule.sendTime}
                          onChange={(e) => setAutoSchedule(prev => ({ ...prev, sendTime: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium"
                        >
                          <option value="07:00">07:00 WIB (Awal Pagi)</option>
                          <option value="08:00">08:00 WIB (Awal Jam Kerja)</option>
                          <option value="09:00">09:00 WIB</option>
                          <option value="12:00">12:00 WIB (Siang)</option>
                          <option value="17:00">17:00 WIB (Sore Hari)</option>
                        </select>
                      </div>
                    </div>

                    {/* Recipients Selection */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700">Pilih Penerima Otomatis Terdaftar</label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-200">
                        {savedRecipients.map((r) => {
                          const isChecked = autoSchedule.recipients.includes(r.email);
                          return (
                            <label key={r.id} className="flex items-center space-x-2 text-xs text-gray-800 cursor-pointer p-1 hover:bg-gray-100 rounded-lg">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAutoSchedule(prev => ({ ...prev, recipients: [...prev.recipients, r.email] }));
                                  } else {
                                    setAutoSchedule(prev => ({ ...prev, recipients: prev.recipients.filter(x => x !== r.email) }));
                                  }
                                }}
                                className="rounded text-brand-red focus:ring-brand-red"
                              />
                              <span className="font-semibold">{r.name}</span>
                              <span className="text-[10px] text-gray-500">({r.email})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Auto Subject */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">Subjek Email Otomatis</label>
                      <input
                        type="text"
                        value={autoSchedule.subject}
                        onChange={(e) => setAutoSchedule(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                      />
                    </div>

                    {/* Schedule Next Execution Card */}
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-purple-700 uppercase block font-bold">Jadwal Eksekusi Berikutnya</span>
                        <span className="font-bold text-purple-900">
                          {autoSchedule.frequency === "Weekly" ? "Setiap Hari Senin, " + autoSchedule.sendTime + " WIB" : autoSchedule.frequency + ", " + autoSchedule.sendTime + " WIB"}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-200 text-purple-900 font-mono text-[10px] font-bold rounded-lg">
                        Auto-Cron Active
                      </span>
                    </div>

                    <button
                      onClick={handleSaveAutoSchedule}
                      disabled={isSavingSchedule}
                      className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingSchedule ? (
                        <span>Menyimpan Pengaturan...</span>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>Simpan Jadwal Pengiriman Otomatis</span>
                        </>
                      )}
                    </button>

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup Halaman Summary
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
