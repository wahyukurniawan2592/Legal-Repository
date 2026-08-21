/**
 * Google Sheets API Service & Excel Export Helper
 * Multi-Sheet Excel Export by Category and Column Breakdown
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from "xlsx";
import { Budget, PlanBudget, Actual, Category, User } from "../types";

export interface GoogleSheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// Helper to format Rupiah
export const formatRupiahVal = (num: number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
};

// Sanitize sheet title for Excel (Max 31 chars, no invalid chars : \ / ? * [ ])
const sanitizeSheetName = (name: string): string => {
  let cleaned = name.replace(/[:\\/?*\[\]]/g, "_").trim();
  if (cleaned.length > 30) {
    cleaned = cleaned.substring(0, 30);
  }
  return cleaned || "Sheet";
};

// 1. Build Multi-Sheet Data Structured By Category & Columns
export function prepareCategoryMultiSheetTables(dbData: {
  budgets: Budget[];
  plans: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  users: User[];
}) {
  const { budgets, plans, actuals, categories, users } = dbData;

  // Collect all unique categories from categories master AND existing records
  const categoryNamesSet = new Set<string>();
  categories.forEach(c => categoryNamesSet.add(c.CategoryName));
  budgets.forEach(b => categoryNamesSet.add(b.Category));
  plans.forEach(p => categoryNamesSet.add(p.Category));
  actuals.forEach(a => categoryNamesSet.add(a.Category));

  if (categoryNamesSet.size === 0) {
    categoryNamesSet.add("Promosi & Marketing");
    categoryNamesSet.add("Operasional & Administrasi");
    categoryNamesSet.add("Investasi & Peralatan");
  }

  const categoryNames = Array.from(categoryNamesSet);

  // TAB 1: Summary By Category (Ringkasan Per Kategori)
  const summaryHeader = [
    "No",
    "Nama Kategori",
    "Total Plafon Budget (Rp)",
    "Total Plan Rencana (Rp)",
    "Total Realisasi Cost (Rp)",
    "Sisa Plafon (Rp)",
    "Penyerapan (%)",
    "Total Records"
  ];
  const summaryRows: any[][] = [summaryHeader];

  categoryNames.forEach((catName, idx) => {
    const catBudgets = budgets.filter(b => b.Category === catName);
    const catPlans = plans.filter(p => p.Category === catName);
    const catActuals = actuals.filter(a => a.Category === catName);

    const totalBudget = catBudgets.reduce((acc, curr) => acc + curr.BudgetAmount, 0);
    const totalPlan = catPlans.reduce((acc, curr) => acc + curr.PlannedAmount, 0);
    const totalActual = catActuals.reduce((acc, curr) => acc + curr.Amount, 0);
    const sisaPlafon = totalBudget - totalActual;
    const absPct = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0;
    const totalCount = catBudgets.length + catPlans.length + catActuals.length;

    summaryRows.push([
      idx + 1,
      catName,
      totalBudget,
      totalPlan,
      totalActual,
      sisaPlafon,
      `${absPct}%`,
      totalCount
    ]);
  });

  // CATEGORY INDIVIDUAL SHEETS (One Sheet Per Category)
  const categorySheetsMap: Record<string, any[][]> = {};

  categoryNames.forEach(catName => {
    const catHeader = [
      "Tipe Entitas",
      "Kode ID / Ref",
      "Kode Induk",
      "Kategori",
      "Deskripsi / Nama Items",
      "Plafon Budget (Rp)",
      "Rencana Budget (Rp)",
      "Realisasi Cost (Rp)",
      "Sisa Plafon (Rp)",
      "Tanggal / Periode",
      "PIC / User",
      "Status"
    ];

    const rows: any[][] = [catHeader];

    const catBudgets = budgets.filter(b => b.Category === catName);
    const catPlans = plans.filter(p => p.Category === catName);
    const catActuals = actuals.filter(a => a.Category === catName);

    // Add Budgets
    catBudgets.forEach(b => {
      const bActuals = actuals.filter(a => a.BudgetID === b.BudgetID);
      const bActualTotal = bActuals.reduce((acc, c) => acc + c.Amount, 0);
      const bSisa = b.BudgetAmount - bActualTotal;

      rows.push([
        "BUDGET",
        b.BudgetCode,
        "-",
        b.Category,
        b.Description || "-",
        b.BudgetAmount,
        0,
        0,
        bSisa,
        `${b.StartDate} s/d ${b.EndDate}`,
        b.PIC,
        b.Status
      ]);
    });

    // Add Plans
    catPlans.forEach(p => {
      const parentB = budgets.find(b => b.BudgetID === p.BudgetID);
      rows.push([
        "PLAN",
        p.PlanCode,
        parentB ? parentB.BudgetCode : "-",
        p.Category,
        p.Title,
        0,
        p.PlannedAmount,
        0,
        0,
        `${p.StartDate} s/d ${p.EndDate}`,
        p.PIC,
        p.Status
      ]);
    });

    // Add Actuals
    catActuals.forEach(a => {
      const parentP = plans.find(p => p.PlanID === a.PlanID);
      const parentB = budgets.find(b => b.BudgetID === a.BudgetID);
      const parentCode = parentP ? parentP.PlanCode : (parentB ? parentB.BudgetCode : "-");

      rows.push([
        "ACTUAL",
        a.ReferenceNumber || a.ActualID,
        parentCode,
        a.Category,
        a.Description || "-",
        0,
        0,
        a.Amount,
        0,
        a.TransactionDate,
        a.CreatedBy || "-",
        "Completed"
      ]);
    });

    categorySheetsMap[catName] = rows;
  });

  // ALL MASTER DATABASE TAB
  const allMasterHeader = [
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
  const allMasterRows: any[][] = [allMasterHeader];

  budgets.forEach(b => {
    allMasterRows.push(["BUDGET", b.BudgetCode, "-", b.Category, b.Description || "-", b.BudgetAmount, `${b.StartDate} s/d ${b.EndDate}`, b.PIC, b.Status]);
  });
  plans.forEach(p => {
    const parent = budgets.find(b => b.BudgetID === p.BudgetID);
    allMasterRows.push(["PLAN", p.PlanCode, parent ? parent.BudgetCode : "-", p.Category, p.Title, p.PlannedAmount, `${p.StartDate} s/d ${p.EndDate}`, p.PIC, p.Status]);
  });
  actuals.forEach(a => {
    const parentPlan = plans.find(p => p.PlanID === a.PlanID);
    const parentBudget = budgets.find(b => b.BudgetID === a.BudgetID);
    const parentCode = parentPlan ? parentPlan.PlanCode : (parentBudget ? parentBudget.BudgetCode : "-");
    allMasterRows.push(["ACTUAL", a.ReferenceNumber || a.ActualID, parentCode, a.Category, a.Description || "-", a.Amount, a.TransactionDate, a.CreatedBy || "-", "Completed"]);
  });

  return {
    summaryRows,
    categoryNames,
    categorySheetsMap,
    allMasterRows
  };
}

// 2. Download Multi-Sheet Excel Workbook (.xlsx) Divided Per Category
export function downloadCategoryMultiSheetExcel(dbData: {
  budgets: Budget[];
  plans: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  users: User[];
}) {
  const { summaryRows, categoryNames, categorySheetsMap, allMasterRows } = prepareCategoryMultiSheetTables(dbData);
  const workbook = XLSX.utils.book_new();

  // 1. Sheet: Ringkasan_Per_Kategori
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary["!cols"] = [
    { wch: 6 },  // No
    { wch: 28 }, // Nama Kategori
    { wch: 22 }, // Plafon
    { wch: 22 }, // Plan
    { wch: 22 }, // Actual
    { wch: 20 }, // Sisa
    { wch: 15 }, // Pct
    { wch: 14 }  // Records
  ];
  XLSX.utils.book_append_sheet(workbook, wsSummary, "Ringkasan_Per_Kategori");

  // 2. Sheet Per Category
  categoryNames.forEach(catName => {
    const sheetData = categorySheetsMap[catName];
    if (sheetData && sheetData.length > 1) {
      const wsCat = XLSX.utils.aoa_to_sheet(sheetData);
      wsCat["!cols"] = [
        { wch: 14 }, // Tipe
        { wch: 22 }, // Code
        { wch: 20 }, // Parent
        { wch: 24 }, // Category
        { wch: 45 }, // Description
        { wch: 20 }, // Plafon
        { wch: 20 }, // Rencana
        { wch: 20 }, // Realisasi
        { wch: 20 }, // Sisa
        { wch: 26 }, // Date
        { wch: 25 }, // PIC
        { wch: 14 }  // Status
      ];
      const safeSheetName = sanitizeSheetName(catName);
      XLSX.utils.book_append_sheet(workbook, wsCat, safeSheetName);
    }
  });

  // 3. Sheet: All_Master_Database
  const wsAll = XLSX.utils.aoa_to_sheet(allMasterRows);
  wsAll["!cols"] = [
    { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 24 }, { wch: 45 }, { wch: 20 }, { wch: 28 }, { wch: 28 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsAll, "All_Master_Database");

  const fileName = `Ajinomoto_Database_MultiSheet_Per_Kategori_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// 3. Download Sample Pre-formatted Template (Multi-Sheet Excel .xlsx)
export function downloadCategoryMultiSheetTemplate() {
  const workbook = XLSX.utils.book_new();

  // Summary Tab Template
  const summaryRows = [
    ["No", "Nama Kategori", "Total Plafon Budget (Rp)", "Total Plan Rencana (Rp)", "Total Realisasi Cost (Rp)", "Sisa Plafon (Rp)", "Penyerapan (%)", "Total Records"],
    [1, "Promosi & Marketing", 250000000, 100000000, 45000000, 205000000, "18%", 3],
    [2, "Operasional & Administrasi", 150000000, 80000000, 30000000, 120000000, "20%", 2],
    [3, "Investasi & Peralatan", 500000000, 300000000, 150000000, 350000000, "30%", 2]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(workbook, wsSummary, "Ringkasan_Per_Kategori");

  // Category 1: Promosi & Marketing
  const cat1Rows = [
    ["Tipe Entitas", "Kode ID / Ref", "Kode Induk", "Kategori", "Deskripsi / Nama Items", "Plafon Budget (Rp)", "Rencana Budget (Rp)", "Realisasi Cost (Rp)", "Sisa Plafon (Rp)", "Tanggal / Periode", "PIC / User", "Status"],
    ["BUDGET", "BG-2026-MKT-01", "-", "Promosi & Marketing", "Program Promosi Brand Mascot Ajinomoto Q1-Q4", 250000000, 0, 0, 205000000, "2026-01-01 s/d 2026-12-31", "Wahyu Waullilamri Kurniawan", "Active"],
    ["PLAN", "PLN-MKT-01-A", "BG-2026-MKT-01", "Promosi & Marketing", "Kampanye TV & Media Sosial Q1", 0, 100000000, 0, 0, "2026-01-15 s/d 2026-03-31", "Rian Wijaya (Staff)", "Planned"],
    ["ACTUAL", "ACT-2026-001", "PLN-MKT-01-A", "Promosi & Marketing", "Downpayment Slot Iklan Primetime TV", 0, 0, 45000000, 0, "2026-02-01", "Rian Wijaya (Staff)", "Completed"]
  ];
  const wsCat1 = XLSX.utils.aoa_to_sheet(cat1Rows);
  XLSX.utils.book_append_sheet(workbook, wsCat1, "Promosi & Marketing");

  // Category 2: Operasional & Administrasi
  const cat2Rows = [
    ["Tipe Entitas", "Kode ID / Ref", "Kode Induk", "Kategori", "Deskripsi / Nama Items", "Plafon Budget (Rp)", "Rencana Budget (Rp)", "Realisasi Cost (Rp)", "Sisa Plafon (Rp)", "Tanggal / Periode", "PIC / User", "Status"],
    ["BUDGET", "BG-2026-OPS-01", "-", "Operasional & Administrasi", "Biaya Operasional Kantor Pusat 2026", 150000000, 0, 0, 120000000, "2026-01-01 s/d 2026-12-31", "Wahyu Waullilamri Kurniawan", "Active"],
    ["ACTUAL", "ACT-OPS-001", "BG-2026-OPS-01", "Operasional & Administrasi", "Pembelian ATK & Maintenance Server Jan 2026", 0, 0, 30000000, 0, "2026-01-20", "Admin Operasional", "Completed"]
  ];
  const wsCat2 = XLSX.utils.aoa_to_sheet(cat2Rows);
  XLSX.utils.book_append_sheet(workbook, wsCat2, "Operasional & Administrasi");

  XLSX.writeFile(workbook, `Template_Database_MultiSheet_PerKategori_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// 4. Create Google Spreadsheet with Category Sheets
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string,
  dbData: {
    budgets: Budget[];
    plans: PlanBudget[];
    actuals: Actual[];
    categories: Category[];
    users: User[];
  }
): Promise<GoogleSheetsSyncResult> {
  const { summaryRows, categoryNames, categorySheetsMap, allMasterRows } = prepareCategoryMultiSheetTables(dbData);

  const sheetsConfig = [
    { properties: { title: "Ringkasan_Per_Kategori" } }
  ];

  categoryNames.forEach(catName => {
    sheetsConfig.push({ properties: { title: sanitizeSheetName(catName) } });
  });

  sheetsConfig.push({ properties: { title: "All_Master_Database" } });

  const createRequestBody = {
    properties: {
      title: title || `Ajinomoto_Master_Database_MultiSheet_${new Date().toISOString().slice(0, 10)}`
    },
    sheets: sheetsConfig
  };

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createRequestBody)
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Gagal membuat spreadsheet Google Sheets: ${errorText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl;

  // Batch Populate Values
  const valueData = [
    { range: "Ringkasan_Per_Kategori!A1", values: summaryRows }
  ];

  categoryNames.forEach(catName => {
    const sheetVals = categorySheetsMap[catName];
    if (sheetVals) {
      valueData.push({
        range: `'${sanitizeSheetName(catName)}'!A1`,
        values: sheetVals
      });
    }
  });

  valueData.push({ range: "All_Master_Database!A1", values: allMasterRows });

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: valueData
      })
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

// 5. Update Existing Google Spreadsheet
export async function updateGoogleSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  dbData: {
    budgets: Budget[];
    plans: PlanBudget[];
    actuals: Actual[];
    categories: Category[];
    users: User[];
  }
) {
  const { summaryRows, categoryNames, categorySheetsMap, allMasterRows } = prepareCategoryMultiSheetTables(dbData);

  const valueData = [
    { range: "Ringkasan_Per_Kategori!A1", values: summaryRows }
  ];

  categoryNames.forEach(catName => {
    const sheetVals = categorySheetsMap[catName];
    if (sheetVals) {
      valueData.push({
        range: `'${sanitizeSheetName(catName)}'!A1`,
        values: sheetVals
      });
    }
  });

  valueData.push({ range: "All_Master_Database!A1", values: allMasterRows });

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: valueData
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memperbarui data spreadsheet: ${errText}`);
  }

  return await res.json();
}

// 6. Fetch Rows from Google Sheet
export async function fetchRowsFromGoogleSheet(accessToken: string, spreadsheetId: string, range = "All_Master_Database!A1:Z1000") {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membaca data dari Google Sheets ID (${spreadsheetId}): ${errText}`);
  }

  const data = await res.json();
  return data.values || [];
}

// Re-export offline helper
export function downloadOfflineGoogleSheetExcel(dbData: {
  budgets: Budget[];
  plans: PlanBudget[];
  actuals: Actual[];
  categories: Category[];
  users: User[];
}) {
  downloadCategoryMultiSheetExcel(dbData);
}
