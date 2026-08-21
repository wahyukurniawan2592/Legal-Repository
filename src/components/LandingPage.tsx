import React, { useState } from "react";
import { AjinomotoLogo } from "./AjinomotoLogo";
import { 
  Database, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  BarChart3,
  Building2,
  Menu,
  X,
  Lock,
  Target,
  FileText,
  TrendingUp,
  Cpu,
  CheckCircle2,
  Globe,
  Award,
  Layers,
  PieChart,
  Users,
  Check
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  budgets?: any[];
  actuals?: any[];
}

export default function LandingPage({ onGetStarted, budgets = [], actuals = [] }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"ALL" | "AJI" | "AJX">("ALL");

  // Filter budgets and actuals dynamically based on selected preview tab
  const filteredBudgets = budgets.filter(b => {
    if (previewTab === "AJI") return b.Company === "PT Ajinomoto Indonesia";
    if (previewTab === "AJX") return b.Company === "PT Ajinex International";
    return true; // ALL
  });

  const filteredActuals = actuals.filter(a => {
    if (previewTab === "AJI") return a.Company === "PT Ajinomoto Indonesia";
    if (previewTab === "AJX") return a.Company === "PT Ajinex International";
    return true; // ALL
  });

  const totalPlafon = filteredBudgets.reduce((sum, b) => sum + (Number(b.BudgetAmount) || 0), 0);
  const totalRealisasi = filteredActuals.reduce((sum, a) => sum + (Number(a.Amount) || 0), 0);
  const penyerapanPercent = totalPlafon > 0 ? ((totalRealisasi / totalPlafon) * 100).toFixed(1) : "0.0";

  // Compute category breakdowns dynamically
  const categoryTotals: Record<string, { plafon: number; actual: number }> = {};
  filteredBudgets.forEach(b => {
    const cat = b.Category || "Lainnya";
    if (!categoryTotals[cat]) categoryTotals[cat] = { plafon: 0, actual: 0 };
    categoryTotals[cat].plafon += Number(b.BudgetAmount) || 0;
  });

  filteredActuals.forEach(a => {
    const cat = a.Category || "Lainnya";
    if (!categoryTotals[cat]) categoryTotals[cat] = { plafon: 0, actual: 0 };
    categoryTotals[cat].actual += Number(a.Amount) || 0;
  });

  const topCategories = Object.entries(categoryTotals)
    .map(([catName, stats]) => {
      const pct = stats.plafon > 0 ? (stats.actual / stats.plafon) * 100 : 0;
      return {
        name: catName,
        pct: pct.toFixed(1),
        plafon: stats.plafon,
        actual: stats.actual
      };
    })
    .sort((a, b) => b.plafon - a.plafon)
    .slice(0, 3);

  const formatRupiah = (val: number) => {
    return "Rp " + val.toLocaleString("id-ID");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-gray-800 selection:bg-brand-red selection:text-white overflow-x-hidden relative">
      
      {/* --- Sweet Ambient Background Decor --- */}
      {/* 1. Subtle Radial Grid Pattern */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(#e2e8f0 1.2px, transparent 1.2px)`,
          backgroundSize: '24px 24px'
        }}
      ></div>

      {/* 2. Soft Mesh Gradient Orbs */}
      <div className="fixed top-[-120px] left-[15%] w-[550px] h-[550px] bg-red-100/60 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-[20%] right-[-100px] w-[500px] h-[500px] bg-amber-100/50 rounded-full blur-[130px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-100px] left-[-50px] w-[600px] h-[600px] bg-rose-100/50 rounded-full blur-[150px] pointer-events-none z-0"></div>

      {/* 3. Subtle Wavy Brand Ribbon Lines in Background */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <path d="M-100,200 C300,50 600,450 1500,100 L1500,0 L-100,0 Z" fill="#D32F2F" />
        <path d="M-100,600 C400,800 800,400 1600,700 L1600,0 L-100,0 Z" fill="#E53935" />
      </svg>

      {/* Glassmorphic Navigation Header */}
      <header className="sticky top-0 z-50 h-24 sm:h-28 bg-white/95 backdrop-blur-md border-b border-gray-200/80 flex items-center justify-between px-5 sm:px-8 md:px-12 transition-all shadow-xs">
        <div className="flex items-center gap-5">
          <AjinomotoLogo variant="stacked" height={68} />
          <div className="hidden sm:block h-12 w-px bg-gray-200"></div>
          <span className="hidden sm:inline-block text-xs font-mono font-bold text-gray-600 uppercase tracking-wider">
            Legal Department Budget Portal
          </span>
        </div>

        {/* Desktop Quick Nav */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={onGetStarted}
            className="group flex items-center gap-2.5 px-6 py-2.5 bg-brand-red text-white hover:bg-red-700 font-bold text-xs rounded-xl transition-all shadow-md shadow-brand-red/20 cursor-pointer hover:shadow-lg active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Masuk ke Sistem</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-brand-red rounded-xl bg-gray-50 border border-gray-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-20 z-40 bg-white border-b border-gray-200 p-5 space-y-4 shadow-xl animate-fade-in">
          <button
            onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
            className="w-full py-3.5 bg-brand-red text-white font-bold text-xs rounded-xl shadow-md text-center flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Masuk ke Halaman Login</span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow z-10 relative">
        
        {/* Hero Section */}
        <section className="py-12 sm:py-16 md:py-20 px-5 sm:px-8 md:px-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 animate-fade-in">
            
            {/* Shimmering Badge */}
            <div className="inline-flex items-center gap-2.5 bg-white/90 backdrop-blur-xs px-4 py-2 rounded-full text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-gray-800 border border-red-200/90 shadow-xs">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-red"></span>
              </span>
              <span>Legal Department Budget Control Platform</span>
            </div>
            
            {/* Title */}
            <div className="space-y-4 sm:space-y-5">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-[1.12] font-display">
                Kelola Budget &amp; <br />
                <span className="text-brand-red relative inline-block mt-1.5">
                  Monitoring Budget Department
                  <span className="absolute left-0 bottom-1 w-full h-[8px] bg-brand-red/15 rounded-full"></span>
                </span>
              </h1>
              
              <p className="text-xs sm:text-base text-gray-600 leading-relaxed max-w-2xl font-sans font-normal">
                Platform enterprise pemantauan anggaran terintegrasi untuk <strong className="text-gray-900">PT Ajinomoto Indonesia</strong> dan <strong className="text-gray-900">PT Ajinex International</strong>. Cukup dengan satu akun, kelola perencanaan plafon budget dan realisasi pengeluaran akurat tanpa batas.
              </p>
            </div>

            {/* Core Features Preview Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-gray-200/90 shadow-sm hover:border-brand-red/30 transition-all flex items-center space-x-3">
                <div className="p-2.5 bg-red-50 text-brand-red rounded-xl shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Real-time Budget</p>
                  <p className="text-[10px] text-gray-500 font-mono">Plafon &amp; Actual</p>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-gray-200/90 shadow-sm hover:border-blue-300 transition-all flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Dual-Entity Control</p>
                  <p className="text-[10px] text-gray-500 font-mono">AJI &amp; AJX</p>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl border border-gray-200/90 shadow-sm hover:border-emerald-300 transition-all flex items-center space-x-3 col-span-2 sm:col-span-1">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">AI Advisory</p>
                  <p className="text-[10px] text-gray-500 font-mono">Analisis Gemini</p>
                </div>
              </div>
            </div>

            {/* Quick action button */}
            <div className="flex flex-wrap items-center gap-5 pt-3">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-4 bg-brand-red hover:bg-red-700 text-white font-bold text-xs rounded-2xl transition-all shadow-xl shadow-brand-red/25 active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 transform hover:-translate-y-0.5"
              >
                <Lock className="w-4 h-4" />
                <span>Masuk ke Dashboard Utama</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="hidden sm:flex items-center gap-6 text-gray-500 text-xs font-medium font-mono border-l border-gray-300/80 pl-6">
                <div>
                  <p className="text-gray-900 font-extrabold text-sm leading-none">1 Akun Login</p>
                  <p className="text-[9px] mt-1 text-gray-500 uppercase">Akses 2 Perusahaan</p>
                </div>
                <div>
                  <p className="text-gray-900 font-extrabold text-sm leading-none">Enterprise Level</p>
                  <p className="text-[9px] mt-1 text-gray-500 uppercase">Otorisasi Berlapis</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: New Dual-Company Executive Preview Card */}
          <div className="lg:col-span-5 relative animate-fade-in">
            {/* Ambient Backlight Glow for the preview card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-red/20 to-amber-500/20 rounded-3xl blur-xl opacity-75"></div>
            
            <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-3xl shadow-2xl p-6 space-y-5 relative z-10">
              
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-gray-400 font-mono font-bold uppercase tracking-wider">Ringkasan Kontrol Anggaran</p>
                  <h3 className="text-sm font-bold text-gray-900 font-display">Monitoring Anggaran Department 2026</h3>
                </div>
                <span className="px-2.5 py-1 bg-brand-red/10 text-brand-red text-[10px] font-bold rounded-lg border border-brand-red/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sistem Resmi Internal</span>
                </span>
              </div>

              {/* Entity Selector Tabs in Preview */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button 
                  onClick={() => setPreviewTab("ALL")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${previewTab === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
                >
                  🌐 Gabungan (2 Entitas)
                </button>
                <button 
                  onClick={() => setPreviewTab("AJI")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${previewTab === "AJI" ? "bg-white text-brand-red shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
                >
                  PT Ajinomoto Indonesia
                </button>
                <button 
                  onClick={() => setPreviewTab("AJX")}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${previewTab === "AJX" ? "bg-white text-brand-red shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
                >
                  PT Ajinex International
                </button>
              </div>

              {/* Dynamic Metrics based on tab */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-gray-200/80">
                <div>
                  <span className="text-[10px] text-gray-500 font-mono uppercase block font-semibold">Total Plafon Anggaran</span>
                  <span className="text-base font-black text-gray-900 font-mono">
                    {formatRupiah(totalPlafon)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-brand-red font-mono uppercase block font-semibold">Realisasi Aktual</span>
                  <span className="text-base font-black text-brand-red font-mono">
                    {formatRupiah(totalRealisasi)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-600">Persentase Penyerapan Anggaran</span>
                  <span className="text-brand-red font-bold font-mono">
                    {penyerapanPercent}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-brand-red rounded-full transition-all duration-500 shadow-xs" 
                    style={{ width: `${Math.min(100, Number(penyerapanPercent))}%` }}
                  ></div>
                </div>
              </div>

              {/* Categorical Breakdown Cards loaded directly from database */}
              <div className="space-y-2">
                {topCategories.length > 0 ? (
                  topCategories.map((cat, idx) => (
                    <div key={cat.name} className="bg-white p-3 rounded-xl border border-gray-200/90 flex items-center justify-between text-xs hover:border-gray-300 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? "bg-brand-red" : idx === 1 ? "bg-emerald-600" : "bg-blue-600"}`}></div>
                        <span className="font-semibold text-gray-800 truncate max-w-[180px]">{cat.name}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-700">{cat.pct}% Terpakai</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-xs text-gray-400 font-mono">Belum ada data anggaran</div>
                )}
              </div>

              {/* AI Executive Recommendation Preview */}
              <div className="bg-red-50/80 border border-red-100 p-3.5 rounded-xl flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-700 leading-relaxed">
                  <strong className="text-gray-900 font-bold">Insight AI:</strong> Penyerapan anggaran {previewTab === "ALL" ? "PT Ajinomoto Indonesia dan PT Ajinex International" : previewTab === "AJI" ? "PT Ajinomoto Indonesia" : "PT Ajinex International"} terpantau transparan dan sesuai database sistem.
                </p>
              </div>

              {/* Login Button Prominent */}
              <button
                onClick={onGetStarted}
                className="w-full py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <span>Silakan Masuk Dengan Akun Email Terdaftar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>
          </div>
        </section>

        {/* Corporate Showcase Section: PT Ajinomoto Indonesia & PT Ajinex International Pictures */}
        <section className="py-16 bg-white/80 backdrop-blur-xs border-t border-b border-gray-200/80 relative">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="px-3.5 py-1 bg-red-50 text-brand-red text-[11px] font-mono font-bold rounded-full uppercase tracking-wider border border-red-100/90 shadow-2xs">
                Enterprise Legal &amp; Department Showcase
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
                Dedikasi Monitoring &amp; Controlling Penggunaan Budget Department
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Merupakan Budget Control Management System untuk mempermudah Departemen dalam mengelola Budget dan pemantauan realisasi pengeluaran PT Ajinomoto Indonesia &amp; PT Ajinex International secara akurat dan efisien.
              </p>
            </div>

            {/* Photo Grid with high-res Unsplash corporate & plant images */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: PT Ajinomoto Indonesia Headquarters / Plant */}
              <div className="group rounded-3xl overflow-hidden border border-gray-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80" 
                    alt="PT Ajinomoto Indonesia Corporate Headquarters" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                  <span className="absolute bottom-3 left-4 text-white font-bold text-sm tracking-wide">
                    PT Ajinomoto Indonesia
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-wider">
                    PT Ajinomoto Indonesia — Mojokerto Factory
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">
                    Monitoring Anggaran Operasional &amp; Legal Pabrik
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Pemantauan alokasi dan realisasi pengeluaran budget untuk pengurusan perizinan operasional dan lisensi resmi pabrik secara terstruktur.
                  </p>
                </div>
              </div>

              {/* Card 2: PT Ajinex International Trade & Export */}
              <div className="group rounded-3xl overflow-hidden border border-gray-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80" 
                    alt="PT Ajinex International Trade Logistics" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                  <span className="absolute bottom-3 left-4 text-white font-bold text-sm tracking-wide">
                    PT Ajinex International
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-wider">
                    PT Ajinex International — Mojokerto Factory
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">
                    Controlling Anggaran Operasional &amp; Realisasi Budget
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Pengawasan realisasi dan efisiensi budget untuk sertifikasi operasional, perizinan resmi, serta operasional PT Ajinex International.
                  </p>
                </div>
              </div>

              {/* Card 3: Umami Science & Governance */}
              <div className="group rounded-3xl overflow-hidden border border-gray-200/90 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80" 
                    alt="Ajinomoto Science & Governance" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>
                  <span className="absolute bottom-3 left-4 text-white font-bold text-sm tracking-wide">
                    Budget Control &amp; Monitoring Excellence
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-wider">
                    Analisis &amp; Laporan Anggaran
                  </span>
                  <h3 className="text-sm font-bold text-gray-900">
                    Evaluasi Run-Rate &amp; Efisiensi Budget Department
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Sistem berfokus pada monitoring efisiensi penyerapan anggaran per kategori, analisis variance budget vs actual, serta otomatisasi laporan eksekutif bulanan.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 space-y-12">
            
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="px-3 py-1 bg-red-50 text-brand-red text-[10px] font-mono font-bold rounded-full uppercase tracking-wider border border-red-100">
                Fitur Unggulan Aplikasi
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight font-display">
                Pengelolaan Anggaran Department Berbasis Enterprise
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-2xl border border-gray-200/90 bg-white shadow-xs hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-100/80 text-brand-red flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 font-display">Satu Akun, Dua Perusahaan</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Kemudahan beralih tampilan dan kontrol anggaran antara PT Ajinomoto Indonesia dan PT Ajinex International dalam satu akun login secara instan dan aman.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-gray-200/90 bg-white shadow-xs hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 font-display">Monitoring Plafon &amp; Realisasi</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Perbandingan komprehensif antara alokasi rencana anggaran per kategori dengan pengeluaran aktual beserta indikator penyerapan real-time.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-gray-200/90 bg-white shadow-xs hover:shadow-md transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 font-display">Ekspor PDF &amp; Email Executive</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Laporan Executive Summary interaktif yang dapat diunduh sebagai file PDF resmi atau dikirim secara otomatis via email ke jajaran manajemen.
                </p>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-12 bg-gray-950 text-gray-400 px-5 sm:px-8 md:px-12 text-center text-xs border-t border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col items-center space-y-4">
          <AjinomotoLogo variant="stacked" theme="white" height={74} />
          <div className="space-y-1">
            <p className="font-semibold text-gray-200">PT AJINOMOTO INDONESIA &amp; PT AJINEX INTERNATIONAL • Legal &amp; Compliance Department</p>
            <p className="text-gray-500 text-[11px]">Sistem Pengelolaan Budget Department © 2026 • Mojokerto Factory</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

