import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import {
  UtensilsCrossed,
  PlusCircle,
  FolderPlus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  category: Category;
  inventory: { remainingQty: number; dailyLimit: number } | null;
}

export default function MenuInventory() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [isAddMenuModalOpen, setIsAddMenuModalOpen] = useState(false);
  const [isEditMenuModalOpen, setIsEditMenuModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null);

  // Form State: Category
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");

  // Form State: Add Menu Item
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dailyLimit, setDailyLimit] = useState("50");
  const [image, setImage] = useState<File | null>(null);

  // Form State: Edit Menu Item
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDailyLimit, setEditDailyLimit] = useState("");
  const [editRemainingQty, setEditRemainingQty] = useState("");
  const [editImage, setEditImage] = useState<File | null>(null);

  useEffect(() => {
    fetchData(true);
  }, []);

  const fetchData = async (showLoadingState = false) => {
    try {
      if (showLoadingState) setLoading(true);
      const [catRes, itemsRes] = await Promise.all([
        axiosInstance.get("/menu/categories"),
        axiosInstance.get("/menu/items"),
      ]);
      setCategories(catRes.data);
      setItems(itemsRes.data);
      if (catRes.data.length > 0 && !categoryId) {
        setCategoryId(catRes.data[0].id.toString());
      }
    } catch (err) {
      console.error("Failed to fetch menu and inventory data.", err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3500);
  };

  // --- CATEGORY ACTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/menu/categories", {
        name: catName,
        description: catDesc,
      });
      setCatName("");
      setCatDesc("");
      setIsCategoryModalOpen(false);
      showNotification("Category created successfully!");
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error creating category");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category? Items in this category might be affected.")) return;
    try {
      await axiosInstance.delete(`/menu/categories/${id}`);
      showNotification("Category deleted successfully!");
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error deleting category");
    }
  };

  // --- MENU ITEM ACTIONS ---
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("categoryId", categoryId);
      formData.append("dailyLimit", dailyLimit || "50");
      if (image) {
        formData.append("image", image);
      }

      await axiosInstance.post("/menu/items", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setName("");
      setDescription("");
      setPrice("");
      setDailyLimit("50");
      setImage(null);
      setIsAddMenuModalOpen(false);
      showNotification(`"${name}" added to menu catalog!`);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error creating menu item");
    }
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditPrice(item.price);
    setEditCategoryId(item.categoryId.toString());
    setEditDailyLimit(item.inventory?.dailyLimit?.toString() || "50");
    setEditRemainingQty(item.inventory?.remainingQty?.toString() || "50");
    setEditImage(null);
    setIsEditMenuModalOpen(true);
  };

  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const formData = new FormData();
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("price", editPrice);
      formData.append("categoryId", editCategoryId);
      formData.append("dailyLimit", editDailyLimit);
      formData.append("remainingQty", editRemainingQty);
      if (editImage) {
        formData.append("image", editImage);
      }

      await axiosInstance.put(`/menu/items/${editingItem.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIsEditMenuModalOpen(false);
      setEditingItem(null);
      showNotification(`"${editName}" updated successfully!`);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error updating menu item");
    }
  };

  const handleDeleteMenuItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      await axiosInstance.delete(`/menu/items/${deleteConfirmItem.id}`);
      showNotification(`"${deleteConfirmItem.name}" was deleted from menu.`);
      setDeleteConfirmItem(null);
      fetchData(false);
    } catch (err: any) {
      alert(err.response?.data?.message || "Error deleting menu item");
    }
  };

  const handleQuickLimitUpdate = async (itemId: number, newQty: number) => {
    if (newQty < 0) return;
    try {
      await axiosInstance.patch(`/menu/items/${itemId}/inventory`, {
        remainingQty: newQty,
      });
      // Optimistic update
      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId && it.inventory
            ? { ...it, inventory: { ...it.inventory, remainingQty: newQty } }
            : it
        )
      );
      showNotification("Stock limit updated!");
    } catch (err) {
      alert("Error updating inventory quantity");
      fetchData(false);
    }
  };

  const handleToggleState = async (itemId: number) => {
    // Optimistic toggle
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, isAvailable: !it.isAvailable } : it))
    );
    try {
      await axiosInstance.patch(`/menu/items/${itemId}/status`);
      showNotification("Item availability updated!");
      fetchData(false);
    } catch (err) {
      // Revert optimistic update on error
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, isAvailable: !it.isAvailable } : it))
      );
      alert("Error toggling item availability");
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCat =
      activeCategoryFilter === "ALL" || item.categoryId === activeCategoryFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.category.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
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
            Menu & Catalog
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Manage dishes, pricing, inventory batch limits, and categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium border-neutral-200 dark:border-neutral-800"
          >
            <FolderPlus className="h-3.5 w-3.5 text-neutral-500" />
            Categories ({categories.length})
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddMenuModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add menu item
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100/90 rounded-lg dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-800">
          <button
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
              activeCategoryFilter === "ALL"
                ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] font-mono ${
                activeCategoryFilter === "ALL"
                  ? "text-neutral-500 dark:text-neutral-400"
                  : "text-neutral-400 dark:text-neutral-500"
              }`}
            >
              {items.length}
            </span>
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.categoryId === cat.id).length;
            const isSelected = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                <span>{cat.name}</span>
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
            placeholder="Filter by name, ingredients, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 focus-visible:ring-neutral-400"
          />
        </div>
      </div>

      {/* ================= VIEW: CARD GRID VIEW ================= */}
      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-400">Loading menu catalog...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.length === 0 ? (
            <Card className="col-span-full p-12 text-center text-neutral-400 text-xs">
              No menu items found matching category or filter.
            </Card>
          ) : (
            filteredItems.map((item) => {
              const isDepleted =
                !item.isAvailable || (item.inventory && item.inventory.remainingQty === 0);
              const remQty = item.inventory ? item.inventory.remainingQty : 0;
              const dailyLimit = item.inventory ? item.inventory.dailyLimit : 0;
              const pct = dailyLimit > 0 ? Math.min(100, Math.round((remQty / dailyLimit) * 100)) : 0;

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-xs dark:bg-neutral-900 transition-colors ${
                    isDepleted
                      ? "border-red-200 dark:border-red-950"
                      : "border-neutral-200/80 hover:border-neutral-300 dark:border-neutral-800"
                  }`}
                >
                  {/* Card Image Banner */}
                  <div className="relative h-40 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    {item.imageUrl && !item.imageUrl.includes("default-food.png") ? (
                      <img
                        src={`http://localhost:5000/${item.imageUrl}`}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-400">
                        <UtensilsCrossed className="h-8 w-8 opacity-40" />
                      </div>
                    )}

                    {/* Category Pill Tag */}
                    <span className="absolute top-2.5 left-2.5 rounded-lg bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      {item.category.name}
                    </span>

                    {/* Price Pill */}
                    <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-white/90 backdrop-blur-md px-2.5 py-1 text-xs font-mono font-black text-neutral-900 shadow-md dark:bg-neutral-900/90 dark:text-neutral-100">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      {/* Name & Availability Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-bold text-sm tracking-tight ${
                            isDepleted
                              ? "text-neutral-500 line-through"
                              : "text-neutral-900 dark:text-neutral-100"
                          }`}
                        >
                          {item.name}
                        </h3>

                        {isDepleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800 shrink-0">
                            86'd
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-2 dark:text-neutral-400">
                        {item.description || "No description provided."}
                      </p>
                    </div>

                    {/* Live Inventory Stepper */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-neutral-500">Daily Stock</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleQuickLimitUpdate(item.id, remQty - 1)}
                            className="h-5 w-5 rounded bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            title="Decrease Remaining"
                          >
                            -
                          </button>
                          <span
                            className={`font-mono font-bold text-xs px-1 ${
                              remQty === 0
                                ? "text-red-600"
                                : remQty <= 5
                                ? "text-amber-600"
                                : "text-neutral-800 dark:text-neutral-200"
                            }`}
                          >
                            {remQty} / {dailyLimit}
                          </span>
                          <button
                            onClick={() => handleQuickLimitUpdate(item.id, remQty + 1)}
                            className="h-5 w-5 rounded bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            title="Increase Remaining"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden dark:bg-neutral-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            remQty === 0 ? "bg-red-500" : remQty <= 5 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3.5 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2 dark:border-neutral-800">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleState(item.id)}
                        className={`h-7 px-2 text-xs font-semibold ${
                          item.isAvailable
                            ? "text-neutral-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                            : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        }`}
                      >
                        {item.isAvailable ? "Force 86" : "Restock"}
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 text-neutral-500 hover:text-blue-600"
                          title="Edit Item"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmItem(item)}
                          className="h-7 w-7 text-neutral-500 hover:text-red-600"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= MODAL: ADD MENU ITEM ================= */}
      {isAddMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Add new menu item
                </h3>
                <p className="text-xs text-neutral-500">Create a dish with pricing, descriptions & inventory</p>
              </div>
              <button
                onClick={() => setIsAddMenuModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMenuItem} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Item name *
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Truffle Tagliatelle"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Handcrafted pasta ribbons tossed in black truffle cream sauce with shaved parmesan."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Price ($) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="24.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Daily Batch Limit *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    required
                    placeholder="50"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Dish Photo (Optional)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
                    className="text-xs h-9 file:mr-2 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-neutral-700 dark:file:bg-neutral-800 dark:file:text-neutral-300"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMenuModalOpen(false)}
                  className="h-8 text-xs font-medium"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Add item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT MENU ITEM ================= */}
      {isEditMenuModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Edit menu item
                </h3>
                <p className="text-xs text-neutral-500">Update item details, description, price, and stock limits</p>
              </div>
              <button
                onClick={() => setIsEditMenuModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMenuItem} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Item name *
                </label>
                <Input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    required
                    className="w-full h-9 rounded-md border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Price ($) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Daily Batch Limit
                  </label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={editDailyLimit}
                    onChange={(e) => setEditDailyLimit(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Current Remaining Stock
                  </label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={editRemainingQty}
                    onChange={(e) => setEditRemainingQty(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Replace Dish Photo (Optional)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files ? e.target.files[0] : null)}
                  className="text-xs h-9 file:mr-2 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-neutral-700 dark:file:bg-neutral-800 dark:file:text-neutral-300"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditMenuModalOpen(false)}
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

      {/* ================= MODAL: CATEGORY MANAGER ================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Menu categories
                </h3>
                <p className="text-xs text-neutral-500">Organize food and beverage groupings</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List existing categories */}
            <div className="mt-4 max-h-48 overflow-y-auto divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:border-neutral-800 dark:divide-neutral-800">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">{cat.name}</div>
                    {cat.description && (
                      <div className="text-[11px] text-neutral-500">{cat.description}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="h-7 w-7 text-neutral-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="mt-4 space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  New category name
                </label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Starters, Desserts"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="Appetizers, sides, and finger foods"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-8 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  Create category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Delete menu item
                </h3>
                <p className="text-xs text-neutral-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>"{deleteConfirmItem.name}"</strong>?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmItem(null)}
                className="h-8 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteMenuItem}
                className="h-8 text-xs font-medium"
              >
                Delete item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
