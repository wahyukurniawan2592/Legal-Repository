/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Database, 
  TrendingUp, 
  Activity, 
  FileText, 
  Settings, 
  Users, 
  LogOut, 
  User as UserIcon, 
  Menu, 
  X,
  Bell,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  FileSpreadsheet,
  Target,
  Building2,
  Sparkles,
  CheckCircle2
} from "lucide-react";

import { User, Category, Budget, PlanBudget, Actual, AuditLog, UserRole, CompanyName } from "./types";
import { AjinomotoLogo } from "./components/AjinomotoLogo";
import DashboardView from "./components/DashboardView";
import MasterBudgetView from "./components/MasterBudgetView";
import PlanBudgetView from "./components/PlanBudgetView";
import ActualCostView from "./components/ActualCostView";
import BudgetMonitoringView from "./components/BudgetMonitoringView";
import ReportView from "./components/ReportView";
import SettingView from "./components/SettingView";
import UserView from "./components/UserView";
import MasterDatabaseSheetView from "./components/MasterDatabaseSheetView";
import LandingPage from "./components/LandingPage";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState<"ALL" | CompanyName>("ALL");

  // Theme Customizer States
  const [appTheme, setAppTheme] = useState(() => {
    const saved = localStorage.getItem("legal_app_theme");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      primaryColor: "#E60012",
      fontSans: '"Inter", ui-sans-serif, system-ui, sans-serif',
      fontDisplay: '"Space Grotesk", sans-serif',
      themeName: "Ajinomoto Corporate (Default)"
    };
  });

  // Dynamic theme variables application
  useEffect(() => {
    document.documentElement.style.setProperty("--color-brand-red-dyn", appTheme.primaryColor);
    document.documentElement.style.setProperty("--font-sans-dyn", appTheme.fontSans);
    document.documentElement.style.setProperty("--font-display-dyn", appTheme.fontDisplay);
    localStorage.setItem("legal_app_theme", JSON.stringify(appTheme));
  }, [appTheme]);

  // Database States
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [plans, setPlans] = useState<PlanBudget[]>([]);
  const [actuals, setActuals] = useState<Actual[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filtered data based on activeCompany selection (PT Ajinomoto vs PT Ajinex vs ALL)
  const filteredBudgets = React.useMemo(() => {
    if (activeCompany === "ALL") return budgets;
    return budgets.filter(b => (b.Company || "PT Ajinomoto Indonesia") === activeCompany);
  }, [budgets, activeCompany]);

  const filteredPlans = React.useMemo(() => {
    if (activeCompany === "ALL") return plans;
    const activeBudgetIds = new Set(filteredBudgets.map(b => b.BudgetID));
    return plans.filter(p => activeBudgetIds.has(p.BudgetID) || (p.Company || "PT Ajinomoto Indonesia") === activeCompany);
  }, [plans, filteredBudgets, activeCompany]);

  const filteredActuals = React.useMemo(() => {
    if (activeCompany === "ALL") return actuals;
    const activeBudgetIds = new Set(filteredBudgets.map(b => b.BudgetID));
    return actuals.filter(a => activeBudgetIds.has(a.BudgetID) || (a.Company || "PT Ajinomoto Indonesia") === activeCompany);
  }, [actuals, filteredBudgets, activeCompany]);

  // Loading & UI States
  const [initialLoading, setInitialLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Toast helper
  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Check login and fetch database states on startup
  useEffect(() => {
    const stored = localStorage.getItem("current_legal_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u && (u.Name === "Siti Aminah" || u.Name === "Siti Aminah (Admin)" || u.Email === "admin@ajinomoto.co.id")) {
          u.Name = "Wahyu Waullilamri Kurniawan";
          localStorage.setItem("current_legal_user", JSON.stringify(u));
        }
        setCurrentUser(u);
      } catch (e) {
        localStorage.removeItem("current_legal_user");
      }
    }
    fetchAllData().finally(() => setInitialLoading(false));
  }, []);

  const fetchAllData = async () => {
    try {
      const [resCats, resBudgets, resPlans, resActuals, resLogs] = await Promise.all([
        fetch("/api/categories").then(r => r.json()),
        fetch("/api/budgets").then(r => r.json()),
        fetch("/api/plans").then(r => r.json()),
        fetch("/api/actuals").then(r => r.json()),
        fetch("/api/logs").then(r => r.json())
      ]);

      setCategories(resCats);
      setBudgets(resBudgets);
      setPlans(resPlans);
      setActuals(resActuals);
      setLogs(resLogs.reverse()); // Show newest logs first

      const resUsers = await fetch("/api/users").then(r => r.json());
      setUsers(resUsers);

      // Automatically sync and update currently logged in user info
      if (currentUser) {
        const freshUser = resUsers.find((u: User) => u.Email === currentUser.Email || u.UserID === currentUser.UserID);
        if (freshUser && (freshUser.Name !== currentUser.Name || freshUser.Role !== currentUser.Role || freshUser.Status !== currentUser.Status)) {
          const updatedUser = { ...currentUser, ...freshUser };
          setCurrentUser(updatedUser);
          localStorage.setItem("current_legal_user", JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      console.error("Gagal memuat data dari server:", err);
      addToast("Koneksi gagal! Silakan periksa status server.", "error");
    }
  };

  // Auth Action
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      addToast("Harap isi email dan kata sandi Anda.", "error");
      return;
    }

    setLoginLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("current_legal_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
        addToast(`Selamat datang kembali, ${data.user.Name}!`, "success");
      } else {
        addToast(data.error || "Gagal masuk. Silakan coba lagi.", "error");
      }
    } catch (err) {
      addToast("Gagal terhubung dengan server autentikasi.", "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("current_legal_user");
    setCurrentUser(null);
    setActiveTab("dashboard");
    addToast("Anda telah keluar dari sistem secara aman.", "info");
  };

  // Budget API Helpers
  const handleAddBudget = async (bData: Omit<Budget, "BudgetID" | "CreatedDate">) => {
    try {
      const bDataWithCompany = {
        ...bData,
        Company: (bData as any).Company || (activeCompany === "ALL" ? "PT Ajinomoto Indonesia" : activeCompany)
      };
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bDataWithCompany, userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Kode budget ${data.BudgetCode} berhasil disimpan!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal menyimpan budget.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal melakukan penambahan anggaran.", "error");
      return false;
    }
  };

  const handleEditBudget = async (id: string, bData: Partial<Budget>) => {
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bData, userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Perubahan anggaran ${data.BudgetCode} disimpan!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal mengupdate budget.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menyimpan perubahan anggaran.", "error");
      return false;
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const emailParam = encodeURIComponent(currentUser?.Email || "");
      const nameParam = encodeURIComponent(currentUser?.Name || "");
      const response = await fetch(`/api/budgets/${id}?userEmail=${emailParam}&userName=${nameParam}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": currentUser?.Email || "",
          "X-User-Name": currentUser?.Name || ""
        },
        body: JSON.stringify({ userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast("Mata anggaran berhasil dihapus.", "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal menghapus budget.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menghapus anggaran.", "error");
      return false;
    }
  };

  // Plan Budget API Helpers
  const handleAddPlan = async (pData: Partial<PlanBudget>) => {
    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pData, userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Plan Budget ${data.PlanCode} berhasil dibuat!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal membuat Plan Budget.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal memproses penambahan Plan Budget.", "error");
      return false;
    }
  };

  const handleEditPlan = async (id: string, pData: Partial<PlanBudget>) => {
    try {
      const response = await fetch(`/api/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pData, userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Plan Budget ${data.PlanCode} berhasil diperbarui!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal mengupdate Plan Budget.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menyimpan perubahan Plan Budget.", "error");
      return false;
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const response = await fetch(`/api/plans/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      if (response.ok) {
        addToast("Plan Budget berhasil dihapus.", "success");
        fetchAllData();
        return true;
      } else {
        const data = await response.json();
        addToast(data.error || "Gagal menghapus Plan Budget.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menghapus Plan Budget.", "error");
      return false;
    }
  };

  // Actual Cost API Helpers
  const handleAddActual = async (aData: Omit<Actual, "ActualID" | "CreatedDate" | "CreatedBy">) => {
    try {
      const response = await fetch("/api/actuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aData)
      });
      const data = await response.json();
      if (response.ok) {
        addToast("Pencatatan realisasi transaksi berhasil disimpan!", "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal menyimpan pengeluaran.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menyimpan pengeluaran.", "error");
      return false;
    }
  };

  const handleEditActual = async (id: string, aData: Partial<Actual>) => {
    try {
      const response = await fetch(`/api/actuals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aData)
      });
      const data = await response.json();
      if (response.ok) {
        addToast("Catatan realisasi transaksi berhasil diperbarui!", "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal memperbarui pengeluaran.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menyimpan perubahan pengeluaran.", "error");
      return false;
    }
  };

  const handleDeleteActual = async (id: string) => {
    try {
      const response = await fetch(`/api/actuals/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      if (response.ok) {
        addToast("Catatan pengeluaran transaksi dihapus.", "success");
        fetchAllData();
        return true;
      } else {
        const data = await response.json();
        addToast(data.error || "Gagal menghapus pengeluaran.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menghapus data pengeluaran.", "error");
      return false;
    }
  };

  // Categories API Helpers
  const handleAddCategory = async (name: string) => {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Kategori ${data.CategoryName} ditambahkan!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal menambah kategori.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menambahkan kategori.", "error");
      return false;
    }
  };

  const handleEditCategory = async (id: string, name: string, status: "Active" | "Inactive") => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status, userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Kategori ${data.CategoryName} diperbarui!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal memperbarui kategori.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal memperbarui kategori.", "error");
      return false;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const emailParam = encodeURIComponent(currentUser?.Email || "");
      const nameParam = encodeURIComponent(currentUser?.Name || "");
      const response = await fetch(`/api/categories/${id}?userEmail=${emailParam}&userName=${nameParam}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": currentUser?.Email || "",
          "X-User-Name": currentUser?.Name || ""
        },
        body: JSON.stringify({ userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast("Kategori budget berhasil dihapus.", "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal menghapus kategori.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal menghapus kategori.", "error");
      return false;
    }
  };

  // Reset database helper
  const handleResetDatabase = async () => {
    try {
      const response = await fetch("/api/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUser?.Email, userName: currentUser?.Name })
      });
      if (response.ok) {
        addToast("Database telah dibersihkan & dipulihkan ke kondisi bawaan!", "success");
        fetchAllData();
        setActiveTab("dashboard");
        return true;
      } else {
        addToast("Gagal mereset database.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal terhubung ke modul reset.", "error");
      return false;
    }
  };

  const handleImportDatabase = async (importedDB: any) => {
    try {
      const response = await fetch("/api/system/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: currentUser?.Email,
          userName: currentUser?.Name,
          importedDB
        })
      });
      if (response.ok) {
        addToast("Database berhasil diimpor dari file backup!", "success");
        fetchAllData();
        setActiveTab("dashboard");
        return true;
      } else {
        const data = await response.json();
        addToast(data.error || "Gagal mengimpor database.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal terhubung ke server untuk impor data.", "error");
      return false;
    }
  };

  // Users Management API Helpers
  const handleAddUser = async (uData: Omit<User, "UserID">) => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...uData, adminEmail: currentUser?.Email, adminName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Staff ${data.Name} berhasil terdaftar!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal mendaftarkan staff.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal mendaftarkan pengguna baru.", "error");
      return false;
    }
  };

  const handleEditUser = async (id: string, uData: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...uData, adminEmail: currentUser?.Email, adminName: currentUser?.Name })
      });
      const data = await response.json();
      if (response.ok) {
        addToast(`Otoritas masuk ${data.Name} diperbarui!`, "success");
        fetchAllData();
        return true;
      } else {
        addToast(data.error || "Gagal mengubah user.", "error");
        return false;
      }
    } catch (e) {
      addToast("Gagal mengubah data pengguna.", "error");
      return false;
    }
  };

  // Helper trigger to auto-fill login credentials
  const autoFillDemo = (email: string) => {
    setLoginEmail(email);
    const pwd = email.toLowerCase().includes("admin") ? "legaladmin" : "legalstaff";
    setLoginPassword(pwd);
    addToast("Kredensial demo diisi otomatis!", "info");
  };

  // Render Splash Loader
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-gray-400">Memuat Sistem Anggaran Legal Ajinomoto...</p>
      </div>
    );
  }

  // Render Login View
  if (!currentUser) {
    if (!showLogin) {
      return (
        <LandingPage 
          budgets={budgets}
          actuals={actuals}
          onGetStarted={() => setShowLogin(true)} 
        />
      );
    }

    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        
        {/* Geometric clean grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:20px_20px] opacity-75 pointer-events-none"></div>

        {/* Dynamic color halo that matches selected theme color */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Floating Custom Toasts */}
        <div className="fixed top-5 right-5 z-50 space-y-2 max-w-sm w-full pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`p-3.5 rounded-xl border shadow-lg text-xs font-semibold flex items-start space-x-2.5 pointer-events-auto animate-fade-in ${
                t.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
                t.type === "error" ? "bg-red-50 text-red-800 border-red-100" :
                "bg-blue-50 text-blue-800 border-blue-100"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.message}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-4xl bg-white rounded-[32px] border border-gray-100 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10 animate-fade-in">
          
          {/* Left Column: Visual Executive Showcase & Dual Entity Info */}
          <div className="md:col-span-5 bg-gradient-to-br from-gray-950 via-gray-900 to-brand-red text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-20%] w-60 h-60 bg-brand-red/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="space-y-6 relative z-10">
              {/* Ajinomoto Corporate Logo in White */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 inline-flex flex-col items-center">
                <AjinomotoLogo variant="full" theme="white" height={44} />
              </div>

              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-white/15">
                <Building2 className="w-3.5 h-3.5 text-red-300" />
                <span>Dual-Company Portal</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-black font-display tracking-tight leading-snug">
                  PT AJINOMOTO INDONESIA &amp; <br />PT AJINEX INTERNATIONAL
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed font-normal">
                  Satu akun terintegrasi untuk mengelola dan mengontrol anggaran Departemen Hukum &amp; Kepatuhan kedua entitas perusahaan secara real-time.
                </p>
              </div>

              {/* Key Highlights */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>PT Ajinomoto Indonesia</strong> — Mojokerto Factory</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>PT Ajinex International</strong> — Mojokerto Factory</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Login Form */}
          <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between space-y-6 bg-white">
            
            {/* Top Bar: Back button & Official Brand badge */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowLogin(false)}
                className="group text-[11px] font-mono font-semibold text-gray-500 hover:text-brand-red flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <span>← Kembali ke Beranda</span>
              </button>

              <AjinomotoLogo variant="compact" height={22} />
            </div>

            {/* Form & Headline */}
            <div className="space-y-6 my-auto">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold font-display text-gray-900 tracking-tight">Masuk ke Sistem Budget</h2>
                </div>
                <p className="text-xs text-gray-500 font-sans">
                  Silakan masuk menggunakan email resmi korporat terdaftar Anda.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Alamat Email Terdaftar</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      placeholder="Alamat email terdaftar"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full text-xs pl-10 pr-3 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 text-gray-800 font-medium transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Kata Sandi</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full text-xs pl-10 pr-10 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/10 text-gray-800 font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-brand-red text-white py-3.5 rounded-2xl font-bold text-xs hover:bg-opacity-90 active:scale-95 transition-all shadow-lg hover:shadow-brand-red/25 flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {loginLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Masuk Ke Dashboard</span>
                  )}
                </button>
              </form>
            </div>

            {/* Secure Login Footer Note */}
            <div className="border-t border-gray-100 pt-4 text-center">
              <p className="text-[10px] text-gray-400 font-mono">
                Sistem Otentikasi Terenkripsi • PT AJINOMOTO INDONESIA &amp; PT AJINEX INTERNATIONAL
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex font-sans text-gray-800">
      
      {/* Floating Custom Toasts (In-App) */}
      <div className="fixed top-5 right-5 z-[100] space-y-2 max-w-sm w-full pointer-events-none no-print">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`p-3.5 rounded-xl border shadow-lg text-xs font-semibold flex items-start space-x-2.5 pointer-events-auto animate-fade-in ${
              t.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-100" :
              t.type === "error" ? "bg-red-50 text-red-800 border-red-100" :
              "bg-blue-50 text-blue-800 border-blue-100"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* SIDEBAR NAVIGATION - DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-brand-dark text-white shrink-0 no-print">
        {/* Header */}
        <div className="p-5 border-b border-white/10 space-y-3 bg-black/20">
          <div className="flex items-center justify-between">
            <AjinomotoLogo variant="horizontal" theme="white" height={32} />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[10px] text-gray-400 font-mono tracking-wider">LEGAL DEPARTMENT</span>
            <span className="text-[9px] bg-brand-red text-white px-2 py-0.5 rounded font-bold uppercase tracking-wider">FY 2026</span>
          </div>
        </div>

        {/* Menu list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "dashboard" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span>Dashboard Overview</span>
          </button>

          {currentUser.Role === UserRole.ADMIN && (
            <button
              onClick={() => setActiveTab("master-budget")}
              className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "master-budget" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Database className="w-4.5 h-4.5" />
              <span>Master Budget</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("plan-budget")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "plan-budget" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Target className="w-4.5 h-4.5 text-amber-400" />
            <span>Plan Budget (Rencana)</span>
          </button>

          <button
            onClick={() => setActiveTab("actual-cost")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "actual-cost" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4.5 h-4.5" />
            <span>Actual Cost (Realisasi)</span>
          </button>

          <button
            onClick={() => setActiveTab("budget-monitoring")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "budget-monitoring" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Activity className="w-4.5 h-4.5" />
            <span>Budget Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "report" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span>Laporan Keuangan</span>
          </button>

          <button
            onClick={() => setActiveTab("master-sheet")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "master-sheet" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-400" />
            <span>Master Database Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab("setting")}
            className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "setting" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            <span>Sistem Settings</span>
          </button>

          {currentUser.Role === UserRole.ADMIN && (
            <button
              onClick={() => setActiveTab("user")}
              className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "user" ? "bg-brand-red text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Manajemen Pengguna</span>
            </button>
          )}
        </nav>

        {/* User Profile Badge at bottom */}
        <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-50 text-brand-red font-bold flex items-center justify-center uppercase text-xs">
              {currentUser.Name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.Name}</p>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider capitalize">{currentUser.Role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-gray-400 hover:text-brand-red rounded-lg hover:bg-white/5 transition-colors"
            title="Log Out Securely"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER NAVIGATION */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden no-print">
          <div className="fixed inset-0 bg-brand-dark/50 backdrop-blur-xs" onClick={() => setIsSidebarOpen(false)}></div>
          <aside className="relative flex flex-col w-64 bg-brand-dark text-white h-full shadow-2xl z-10 animate-fade-in">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
              <AjinomotoLogo variant="horizontal" theme="white" height={28} />
              <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1.5">
              <button
                onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "dashboard" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-4.5 h-4.5" />
                <span>Dashboard Overview</span>
              </button>

              {currentUser.Role === UserRole.ADMIN && (
                <button
                  onClick={() => { setActiveTab("master-budget"); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "master-budget" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Database className="w-4.5 h-4.5" />
                  <span>Master Budget</span>
                </button>
              )}

              <button
                onClick={() => { setActiveTab("plan-budget"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "plan-budget" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Target className="w-4.5 h-4.5 text-amber-400" />
                <span>Plan Budget (Rencana)</span>
              </button>

              <button
                onClick={() => { setActiveTab("actual-cost"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "actual-cost" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <TrendingUp className="w-4.5 h-4.5" />
                <span>Actual Cost (Realisasi)</span>
              </button>

              <button
                onClick={() => { setActiveTab("budget-monitoring"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "budget-monitoring" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Activity className="w-4.5 h-4.5" />
                <span>Budget Monitoring</span>
              </button>

              <button
                onClick={() => { setActiveTab("report"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "report" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FileText className="w-4.5 h-4.5" />
                <span>Laporan Keuangan</span>
              </button>

              <button
                onClick={() => { setActiveTab("master-sheet"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "master-sheet" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-400" />
                <span>Master Database Sheet</span>
              </button>

              <button
                onClick={() => { setActiveTab("setting"); setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === "setting" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Settings className="w-4.5 h-4.5" />
                <span>Sistem Settings</span>
              </button>

              {currentUser.Role === UserRole.ADMIN && (
                <button
                  onClick={() => { setActiveTab("user"); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center space-x-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "user" ? "bg-brand-red text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Users className="w-4.5 h-4.5" />
                  <span>Manajemen Pengguna</span>
                </button>
              )}
            </nav>

            <div className="p-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-50 text-brand-red font-bold flex items-center justify-center uppercase text-xs">
                  {currentUser.Name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{currentUser.Name}</p>
                  <p className="text-[9px] text-gray-400 font-mono uppercase">{currentUser.Role}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-brand-red">
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN SCREEN WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar Header (Mobile Only / Standard Page Header Bar) */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-gray-500 hover:text-gray-800">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-xs tracking-tight text-brand-dark uppercase">Ajinomoto Legal Budget</span>
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red text-[10px] font-bold tracking-tight capitalize">
            {currentUser.Role} Mode
          </span>
        </header>

        {/* Core Frame Stage */}
        <main className="flex-1 p-5 md:p-8 overflow-y-auto print:p-0">
          {/* Enterprise Dual-Company Top Header & Entity Switcher */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-brand-red flex items-center justify-center shrink-0 border border-red-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-gray-900 font-display">Konteks Entitas Perusahaan</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-mono font-bold border border-emerald-200">1 Akun Login • 2 Entitas</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {activeCompany === "ALL" 
                    ? "Menampilkan data gabungan PT Ajinomoto Indonesia & PT Ajinex International"
                    : `Menampilkan data khusus untuk ${activeCompany}`}
                </p>
              </div>
            </div>

            <div className="flex bg-gray-100 p-1.5 rounded-xl text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveCompany("ALL")}
                className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeCompany === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
              >
                <span>🌐</span>
                <span>Gabungan (Semua)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCompany("PT Ajinomoto Indonesia")}
                className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeCompany === "PT Ajinomoto Indonesia" ? "bg-white text-brand-red shadow-xs font-bold" : "text-gray-500 hover:text-gray-900"}`}
              >
                <span>🔴</span>
                <span>PT Ajinomoto Indonesia</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCompany("PT Ajinex International")}
                className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${activeCompany === "PT Ajinex International" ? "bg-white text-brand-red shadow-xs font-bold" : "text-gray-500 hover:text-gray-900"}`}
              >
                <span>🔴</span>
                <span>PT Ajinex International</span>
              </button>
            </div>
          </div>

          {activeTab === "dashboard" && (
            <DashboardView
              budgets={filteredBudgets}
              plans={filteredPlans}
              actuals={filteredActuals}
              categories={categories}
              currentUser={currentUser}
              users={users}
              onNavigate={setActiveTab}
              addToast={addToast}
              activeCompany={activeCompany}
            />
          )}

          {activeTab === "master-budget" && currentUser.Role === UserRole.ADMIN && (
            <MasterBudgetView
              budgets={filteredBudgets}
              plans={filteredPlans}
              actuals={filteredActuals}
              categories={categories}
              currentUser={currentUser}
              onAddBudget={handleAddBudget}
              onEditBudget={handleEditBudget}
              onDeleteBudget={handleDeleteBudget}
              addToast={addToast}
              activeCompany={activeCompany}
            />
          )}

          {activeTab === "master-sheet" && (
            <MasterDatabaseSheetView
              budgets={filteredBudgets}
              plans={filteredPlans}
              actuals={filteredActuals}
              categories={categories}
              users={users}
              currentUser={currentUser}
              onRefreshData={fetchAllData}
              addToast={addToast}
              activeCompany={activeCompany}
            />
          )}

          {activeTab === "plan-budget" && (
            <PlanBudgetView
              budgets={filteredBudgets}
              plans={filteredPlans}
              actuals={filteredActuals}
              currentUser={currentUser}
              onAddPlan={handleAddPlan}
              onEditPlan={handleEditPlan}
              onDeletePlan={handleDeletePlan}
              addToast={addToast}
            />
          )}

          {activeTab === "actual-cost" && (
            <ActualCostView
              actuals={filteredActuals}
              budgets={filteredBudgets}
              plans={filteredPlans}
              categories={categories}
              currentUser={currentUser}
              onAddActual={handleAddActual}
              onEditActual={handleEditActual}
              onDeleteActual={handleDeleteActual}
              addToast={addToast}
            />
          )}

          {activeTab === "budget-monitoring" && (
            <BudgetMonitoringView
              budgets={filteredBudgets}
              actuals={filteredActuals}
              categories={categories}
              addToast={addToast}
              activeCompany={activeCompany}
            />
          )}

          {activeTab === "report" && (
            <ReportView
              budgets={filteredBudgets}
              plans={filteredPlans}
              actuals={filteredActuals}
              categories={categories}
              addToast={addToast}
              activeCompany={activeCompany}
            />
          )}

          {activeTab === "setting" && (
            <SettingView
              categories={categories}
              logs={logs}
              currentUser={currentUser}
              budgets={filteredBudgets}
              actuals={filteredActuals}
              appTheme={appTheme}
              onChangeTheme={setAppTheme}
              onAddCategory={handleAddCategory}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onResetDatabase={handleResetDatabase}
              onImportDatabase={handleImportDatabase}
              addToast={addToast}
            />
          )}

          {activeTab === "user" && (
            currentUser.Role === UserRole.ADMIN ? (
              <UserView
                users={users}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onEditUser={handleEditUser}
                addToast={addToast}
              />
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-sm text-center space-y-4 max-w-lg mx-auto my-12">
                <div className="w-12 h-12 bg-red-100 text-brand-red rounded-2xl flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900 font-display">Akses Ditolak (Restricted Access)</h3>
                  <p className="text-xs text-gray-500">
                    Halaman Manajemen Pengguna khusus dapat diakses oleh akun berkewenangan <strong>Administrator</strong>. Anda saat ini masuk sebagai <strong>{currentUser.Role}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="px-5 py-2.5 bg-brand-red text-white font-bold text-xs rounded-xl shadow-xs hover:bg-red-700 transition-colors cursor-pointer inline-flex items-center space-x-2"
                >
                  <span>Kembali ke Dashboard</span>
                </button>
              </div>
            )
          )}
        </main>
      </div>

    </div>
  );
}
