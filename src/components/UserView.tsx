/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Edit3, 
  X, 
  Search, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock,
  UserCheck
} from "lucide-react";
import { User, UserRole } from "../types";

interface UserViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (u: Omit<User, "UserID">) => Promise<boolean>;
  onEditUser: (id: string, u: Partial<User>) => Promise<boolean>;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function UserView({
  users,
  currentUser,
  onAddUser,
  onEditUser,
  addToast
}: UserViewProps) {
  const isAdmin = currentUser.Role === UserRole.ADMIN;

  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>(UserRole.STAFF);
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-red-100 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm animate-fade-in">
        <div className="p-4 bg-red-50 text-brand-red rounded-full w-fit mx-auto border border-red-100">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-800 font-display">Akses Ditolak (Unauthorized)</h2>
          <p className="text-xs text-gray-400">Akun Anda terdaftar dengan peranan **{currentUser.Role}**. Menu Manajemen Pengguna hanya dapat diakses oleh Administrator Sistem Hukum.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    return (
      u.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.Email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.Role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole(UserRole.STAFF);
    setFormStatus("Active");
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingId(u.UserID);
    setFormName(u.Name);
    setFormEmail(u.Email);
    setFormPassword(u.Password || "legalstaff"); // Default fallback
    setFormRole(u.Role);
    setFormStatus(u.Status);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName || !formEmail || !formPassword || !formRole) {
      addToast("Harap isi seluruh field wajib.", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      addToast("Format alamat email tidak valid.", "error");
      return;
    }

    setSubmitting(true);
    const userData = {
      Name: formName.trim(),
      Email: formEmail.trim().toLowerCase(),
      Password: formPassword,
      Role: formRole,
      Status: formStatus
    };

    try {
      let success = false;
      if (editingId) {
        success = await onEditUser(editingId, userData);
      } else {
        success = await onAddUser(userData);
      }
      if (success) {
        setShowModal(false);
      }
    } catch (err) {
      addToast("Gagal memproses data pengguna.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-semibold text-gray-800">Manajemen Pengguna</h1>
          <p className="text-xs text-gray-500">Mengelola kredensial masuk, otorisasi peranan, dan status aktif staf hukum divisi Legal</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 bg-brand-red text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all self-start shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Staff Baru</span>
        </button>
      </div>

      {/* Searching */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari user berdasarkan nama, email, peranan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-brand-red focus:outline-none transition-colors bg-white"
          />
        </div>
      </div>

      {/* Users List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden max-w-4xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50">
              <th className="py-3 px-4">Nama Lengkap</th>
              <th className="py-3 px-4">Email Ajinomoto</th>
              <th className="py-3 px-4 font-mono">Kredensial</th>
              <th className="py-3 px-4">Peranan (Role)</th>
              <th className="py-3 px-4 text-center">Status Keaktifan</th>
              <th className="py-3 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <tr key={u.UserID} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-brand-red font-bold flex items-center justify-center border border-red-100 uppercase text-xs shrink-0">
                      {u.Name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-gray-800">{u.Name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">ID: {u.UserID}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-gray-600">{u.Email}</td>
                <td className="py-3.5 px-4 font-mono text-gray-400">••••••••</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    u.Role === UserRole.ADMIN 
                      ? "bg-slate-900 text-white border border-slate-950" 
                      : "bg-red-50 text-brand-red border border-red-100"
                  }`}>
                    {u.Role}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    u.Status === "Active" 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                    {u.Status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="p-1.5 text-gray-500 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition-colors inline-flex"
                    title="Ubah Akses"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="flex justify-between items-center bg-gray-50 px-5 py-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-800 font-display uppercase tracking-wider">
                {editingId ? "Ubah Hak Akses Staff" : "Daftarkan Staff Hukum Baru"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wahyu Waullilamri Kurniawan, S.H."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-gray-800 font-medium"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Alamat Email Staff *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="nama@domain.com / email@gmail.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-gray-800 font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Password Masuk *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="Kata sandi minimal 6 karakter"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-gray-800"
                  />
                </div>
              </div>

              {/* Role & Status Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Peranan Akses *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white"
                  >
                    <option value={UserRole.STAFF}>Legal Staff</option>
                    <option value={UserRole.ADMIN}>Administrator</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Status Keaktifan *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Active" | "Inactive")}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white"
                  >
                    <option value="Active">Aktif</option>
                    <option value="Inactive">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-brand-red text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center space-x-1"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Simpan Pengguna</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
