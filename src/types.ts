/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Administrator",
  STAFF = "Legal Staff"
}

export enum BudgetStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive"
}

export enum PlanStatus {
  PLANNED = "Planned",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled"
}

export type CompanyName = "PT Ajinomoto Indonesia" | "PT Ajinex International";

export const COMPANIES: CompanyName[] = [
  "PT Ajinomoto Indonesia",
  "PT Ajinex International"
];

export interface User {
  UserID: string;
  Name: string;
  Email: string;
  Role: UserRole;
  Status: "Active" | "Inactive";
  Password?: string;
  Company?: CompanyName | "ALL";
}

export interface Budget {
  BudgetID: string;
  Year: number; // Stored/derived year for quick filtering
  StartDate: string; // e.g. "2025-03-30"
  EndDate: string; // e.g. "2026-04-01"
  BudgetCode: string; // e.g. 1020440 or custom code freely edited
  Category: string; // e.g. License or custom category freely typed
  Description: string;
  BudgetAmount: number;
  PIC: string;
  Status: BudgetStatus;
  CreatedDate: string;
  Company?: CompanyName; // PT Ajinomoto Indonesia or PT Ajinex International
}

export interface PlanBudget {
  PlanID: string;
  BudgetID: string; // References Budget.BudgetID
  PlanCode: string; // e.g. PLN-1020440-01 or custom user input
  Title: string; // e.g. Rencana Pembayaran PBB & Pajak Pabrik Karawang
  Vendor?: string; // Vendor / Pihak Ketiga (e.g. PT Sucofindo, Law Firm Partner)
  Category?: string; // Inherited or custom category
  PlannedAmount: number;
  StartDate: string; // Target start date
  EndDate: string; // Target completion date
  PIC: string;
  Status: PlanStatus;
  Notes?: string;
  CreatedBy: string;
  CreatedDate: string;
  Company?: CompanyName;
}

export interface Actual {
  ActualID: string;
  TransactionDate: string;
  BudgetID: string; // References Budget.BudgetID
  PlanID?: string; // Optional reference to PlanBudget.PlanID
  Category: string;
  Description: string;
  ReferenceNumber?: string;
  Amount: number;
  AttachmentName?: string;
  AttachmentData?: string; // base64-encoded file
  AttachmentType?: string; // mime-type
  Notes?: string;
  CreatedBy: string; // Name of creator
  CreatedDate: string;
  Company?: CompanyName;
}

export interface Category {
  CategoryID: string;
  CategoryName: string;
  Status: "Active" | "Inactive";
}

export interface AuditLog {
  LogID: string;
  Timestamp: string;
  UserEmail: string;
  UserName: string;
  Action: string;
  Category: "AUTH" | "BUDGET" | "PLAN" | "ACTUAL" | "CATEGORY" | "SYSTEM";
}

export interface KPIStats {
  totalBudget: number;
  totalActual: number;
  remainingBudget: number;
  utilizationRate: number;
}
