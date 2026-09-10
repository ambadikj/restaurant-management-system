import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      showNotification(`Staff member "${fullName}" created`);
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
      showNotification(`"${editFullName}" updated successfully`);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error updating user");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await axiosInstance.delete(`/users/${deleteConfirmUser.id}`);
      showNotification(`"${deleteConfirmUser.fullName}" removed`);
      setDeleteConfirmUser(null);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error deleting user");
    }
  };

  const toggleStatus = async (id: number) => {
    // Optimistically toggle status locally so the UI updates instantly without layout shifts
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    );
    try {
      await axiosInstance.patch(`/users/${id}/status`);
      showNotification("Staff status updated");
      fetchData(false);
    } catch (err: any) {
      // Revert optimistic update if API fails
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-top-2 border border-neutral-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-2xl">
            Staff & Permissions
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Manage your restaurant team accounts, access roles, and permissions.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="h-9 gap-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-xs self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add member
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Segmented Role Tabs */}
        <div className="inline-flex h-9 items-center rounded-lg bg-neutral-100/90 p-1 text-xs dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-800">
          {(["ALL", "ADMIN", "CASHIER", "KITCHEN"] as const).map((r) => {
            const label = r === "ALL" ? "All" : r === "ADMIN" ? "Admins" : r === "CASHIER" ? "Cashiers" : "Kitchen";
            const count =
              r === "ALL"
                ? users.length
                : users.filter((u) => u.role.name.toUpperCase() === r).length;
            const isSelected = selectedRoleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-mono ${
                    isSelected
                      ? "text-neutral-500 dark:text-neutral-400"
                      : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <Input
            type="text"
            placeholder="Filter by name, @username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 focus-visible:ring-neutral-400"
          />
        </div>
      </div>

      {/* ================= STAFF DIRECTORY LIST TABLE ================= */}
      <div className="rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-sm border-collapse min-w-[650px]">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="border-b border-neutral-200/80 bg-neutral-50/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
              <tr>
                <th className="py-3 pl-5 pr-4">Member</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="py-3 pl-4 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-xs text-neutral-400">
                    Loading team members...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-xs text-neutral-400">
                    No team members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleName = user.role.name.toLowerCase();

                  return (
                    <tr
                      key={user.id}
                      className={`group transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 ${
                        !user.isActive ? "bg-neutral-50/20 opacity-60" : ""
                      }`}
                    >
                      {/* Member Info */}
                      <td className="py-3.5 pl-5 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs flex items-center justify-center border border-neutral-200/70 dark:border-neutral-700/80 shrink-0">
                            {user.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-medium text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">
                              {user.fullName}
                            </div>
                            <div className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate font-mono">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/60 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {roleName === "admin" && <Shield className="h-3 w-3 text-neutral-500 shrink-0" />}
                          {roleName === "cashier" && <ReceiptText className="h-3 w-3 text-neutral-500 shrink-0" />}
                          {roleName === "kitchen" && <ChefHat className="h-3 w-3 text-neutral-500 shrink-0" />}
                          <span className="truncate">{user.role.name}</span>
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3.5 text-xs text-neutral-600 dark:text-neutral-300">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 text-neutral-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 shrink-0" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-4 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(user.id)}
                            className="h-7 w-16 px-0 text-center text-[11px] font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                          >
                            {user.isActive ? "Suspend" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(user)}
                            className="h-7 w-7 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmUser(user)}
                            className="h-7 w-7 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
        <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 py-2.5 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/30 flex items-center justify-between">
          <span>
            Showing {filteredUsers.length} of {users.length} members
          </span>
          <span className="text-[11px] text-neutral-400">
            Role-Based Access Control (RBAC)
          </span>
        </div>
      </div>

      {/* ================= MODAL: ADD STAFF ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Add team member
                </h3>
                <p className="text-xs text-neutral-500">Create login credentials and set their access role</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Aaliya Khalid"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Username
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="aaliya_k"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Role
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    required
                    className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
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
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  placeholder="aaliya@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Temporary password
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-8 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Add member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT STAFF ================= */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Edit member
                </h3>
                <p className="text-xs text-neutral-500">Updating details for @{editingUser.username}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Full name
                </label>
                <Input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Role
                </label>
                <select
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Reset password <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-8 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE USER CONFIRMATION ================= */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Delete member
                </h3>
                <p className="text-xs text-neutral-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to remove <strong>{deleteConfirmUser.fullName}</strong> (@{deleteConfirmUser.username})? Their dashboard access will be immediately revoked.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmUser(null)}
                className="h-8 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteUser}
                className="h-8 text-xs font-medium"
              >
                Delete member
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
