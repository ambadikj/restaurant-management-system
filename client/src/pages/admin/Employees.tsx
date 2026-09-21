import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { socket } from "../../lib/socket";
import {
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  Mail,
  Shield,
  ChefHat,
  ReceiptText,
} from "lucide-react";

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  fullName: string;
  username: string;
  email: string;
  isActive: boolean;
  role: { name: string };
}

export default function Employees() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Form State: Add User
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  // Form State: Edit User
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editPassword, setEditPassword] = useState("");

  useEffect(() => {
    fetchData(true);

    const handleEmployeeCreated = (newUser: User) => {
      setUsers((prev) => {
        if (prev.some((u) => u.id === newUser.id)) return prev;
        return [...prev, newUser];
      });
    };

    const handleEmployeeUpdated = (updatedUser: User) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );
    };

    const handleEmployeeDeleted = ({ id }: { id: number }) => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    };

    socket.on("employee:created", handleEmployeeCreated);
    socket.on("employee:updated", handleEmployeeUpdated);
    socket.on("employee:deleted", handleEmployeeDeleted);

    return () => {
      socket.off("employee:created", handleEmployeeCreated);
      socket.off("employee:updated", handleEmployeeUpdated);
      socket.off("employee:deleted", handleEmployeeDeleted);
    };
  }, []);

  const fetchData = async (showLoadingState = false) => {
    try {
      if (showLoadingState) setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        axiosInstance.get("/users"),
        axiosInstance.get("/users/roles"),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
      if (rolesRes.data.length > 0 && !roleId) {
        setRoleId(rolesRes.data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to fetch staff accounts and roles.", err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/users", {
        fullName,
        username,
        email,
        password,
        roleId: Number(roleId),
      });

      setFullName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setIsAddModalOpen(false);
      showNotification(`Staff member "${fullName}" created successfully!`);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error creating user");
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    const userRole = roles.find((r) => r.name === user.role.name);
    setEditRoleId(userRole ? userRole.id.toString() : (roles[0]?.id.toString() || "1"));
    setEditPassword("");
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await axiosInstance.put(`/users/${editingUser.id}`, {
        fullName: editFullName,
        email: editEmail,
        roleId: Number(editRoleId),
        ...(editPassword ? { password: editPassword } : {}),
      });

      setIsEditModalOpen(false);
      setEditingUser(null);
      showNotification(`"${editFullName}" updated successfully!`);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error updating user");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await axiosInstance.delete(`/users/${deleteConfirmUser.id}`);
      showNotification(`"${deleteConfirmUser.fullName}" removed.`);
      setDeleteConfirmUser(null);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error deleting user");
    }
  };

  const toggleStatus = async (id: number) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
    try {
      await axiosInstance.patch(`/users/${id}/status`);
      showNotification("Staff status updated!");
      fetchData(false);
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
      );
      alert(err.response?.data?.message || "Error updating status");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.name.toLowerCase().includes(q);

    const matchesRole =
      selectedRoleFilter === "ALL" ||
      u.role.name.toUpperCase() === selectedRoleFilter.toUpperCase();

    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-18 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1c1c1e]/90 border border-white/[0.12] backdrop-blur-2xl px-5 py-3 text-xs font-medium text-white shadow-2xl shadow-indigo-500/10 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-indigo-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl">
        {/* Ambient Bloom Halos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Employee Directory
          </h1>

          {/* Add Member Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-95 hover:scale-[1.02] self-start md:self-auto cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>



      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(["ALL", "ADMIN", "CASHIER", "KITCHEN"] as const).map((r) => {
            const label =
              r === "ALL" ? "All Staff" : r === "ADMIN" ? "Admins" : r === "CASHIER" ? "Cashiers" : "Kitchen";
            const count =
              r === "ALL"
                ? users.length
                : users.filter((u) => u.role.name.toUpperCase() === r).length;
            const isSelected = selectedRoleFilter === r;

            return (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-white/[0.08] text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search staff, username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-xs rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-indigo-500 transition-all focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ================= STAFF TRACKLIST DIRECTORY ================= */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#1c1c1f]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm border-collapse min-w-[700px]">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Team Member</th>
                <th className="px-4 py-3.5">Assigned Role</th>
                <th className="px-4 py-3.5">Email Contact</th>
                <th className="px-4 py-3.5">Auth Status</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-xs text-neutral-500 font-mono">
                    Loading team accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-xs text-neutral-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleName = user.role.name.toLowerCase();

                  return (
                    <tr
                      key={user.id}
                      className={`group hover:bg-white/[0.03] transition-colors ${
                        !user.isActive ? "opacity-60 bg-white/[0.01]" : ""
                      }`}
                    >
                      {/* Member Info */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3.5">
                          {/* Avatar Medallion */}
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
                            {user.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-xs sm:text-sm text-white truncate">
                              {user.fullName}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate font-mono mt-0.5">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-neutral-200">
                          {roleName === "admin" && (
                            <Shield className="h-3 w-3 text-indigo-400 shrink-0" />
                          )}
                          {roleName === "cashier" && (
                            <ReceiptText className="h-3 w-3 text-sky-400 shrink-0" />
                          )}
                          {roleName === "kitchen" && (
                            <ChefHat className="h-3 w-3 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{user.role.name}</span>
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-4 text-xs text-neutral-300">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-0.5 text-xs font-semibold text-neutral-400 border border-white/[0.1]">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleStatus(user.id)}
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/[0.08] transition-colors"
                          >
                            {user.isActive ? "Suspend" : "Activate"}
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-neutral-400 hover:text-white border border-white/[0.08] transition-colors"
                            title="Edit Member"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmUser(user)}
                            className="h-7 w-7 rounded-full bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center text-neutral-400 hover:text-red-400 border border-white/[0.08] transition-colors"
                            title="Delete Member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Bar */}
        <div className="border-t border-white/[0.06] bg-white/[0.02] px-6 py-3 text-xs text-neutral-400 flex items-center justify-between">
          <span>
            Showing {filteredUsers.length} of {users.length} members
          </span>
          <span className="text-[11px] text-neutral-500">
            RBAC Directory
          </span>
        </div>
      </div>

      {/* ================= MODAL: ADD STAFF ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Add Team Member</h3>
                <p className="text-xs text-neutral-400">
                  Create staff login credentials and assign system permissions
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aaliya Khalid"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="aaliya_k"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Role *
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs rounded-xl bg-[#222226] text-white border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="aaliya@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-all"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT STAFF ================= */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Edit Member</h3>
                <p className="text-xs text-neutral-400">
                  Update details and permissions for @{editingUser.username}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Role
                </label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  required
                  className="w-full h-10 px-3 text-xs rounded-xl bg-[#222226] text-white border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Reset Password <span className="text-neutral-500 font-normal">(optional)</span>
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE USER CONFIRMATION ================= */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-rose-400 border border-red-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Member</h3>
                <p className="text-xs text-neutral-400">Revoke access immediately</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-white">{deleteConfirmUser.fullName}</strong> (@{deleteConfirmUser.username})? Their dashboard access will be immediately revoked.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 hover:opacity-95 transition-all"
              >
                Delete Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
