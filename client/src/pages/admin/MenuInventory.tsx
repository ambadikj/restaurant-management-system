import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { socket } from "../../lib/socket";
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
  Flame,
  Minus,
  Plus,
  Sparkles,
  Layers,
  RotateCcw,
} from "lucide-react";

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

    const handleStockUpdate = (data: { menuItemId: number; remainingQty: number; isAvailable: boolean }) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === data.menuItemId) {
            return {
              ...item,
              isAvailable: data.isAvailable,
              inventory: item.inventory
                ? { ...item.inventory, remainingQty: data.remainingQty }
                : { remainingQty: data.remainingQty, dailyLimit: data.remainingQty },
            };
          }
          return item;
        })
      );
    };

    const handleItemUpdated = (updatedItem: any) => {
      setItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
      );
    };

    const handleItemCreated = (newItem: any) => {
      setItems((prev) => {
        if (prev.some((i) => i.id === newItem.id)) return prev;
        return [...prev, newItem];
      });
    };

    const handleItemDeleted = ({ id }: { id: number }) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const handleCategoryCreated = (newCat: any) => {
      setCategories((prev) => {
        if (prev.some((c) => c.id === newCat.id)) return prev;
        return [...prev, newCat];
      });
    };

    const handleCategoryDeleted = ({ id }: { id: number }) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    };

    const handleBulkReset = (resetItems: any[]) => {
      setItems(resetItems);
    };

    socket.on("inventory:stock_update", handleStockUpdate);
    socket.on("menu:item_updated", handleItemUpdated);
    socket.on("menu:item_created", handleItemCreated);
    socket.on("menu:item_deleted", handleItemDeleted);
    socket.on("category:created", handleCategoryCreated);
    socket.on("category:deleted", handleCategoryDeleted);
    socket.on("menu:bulk_reset", handleBulkReset);

    return () => {
      socket.off("inventory:stock_update", handleStockUpdate);
      socket.off("menu:item_updated", handleItemUpdated);
      socket.off("menu:item_created", handleItemCreated);
      socket.off("menu:item_deleted", handleItemDeleted);
      socket.off("category:created", handleCategoryCreated);
      socket.off("category:deleted", handleCategoryDeleted);
      socket.off("menu:bulk_reset", handleBulkReset);
    };
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
    const isNowAvailable = newQty > 0;
    // Optimistic update
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              isAvailable: isNowAvailable,
              inventory: it.inventory
                ? { ...it.inventory, remainingQty: newQty }
                : { remainingQty: newQty, dailyLimit: newQty },
            }
          : it
      )
    );
    try {
      await axiosInstance.patch(`/menu/items/${itemId}/inventory`, {
        remainingQty: newQty,
      });
      showNotification(isNowAvailable ? `Stock limit updated (${newQty})` : "Item marked Out of Stock (86'd)");
    } catch (err) {
      alert("Error updating inventory quantity");
      fetchData(false);
    }
  };

  const handleToggleState = async (itemId: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const willBeAvailable = !item.isAvailable;
    const newQty = willBeAvailable
      ? (item.inventory?.dailyLimit && item.inventory.dailyLimit > 0 ? item.inventory.dailyLimit : 20)
      : 0;

    // Optimistic toggle
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              isAvailable: willBeAvailable,
              inventory: it.inventory
                ? { ...it.inventory, remainingQty: newQty }
                : { remainingQty: newQty, dailyLimit: newQty },
            }
          : it
      )
    );
    try {
      await axiosInstance.patch(`/menu/items/${itemId}/status`);
      showNotification(willBeAvailable ? `"${item.name}" restocked (${newQty} portions)!` : `"${item.name}" 86'd (Unavailable)`);
      fetchData(false);
    } catch (err) {
      // Revert optimistic update on error
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, isAvailable: item.isAvailable } : it))
      );
      alert("Error toggling item availability");
    }
  };

  const handleResetAllInventory = async () => {
    if (!confirm("Reset all dishes to their daily batch limits and mark all active on menu?")) return;
    try {
      const res = await axiosInstance.post("/menu/inventory/reset-all");
      if (res.data.items) {
        setItems(res.data.items);
      }
      showNotification("All inventory batches reset to daily limits!");
    } catch (err) {
      alert("Error resetting daily inventory");
      fetchData(false);
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

  const totalDishes = items.length;
  const activeDishes = items.filter(
    (i) => i.isAvailable && (!i.inventory || i.inventory.remainingQty > 0)
  ).length;
  const depletedDishes = items.filter(
    (i) => !i.isAvailable || (i.inventory && i.inventory.remainingQty === 0)
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Toast Notification - Apple Music Glass Toast */}
      {successMsg && (
        <div className="fixed top-18 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1c1c1e]/90 border border-white/[0.12] backdrop-blur-2xl px-5 py-3 text-xs font-medium text-white shadow-2xl shadow-[#FA2D48]/10 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-[#FA2D48]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header Bar - Apple Music Editorial Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.07] via-white/[0.02] to-transparent border border-white/[0.09] p-6 sm:p-7 backdrop-blur-2xl shadow-2xl">
        {/* Apple Music Signature Ambient Bloom Halos */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#FA2D48]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            {/* Apple Music Editorial Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 text-[11px] font-semibold text-neutral-300 backdrop-blur-md">
              <Flame className="h-3 w-3 text-[#FA2D48] fill-[#FA2D48]" />
              <span className="tracking-widest uppercase text-[10px] font-bold text-white/90">
                Catalog & Kitchen Limits
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Menu & Auto-86 Inventory
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl font-normal leading-relaxed">
              Configure live price tags, dish artwork, batch limits, and real-time out-of-stock triggers.
            </p>
          </div>

          {/* Action Pills */}
          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleResetAllInventory}
              title="Restock all dishes back to their maximum daily limits"
              className="flex items-center gap-2 rounded-full px-4.5 py-2.5 text-xs font-semibold bg-white/[0.08] hover:bg-emerald-500/20 text-neutral-200 hover:text-emerald-300 border border-white/[0.12] hover:border-emerald-500/30 backdrop-blur-xl shadow-sm transition-all active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
              <span>Reset Daily Batches</span>
            </button>

            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 rounded-full px-4.5 py-2.5 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-neutral-200 hover:text-white border border-white/[0.12] backdrop-blur-xl shadow-sm transition-all active:scale-95"
            >
              <FolderPlus className="h-4 w-4 text-neutral-400" />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              onClick={() => setIsAddMenuModalOpen(true)}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold bg-[#FA2D48] hover:bg-[#ff3b56] text-white shadow-lg shadow-[#FA2D48]/30 transition-all active:scale-95 hover:scale-[1.02]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Dish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stat Summary Row (Apple Music Acrylic Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Dishes */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-[#161619]/90 border border-white/[0.09] hover:border-white/[0.2] p-4.5 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Total Dishes
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-neutral-300">
              <UtensilsCrossed className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-sans">
              {totalDishes}
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">Items</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
            <span>Master Catalog</span>
          </div>
        </div>

        {/* Card 2: Active on Menu */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-500/[0.08] via-white/[0.03] to-[#161619]/90 border border-emerald-500/20 hover:border-emerald-500/40 p-4.5 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Active on Menu
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight font-sans">
              {activeDishes}
            </span>
            <span className="text-[11px] text-emerald-400/80 font-medium">Live</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/90 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>Orderable Now</span>
          </div>
        </div>

        {/* Card 3: 86'd Depleted */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#FA2D48]/[0.08] via-white/[0.03] to-[#161619]/90 border border-[#FA2D48]/20 hover:border-[#FA2D48]/40 p-4.5 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-[#FA2D48]/10 blur-2xl group-hover:bg-[#FA2D48]/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#FA2D48] uppercase tracking-wider">
              86'd (Depleted)
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FA2D48]/15 border border-[#FA2D48]/30 text-[#FA2D48]">
              <Flame className="h-3.5 w-3.5 fill-[#FA2D48]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#FA2D48] tracking-tight font-sans">
              {depletedDishes}
            </span>
            <span className="text-[11px] text-[#FA2D48]/80 font-medium">Sold Out</span>
          </div>
          <div className="mt-2 text-[11px] text-[#FA2D48]/90 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FA2D48]"></span>
            <span>Auto Sold-Out Trigger</span>
          </div>
        </div>

        {/* Card 4: Categories */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-[#161619]/90 border border-white/[0.09] hover:border-white/[0.2] p-4.5 backdrop-blur-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5">
          <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl group-hover:bg-violet-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Categories
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-neutral-300">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-sans">
              {categories.length}
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">Sections</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
            <span>Kitchen Sections</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar - Apple Music Pill Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Apple Music Pill Capsule Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              activeCategoryFilter === "ALL"
                ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
            }`}
          >
            <span>All Dishes</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeCategoryFilter === "ALL" ? "bg-white/20 text-white" : "bg-white/[0.08] text-neutral-400"
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
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? "bg-[#FA2D48] text-white shadow-md shadow-[#FA2D48]/30"
                    : "bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 hover:text-white border border-white/[0.08]"
                }`}
              >
                <span>{cat.name}</span>
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

        {/* Search Bar - Apple Music Pill Style */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search dishes, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-8 text-xs rounded-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.1] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] transition-all focus:outline-none"
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

      {/* ================= VIEW: APPLE MUSIC ALBUM-CARD GRID ================= */}
      {loading ? (
        <div className="py-24 text-center text-xs text-neutral-500 font-mono">
          Loading restaurant menu catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredItems.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/[0.08] bg-[#1c1c1f]/60 p-12 text-center text-neutral-400 text-xs backdrop-blur-xl">
              No menu items found matching the selected category or search filter.
            </div>
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
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#1c1c1f]/80 hover:bg-[#232328] border transition-all duration-300 backdrop-blur-xl hover:shadow-2xl hover:shadow-[#FA2D48]/5 ${
                    isDepleted
                      ? "border-red-500/30 opacity-80"
                      : "border-white/[0.08] hover:border-white/[0.2]"
                  }`}
                >
                  {/* Apple Music Album Tile Artwork */}
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-neutral-900">
                    {item.imageUrl && !item.imageUrl.includes("default-food.png") ? (
                      <img
                        src={`http://localhost:5000/${item.imageUrl}`}
                        alt={item.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-500">
                        <UtensilsCrossed className="h-10 w-10 opacity-30" />
                      </div>
                    )}

                    {/* Gradient Overlay Vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Category Pill Tag */}
                    <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-neutral-200 uppercase tracking-wider border border-white/[0.1]">
                      {item.category.name}
                    </span>

                    {/* Price Pill Tag */}
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-xs font-mono font-extrabold text-white border border-white/[0.15] shadow-lg">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>

                  {/* Details Container */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      {/* Name & Availability Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`font-bold text-sm tracking-tight line-clamp-1 ${
                            isDepleted ? "text-neutral-400 line-through" : "text-white"
                          }`}
                        >
                          {item.name}
                        </h3>

                        {isDepleted ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30 shrink-0">
                            86'd
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                        {item.description || "No description provided."}
                      </p>
                    </div>

                    {/* Live Auto-86 Inventory Stepper & Progress */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-neutral-400">
                          Daily Stock
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickLimitUpdate(item.id, remQty - 1)}
                            className="h-5 w-5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                            title="Decrease Limit"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span
                            className={`font-mono font-bold text-xs px-1 ${
                              remQty === 0
                                ? "text-[#FA2D48]"
                                : remQty <= 5
                                ? "text-amber-400"
                                : "text-neutral-200"
                            }`}
                          >
                            {remQty} / {dailyLimit}
                          </span>
                          <button
                            onClick={() => handleQuickLimitUpdate(item.id, remQty + 1)}
                            className="h-5 w-5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                            title="Increase Limit"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Apple Style Stock Meter */}
                      <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            remQty === 0
                              ? "bg-[#FA2D48]"
                              : remQty <= 5
                              ? "bg-amber-400"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleState(item.id)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                          item.isAvailable
                            ? "bg-white/[0.06] hover:bg-[#FA2D48]/20 text-neutral-300 hover:text-[#FA2D48] border border-white/[0.08]"
                            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                        }`}
                      >
                        {item.isAvailable ? "Force 86" : "Restock"}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                          title="Edit Dish"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmItem(item)}
                          className="h-7 w-7 rounded-full bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center text-neutral-400 hover:text-red-400 transition-colors"
                          title="Delete Dish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Add New Dish</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Set pricing, description, category, and Auto-86 depletion limits
                </p>
              </div>
              <button
                onClick={() => setIsAddMenuModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMenuItem} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Truffle Tagliatelle"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Handcrafted pasta ribbons tossed in black truffle cream sauce with shaved parmesan."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs rounded-xl bg-[#222226] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="24.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Daily Batch Limit *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="50"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Dish Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
                    className="w-full h-10 text-xs text-neutral-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddMenuModalOpen(false)}
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full px-6 py-2 text-xs font-semibold bg-gradient-to-r from-[#FA2D48] to-[#FF4565] text-white shadow-lg shadow-[#FA2D48]/30 hover:opacity-95 transition-all"
                >
                  Create Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT MENU ITEM ================= */}
      {isEditMenuModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Edit Menu Item</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Update dish details, price, and current stock count
                </p>
              </div>
              <button
                onClick={() => setIsEditMenuModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMenuItem} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs rounded-xl bg-[#222226] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Daily Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editDailyLimit}
                    onChange={(e) => setEditDailyLimit(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Current Remaining Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editRemainingQty}
                    onChange={(e) => setEditRemainingQty(e.target.value)}
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl bg-white/[0.06] text-white border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Replace Dish Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files ? e.target.files[0] : null)}
                  className="w-full h-10 text-xs text-neutral-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/[0.08] file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-white cursor-pointer"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEditMenuModalOpen(false)}
                  className="rounded-full px-5 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full px-6 py-2 text-xs font-semibold bg-gradient-to-r from-[#FA2D48] to-[#FF4565] text-white shadow-lg shadow-[#FA2D48]/30 hover:opacity-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CATEGORY MANAGER ================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Categories</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Organize food, beverage, and kitchen sections
                </p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List existing categories */}
            <div className="mt-4 max-h-52 overflow-y-auto divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 text-xs hover:bg-white/[0.04] transition-colors"
                >
                  <div>
                    <div className="font-semibold text-white">{cat.name}</div>
                    {cat.description && (
                      <div className="text-[11px] text-neutral-400 mt-0.5">{cat.description}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="h-7 w-7 rounded-full bg-white/[0.06] hover:bg-red-500/20 flex items-center justify-center text-neutral-400 hover:text-red-400 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="mt-4 space-y-3.5 border-t border-white/[0.08] pt-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  New Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starters, Signature Desserts"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Description <span className="text-neutral-500 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Appetizers, sides, and finger foods"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-white/[0.06] text-white placeholder:text-neutral-500 border border-white/[0.1] focus:border-[#FA2D48] focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-9 rounded-full text-xs font-semibold bg-gradient-to-r from-[#FA2D48] to-[#FF4565] text-white shadow-lg shadow-[#FA2D48]/25 hover:opacity-95 transition-all"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/[0.12] bg-[#1a1a1d]/95 p-6 shadow-2xl text-white backdrop-blur-3xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[#FA2D48] border border-red-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Delete Dish</h3>
                <p className="text-xs text-neutral-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">"{deleteConfirmItem.name}"</strong> from the restaurant
              catalog?
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="rounded-full px-4 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMenuItem}
                className="rounded-full px-5 py-2 text-xs font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-600/30 hover:opacity-95 transition-all"
              >
                Delete Dish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
