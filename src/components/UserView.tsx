/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Edit3, 
  Trash2,
  X, 
  Search, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock,
  Eye,
  EyeOff,
  AlertTriangle
} from "lucide-react";
import { User, UserRole } from "../types";

interface UserViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (u: Omit<User, "UserID">) => Promise<boolean>;
  onEditUser: (id: string, u: Partial<User>) => Promise<boolean>;
  onDeleteUser?: (id: string) => Promise<boolean>;
  addToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function UserView({
  users,
  currentUser,
  onAddUser,
  onEditUser,
  onDeleteUser,
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
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>(UserRole.STAFF);
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");

  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-red-100 text-center space-y-4 max-w-md mx-auto my-12 shadow-sm animate-fade-in">
        <div className="p-4 bg-red-50 text-brand-red rounded-full w-fit mx-auto border border-red-100">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-800 font-display">Akses Ditolak (Unauthorized)</h2>
          <p className="text-xs text-gray-400">Akun Anda terdaftar dengan peranan <strong>{currentUser.Role}</strong>. Menu Manajemen Pengguna hanya dapat diakses oleh Administrator Sistem Hukum.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    return (
      (u.Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.Email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.Role || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setShowPassword(false);
    setFormRole(UserRole.STAFF);
    setFormStatus("Active");
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingId(u.UserID);
    setFormName(u.Name);
    setFormEmail(u.Email);
    setFormPassword(u.Password || "1834561");
    setShowPassword(false);
    setFormRole(u.Role);
    setFormStatus(u.Status);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim() || !formRole) {
      addToast("Harap lengkapi seluruh field wajib.", "error");
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
      Password: formPassword.trim(),
      Role: formRole,
      Status: formStatus
    };

    try {
      let success = false;
      if (editingId) {
        success = await onEditUser(editingId, userData);
        if (success) {
          addToast(`Data pengguna ${formName} berhasil diperbarui & disimpan.`, "success");
        }
      } else {
        success = await onAddUser(userData);
        if (success) {
          addToast(`Pengguna baru ${formName} berhasil didaftarkan.`, "success");
        }
      }

      if (success) {
        setShowModal(false);
      }
    } catch (err: any) {
      addToast(err.message || "Gagal menyimpan data pengguna.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUserClick = (u: User) => {
    if (u.UserID === currentUser.UserID || u.Email.toLowerCase() === currentUser.Email.toLowerCase()) {
      addToast("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.", "error");
      return;
    }
    setDeleteConfirmId(u.UserID);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId || !onDeleteUser) return;
    setIsDeleting(true);
    try {
      const target = users.find(u => u.UserID === deleteConfirmId);
      const success = await onDeleteUser(deleteConfirmId);
      if (success) {
        addToast(`Pengguna ${target?.Name || ''} berhasil dihapus dari database.`, "success");
        setDeleteConfirmId(null);
      }
    } catch (err: any) {
      addToast(err.message || "Gagal menghapus pengguna.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-red-50 text-brand-red rounded-xl border border-red-100 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 font-display">Manajemen Pengguna & Hak Akses</h1>
            <p className="text-xs text-gray-500">Database Master Legal tersinkronisasi otomatis (Local Storage & Cloud Database)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red w-40 sm:w-56"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-red text-white rounded-xl text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Staff</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-mono font-medium uppercase tracking-wider bg-gray-50/50 text-[10px]">
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Email Login</th>
                <th className="py-3 px-4 font-mono">Kata Sandi</th>
                <th className="py-3 px-4 text-center">Peranan (Role)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.UserID === currentUser.UserID || u.Email.toLowerCase() === currentUser.Email.toLowerCase();
                  return (
                    <tr key={u.UserID} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-red-50 text-brand-red font-bold flex items-center justify-center border border-red-100 uppercase text-xs shrink-0">
                            {u.Name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 flex items-center gap-1.5">
                              <span>{u.Name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded-sm bg-brand-red text-white text-[9px] font-mono">
                                  AKUN SAYA
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">ID: {u.UserID}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{u.Email}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-400">••••••••</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.Role === UserRole.ADMIN 
                            ? "bg-red-50 text-brand-red border border-red-100" 
                            : "bg-blue-50 text-blue-700 border border-blue-100"
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex cursor-pointer"
                            title="Ubah Akses & Password"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {onDeleteUser && !isCurrent && (
                            <button
                              onClick={() => handleDeleteUserClick(u)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-flex cursor-pointer"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="flex justify-between items-center bg-gray-50 px-5 py-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-800 font-display uppercase tracking-wider">
                {editingId ? "Ubah Hak Akses & Kredensial" : "Daftarkan Staff Hukum Baru"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
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
                  placeholder="e.g. Wahyu Waullilamri Kurniawan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-gray-800 font-medium"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Alamat Email Login *</label>
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
                <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Kata Sandi (Password) *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Kata sandi akun"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red text-gray-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white font-medium"
                  >
                    <option value={UserRole.ADMIN}>Administrator</option>
                    <option value={UserRole.STAFF}>Legal Staff</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-gray-500 uppercase tracking-widest mb-1">Status Keaktifan *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Active" | "Inactive")}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red bg-white font-medium"
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
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-brand-red text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-red-100 shadow-xl w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="font-bold text-sm text-gray-900 font-display">Konfirmasi Hapus Pengguna</h3>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun pengguna ini secara permanen dari database? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end items-center space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer"
              >
                {isDeleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Ya, Hapus Akun</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
