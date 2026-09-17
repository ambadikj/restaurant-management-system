import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Play,
  Disc3,
  Radio,
  Plus,
  Minus,
  Trash2,
  Search,
  Bell,
  Receipt,
  X,
  ArrowRight,
  RefreshCw,
  Coffee,
  Flame,
  UtensilsCrossed,
  ShoppingBag,
  Timer,
  Info,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { socket } from "../../lib/socket";
import { BrandCrest } from "@/components/BrandLogo";

interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string;
  isAvailable: boolean;
  inventory?: {
    dailyLimit: number;
    remainingQty: number;
    isAvailable: boolean;
  } | null;
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  menuItems: MenuItem[];
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  price: string | number;
  subtotal: string | number;
  menuItem: MenuItem;
}

interface SessionOrder {
  id: number;
  orderNumber: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  notes?: string | null;
  orderedAt: string;
  orderItems: OrderItem[];
}

const API_BASE = "http://localhost:5000/api/customer";
const UPLOADS_BASE = "http://localhost:5000";

const QUICK_NOTES = ["Less Spicy", "No Onions", "Extra Cutlery", "Serve Fast"];

export default function CustomerMenu() {
  const [searchParams] = useSearchParams();
  const rawTable = searchParams.get("table");
  const isTakeawayParam = searchParams.get("takeaway") === "true";

  const tableIdentifier = isTakeawayParam ? "Takeaway" : rawTable || "1";

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [tableInfo, setTableInfo] = useState<any>(null);
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);
  const [sessionTotal, setSessionTotal] = useState<number>(0);

  // Navigation tabs: "menu" (Home) | "order" (Tray) | "status" (Now Playing / Queue)
  const [activeTab, setActiveTab] = useState<"menu" | "order" | "status">("menu");

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Active in-card description overlay (for horizontal carousel)
  const [activeInfoCardId, setActiveInfoCardId] = useState<number | null>(null);
  // Expanded dish ID for category list view
  const [expandedDishId, setExpandedDishId] = useState<number | null>(null);
  // Selected dish for full modal sheet
  const [selectedDishDetail, setSelectedDishDetail] = useState<MenuItem | null>(null);

  const toggleInfo = (dishId: number) => {
    setActiveInfoCardId((prev) => (prev === dishId ? null : dishId));
  };

  const toggleExpandDish = (dishId: number) => {
    setExpandedDishId((prev) => (prev === dishId ? null : dishId));
  };

  // Load menu & table info
  const loadMenuAndTable = async () => {
    try {
      setIsLoading(true);
      const [menuRes, tableRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/menu`),
        axios.get(`${API_BASE}/table/${tableIdentifier}`).catch(() => ({ data: null })),
        axios.get(`${API_BASE}/session/${tableIdentifier}`).catch(() => ({ data: { orders: [], totalAmount: 0 } })),
      ]);

      setCategories(menuRes.data || []);
      setTableInfo(tableRes?.data || null);
      if (ordersRes?.data?.orders) {
        setSessionOrders(ordersRes.data.orders);
        setSessionTotal(Number(ordersRes.data.totalAmount || 0));
      }
    } catch (err) {
      console.error("Failed to load customer menu data:", err);
      toast.error("Failed to load restaurant menu. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenuAndTable();
  }, [tableIdentifier]);

  // Socket.IO real-time setup
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      socket.emit("join:table", tableIdentifier);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (socket.connected) {
      socket.emit("join:table", tableIdentifier);
      setIsConnected(true);
    }

    // Real-time: Order placed for this table
    socket.on("order:placed", (data: any) => {
      if (data.order) {
        setSessionOrders((prev) => {
          const exists = prev.some((o) => o.id === data.order.id);
          if (exists) return prev;
          return [data.order, ...prev];
        });
      }
    });

    // Real-time: Kitchen updates order status (PENDING -> PREPARING -> READY -> SERVED)
    socket.on("order:status_update", (data: { orderId: number; status: SessionOrder["status"] }) => {
      setSessionOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status } : o))
      );
      toast(`Order status updated to ${data.status}!`, { icon: "🔔" });
    });

    // Real-time: Auto-86 / stock deduction across customer menus
    socket.on(
      "inventory:stock_update",
      (data: { menuItemId: number; remainingQty: number; isAvailable: boolean }) => {
        setCategories((prevCategories) =>
          prevCategories.map((cat) => ({
            ...cat,
            menuItems: cat.menuItems.map((dish) => {
              if (dish.id === data.menuItemId) {
                return {
                  ...dish,
                  isAvailable: data.isAvailable,
                  inventory: dish.inventory
                    ? {
                        ...dish.inventory,
                        remainingQty: data.remainingQty,
                        isAvailable: data.isAvailable,
                      }
                    : {
                        id: 0,
                        menuItemId: data.menuItemId,
                        dailyLimit: data.remainingQty,
                        remainingQty: data.remainingQty,
                        isAvailable: data.isAvailable,
                        autoResetTime: "00:00",
                        lastResetDate: new Date().toISOString(),
                      },
                };
              }
              return dish;
            }),
          }))
        );

        // Adjust cart if item ran out of stock or stock was reduced
        setCart((prevCart) =>
          prevCart
            .filter((ci) => {
              if (ci.item.id === data.menuItemId && !data.isAvailable) {
                toast.error(`"${ci.item.name}" just sold out and was removed from order tray.`);
                return false;
              }
              return true;
            })
            .map((ci) => {
              if (ci.item.id === data.menuItemId) {
                const updatedDish = {
                  ...ci.item,
                  isAvailable: data.isAvailable,
                  inventory: ci.item.inventory
                    ? {
                        ...ci.item.inventory,
                        remainingQty: data.remainingQty,
                        isAvailable: data.isAvailable,
                      }
                    : {
                        id: 0,
                        menuItemId: data.menuItemId,
                        dailyLimit: data.remainingQty,
                        remainingQty: data.remainingQty,
                        isAvailable: data.isAvailable,
                        autoResetTime: "00:00",
                        lastResetDate: new Date().toISOString(),
                      },
                };
                if (ci.quantity > data.remainingQty) {
                  toast.error(`Quantity for "${ci.item.name}" reduced to available stock (${data.remainingQty}).`);
                  return { ...ci, item: updatedDish, quantity: data.remainingQty };
                }
                return { ...ci, item: updatedDish };
              }
              return ci;
            })
        );
      }
    );

    // Real-time: Bulk inventory reset / menu item update
    socket.on("menu:bulk_reset", () => {
      loadMenuAndTable();
    });
    socket.on("menu:item_updated", () => {
      loadMenuAndTable();
    });

    // Real-time: Staff acknowledged service call
    socket.on("service:acknowledged", (data: { message: string }) => {
      toast.success(data.message || "Staff has been alerted and will arrive shortly!", {
        duration: 4000,
        icon: "🛎️",
      });
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("order:placed");
      socket.off("order:status_update");
      socket.off("inventory:stock_update");
      socket.off("menu:bulk_reset");
      socket.off("menu:item_updated");
      socket.off("service:acknowledged");
    };
  }, [tableIdentifier]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable || (item.inventory && item.inventory.remainingQty <= 0)) {
      toast.error("Sorry, this item is sold out!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      const currentQty = existing ? existing.quantity : 0;
      const maxAvailable = item.inventory ? item.inventory.remainingQty : 99;

      if (currentQty + 1 > maxAvailable) {
        toast.error(`Only ${maxAvailable} portion(s) available.`);
        return prev;
      }

      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });

    toast.success(`Added ${item.name}`, { duration: 1200 });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const nextQty = ci.quantity + delta;
            const maxAvailable = ci.item.inventory ? ci.item.inventory.remainingQty : 99;
            if (nextQty > maxAvailable) {
              toast.error(`Only ${maxAvailable} available.`);
              return ci;
            }
            return { ...ci, quantity: nextQty };
          }
          return ci;
        })
        .filter((ci) => ci.quantity > 0)
    );
  };

  const removeFromCart = (itemId: number) => {
    setCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const cartTotalItems = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, ci) => sum + Number(ci.item.price) * ci.quantity, 0),
    [cart]
  );

  const taxesAndFees = useMemo(() => cartSubtotal * 0.05, [cartSubtotal]); // 5% GST
  const grandTotal = useMemo(() => cartSubtotal + taxesAndFees, [cartSubtotal, taxesAndFees]);

  // Submit Order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    try {
      setIsSubmittingOrder(true);
      const payload = {
        tableNumber: tableIdentifier,
        items: cart.map((ci) => ({
          menuItemId: ci.item.id,
          quantity: ci.quantity,
        })),
        notes: orderNotes,
      };

      const res = await axios.post(`${API_BASE}/order`, payload);

      toast.success("🎉 Order sent to the kitchen!", {
        duration: 4000,
      });

      // Clear cart
      setCart([]);
      setOrderNotes("");

      // Add to session orders state
      if (res.data.order) {
        setSessionOrders((prev) => [res.data.order, ...prev]);
        setSessionTotal((prev) => prev + grandTotal);
      }

      // Switch directly to Status tab
      setActiveTab("status");
    } catch (err: any) {
      console.error("Order submission failed:", err);
      const msg = err.response?.data?.message || "Failed to submit order. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Call Waiter / Request Bill
  const handleServiceRequest = async (type: "CALL_WAITER" | "REQUEST_BILL") => {
    try {
      await axios.post(`${API_BASE}/service`, {
        tableNumber: tableIdentifier,
        type,
      });
      toast.success(
        type === "CALL_WAITER"
          ? "🔔 Waiter has been alerted to your table!"
          : "🧾 Final bill requested! Staff will assist you shortly.",
        { duration: 4000 }
      );
    } catch (err) {
      toast.error("Failed to notify staff. Please call a server.");
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
    if (url.startsWith("http")) return url;
    return `${UPLOADS_BASE}/${url.replace(/^\/+/, "")}`;
  };

  const getStatusBadge = (status: SessionOrder["status"]) => {
    switch (status) {
      case "PENDING":
        return {
          label: "In Queue",
          icon: "⏳",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          step: 1,
        };
      case "PREPARING":
        return {
          label: "Cooking Live",
          icon: "🍳",
          color: "bg-[#FF0000]/20 text-[#FF4D4D] border-[#FF0000]/40 animate-pulse",
          step: 2,
        };
      case "READY":
        return {
          label: "Ready to Serve",
          icon: "🔔",
          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
          step: 3,
        };
      case "SERVED":
        return {
          label: "Served",
          icon: "✨",
          color: "bg-neutral-800 text-neutral-300 border-neutral-700",
          step: 4,
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          icon: "❌",
          color: "bg-rose-500/20 text-rose-400 border-rose-500/40",
          step: 0,
        };
    }
  };

  // Filtered categories for searching
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      if (activeCategory === "ALL") return categories;
      return categories.filter((c) => c.id === activeCategory);
    }

    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        menuItems: cat.menuItems.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.menuItems.length > 0);
  }, [categories, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-['Roboto',sans-serif] antialiased pb-36 select-none selection:bg-[#FF0000] selection:text-white">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Subtle YouTube Ambient Radial Top Gradient */}
      <div className="fixed top-0 left-0 right-0 h-48 bg-gradient-to-b from-[#1F1F1F] via-[#0A0A0A] to-transparent pointer-events-none -z-10 opacity-60" />

      {/* ================= YOUTUBE MUSIC TOP APP BAR ================= */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#030303]/90 border-b border-[#1F1F1F] px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Brand with Minimal Serve_Sync Emblem */}
          <div className="flex items-center gap-2.5">
            <BrandCrest className="h-8 w-8 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-['Outfit'] font-black text-base tracking-tight text-white">
                  Serve_Sync
                </span>
                <span className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wider">
                  Dining
                </span>
              </div>
              <div className="text-[11px] text-[#AAAAAA] flex items-center gap-1 mt-0.5">
                {isTakeawayParam ? (
                  <span className="text-white font-medium">Takeaway Counter</span>
                ) : (
                  <>
                    <span className="text-white font-bold">
                      Table #{!isNaN(Number(tableIdentifier)) && Number(tableIdentifier) < 10 ? `0${tableIdentifier}` : tableIdentifier}
                    </span>
                    {tableInfo?.capacity && (
                      <span className="text-[#717171]">• {tableInfo.capacity} Seats</span>
                    )}
                  </>
                )}
                <span className="h-1 w-1 rounded-full bg-[#717171] mx-0.5" />
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${isConnected ? "text-emerald-400" : "text-[#717171]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-ping" : "bg-[#717171]"}`} />
                  {isConnected ? "LIVE" : "SYNC"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-9 w-9 rounded-full bg-[#212121] hover:bg-[#303030] text-white flex items-center justify-center active:scale-90 transition-all"
              title="Search menu"
            >
              <Search className="h-4 w-4" />
            </button>

            {!isTakeawayParam && (
              <button
                onClick={() => handleServiceRequest("CALL_WAITER")}
                className="h-9 w-9 rounded-full bg-[#212121] hover:bg-[#303030] text-white flex items-center justify-center active:scale-90 transition-all"
                title="Call waiter"
              >
                <Bell className="h-4 w-4 text-[#FF4D4D]" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Search Bar */}
        {isSearchOpen && (
          <div className="max-w-md mx-auto mt-2.5 pt-2 border-t border-[#212121] animate-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#AAAAAA]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food, starters, drinks..."
                className="w-full pl-10 pr-9 py-2 rounded-full bg-[#212121] border border-transparent focus:border-white/20 text-white text-xs placeholder-[#717171] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#AAAAAA] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-md mx-auto px-4 pt-3">
        {/* ================= TAB 1: MENU (HOME) ================= */}
        {activeTab === "menu" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* YouTube Music Horizontal Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none -mx-4 px-4">
              <button
                onClick={() => setActiveCategory("ALL")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                  activeCategory === "ALL"
                    ? "bg-white text-black shadow-sm"
                    : "bg-[#212121] text-white/90 hover:bg-[#303030] border border-white/5"
                }`}
              >
                All
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    activeCategory === cat.id
                      ? "bg-white text-black shadow-sm"
                      : "bg-[#212121] text-white/90 hover:bg-[#303030] border border-white/5"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Menu Items View */}
            {isLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-44 rounded-2xl bg-[#181818] animate-pulse"
                  />
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl bg-[#121212] border border-[#212121]">
                <Coffee className="h-10 w-10 text-[#717171] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#AAAAAA]">No dishes match your search.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("ALL");
                  }}
                  className="mt-3 text-xs text-[#FF4D4D] font-bold hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : activeCategory === "ALL" && !searchQuery ? (
              /* === ALL VIEW: YOUTUBE MUSIC HORIZONTAL ALBUM CAROUSELS === */
              <div className="space-y-7">
                {filteredCategories.map((cat) => (
                  <section key={cat.id} className="space-y-2.5">
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-['Outfit'] text-lg font-black text-white tracking-tight leading-none">
                          {cat.name}
                        </h2>
                        <span className="text-[11px] text-[#AAAAAA] mt-0.5 block">
                          Popular dishes from this section
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveCategory(cat.id)}
                        className="text-xs font-bold text-[#AAAAAA] hover:text-white px-2.5 py-1 rounded-full border border-white/10 hover:border-white/30 transition-colors"
                      >
                        MORE
                      </button>
                    </div>

                    {/* Horizontal Carousel (Album Artwork Style) */}
                    <div
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                      className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-proximity -mx-4 px-4 touch-pan-x scroll-smooth"
                    >
                      {cat.menuItems.map((dish) => {
                        const cartEntry = cart.find((ci) => ci.item.id === dish.id);
                        const isSoldOut =
                          !dish.isAvailable ||
                          (dish.inventory && dish.inventory.remainingQty <= 0);
                        const remaining = dish.inventory ? dish.inventory.remainingQty : null;
                        const isInfoOpen = activeInfoCardId === dish.id;

                        return (
                          <div
                            key={dish.id}
                            className="w-40 sm:w-44 flex-shrink-0 snap-start group"
                          >
                            {/* Square Artwork (1:1 Ratio) */}
                            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#181818] shadow-md border border-white/5">
                              <img
                                src={getImageUrl(dish.imageUrl)}
                                alt={dish.name}
                                className={`h-full w-full object-cover transition-all duration-300 ${
                                  isInfoOpen ? "scale-105 filter blur-xs" : "group-hover:scale-105"
                                }`}
                                onError={(e: any) => {
                                  e.target.src =
                                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";
                                }}
                              />

                              {/* Info ('i') Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleInfo(dish.id);
                                }}
                                className={`absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 z-20 backdrop-blur-md border cursor-pointer ${
                                  isInfoOpen
                                    ? "bg-white text-black border-white shadow-xl scale-110 rotate-90"
                                    : "bg-black/65 hover:bg-black/85 text-white/90 hover:text-white border-white/20 hover:scale-110 active:scale-95 shadow-md"
                                }`}
                                title={isInfoOpen ? "Close description" : "View description"}
                                aria-label={`View description for ${dish.name}`}
                              >
                                {isInfoOpen ? (
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                ) : (
                                  <Info className="h-3.5 w-3.5 stroke-[2.2]" />
                                )}
                              </button>

                              {/* Smooth Animated In-Card Description Overlay */}
                              <div
                                className={`absolute inset-0 bg-[#0A0A0A]/95 backdrop-blur-md p-3.5 pr-4 pb-14 flex flex-col justify-start transition-all duration-300 ease-out z-10 ${
                                  isInfoOpen
                                    ? "opacity-100 translate-y-0 pointer-events-auto"
                                    : "opacity-0 translate-y-full pointer-events-none"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 pb-2 pr-7">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D4D] animate-pulse" />
                                  <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-wider">
                                    Description
                                  </span>
                                </div>
                                <div className="overflow-y-auto scrollbar-none pr-1 max-h-[105px]">
                                  <p className="text-[11.5px] leading-relaxed text-[#EDEDED] font-normal select-text">
                                    {dish.description || "Freshly crafted to order with authentic seasonings and premium kitchen ingredients."}
                                  </p>
                                </div>
                              </div>

                              {/* Out of Stock Overlay */}
                              {isSoldOut ? (
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 text-center z-15">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FF4D4D] bg-[#212121] px-2 py-0.5 rounded border border-[#FF0000]/40">
                                    Sold Out
                                  </span>
                                </div>
                              ) : cartEntry ? (
                                /* In-Cart Counter Pill overlay */
                                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#212121]/95 backdrop-blur-md rounded-xl p-1 flex items-center justify-between border border-white/15 shadow-xl z-15">
                                  <button
                                    onClick={() => updateQuantity(dish.id, -1)}
                                    className="h-6 w-6 rounded-lg bg-[#303030] flex items-center justify-center text-white active:scale-90"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="font-['Outfit'] text-xs font-black text-white">
                                    {cartEntry.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(dish.id, 1)}
                                    className="h-6 w-6 rounded-lg bg-[#FF0000] text-white flex items-center justify-center active:scale-90 font-bold"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                /* YouTube Red Floating Play / Add Button */
                                <button
                                  onClick={() => addToCart(dish)}
                                  className="absolute bottom-2.5 right-2.5 h-10 w-10 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-xl shadow-black/60 hover:scale-110 active:scale-95 transition-all group-hover:opacity-100 z-15"
                                  title="Add to tray"
                                >
                                  <Plus className="h-5 w-5 stroke-[2.5]" />
                                </button>
                              )}

                              {/* Urgency Badge */}
                              {remaining !== null && remaining > 0 && remaining <= 5 && !isSoldOut && (
                                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-bold text-[#FF4D4D] flex items-center gap-0.5 z-15">
                                  <Flame className="h-3 w-3" />
                                  <span>{remaining} left</span>
                                </div>
                              )}
                            </div>

                            {/* Title and Metadata */}
                            <div className="mt-2 leading-tight">
                              <div className="flex items-center justify-between gap-1">
                                <h3
                                  onClick={() => toggleInfo(dish.id)}
                                  className="font-['Roboto'] text-sm font-bold text-white line-clamp-1 group-hover:text-[#FF4D4D] transition-colors cursor-pointer flex-1"
                                  title="Click to view description"
                                >
                                  {dish.name}
                                </h3>
                              </div>
                              <div className="text-xs text-[#AAAAAA] mt-0.5 flex items-center gap-1 font-medium">
                                <span className="text-white font-bold">
                                  ₹{Number(dish.price).toFixed(2)}
                                </span>
                                <span>•</span>
                                <span className="truncate">{cat.name}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* === CATEGORY FILTERED VIEW: YOUTUBE MUSIC TRACK ROW CARDS === */
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-[#AAAAAA] uppercase tracking-wider">
                    {activeCategory === "ALL" ? "Search Results" : "All Dishes"}
                  </span>
                  <span className="text-xs text-[#717171]">
                    {filteredCategories.flatMap((c) => c.menuItems).length} items
                  </span>
                </div>

                {filteredCategories.flatMap((cat) => cat.menuItems).map((dish) => {
                  const cartEntry = cart.find((ci) => ci.item.id === dish.id);
                  const isSoldOut =
                    !dish.isAvailable ||
                    (dish.inventory && dish.inventory.remainingQty <= 0);
                  const isExpanded = expandedDishId === dish.id;

                  return (
                    <div
                      key={dish.id}
                      className={`p-2.5 rounded-2xl bg-[#121212] hover:bg-[#181818] border transition-all duration-300 ${
                        isExpanded ? "border-white/20 bg-[#171717] shadow-xl" : "border-white/5"
                      } ${isSoldOut ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={getImageUrl(dish.imageUrl)}
                            alt={dish.name}
                            onClick={() => toggleExpandDish(dish.id)}
                            className="h-14 w-14 rounded-xl object-cover bg-[#212121] flex-shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                            onError={(e: any) => {
                              e.target.src =
                                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h3
                                onClick={() => toggleExpandDish(dish.id)}
                                className="text-sm font-bold text-white truncate leading-snug cursor-pointer hover:text-[#FF4D4D] transition-colors"
                              >
                                {dish.name}
                              </h3>
                              <button
                                type="button"
                                onClick={() => toggleExpandDish(dish.id)}
                                className={`h-5 w-5 rounded-full flex items-center justify-center transition-all duration-200 border shrink-0 cursor-pointer ${
                                  isExpanded
                                    ? "bg-white text-black border-white shadow-sm scale-105"
                                    : "bg-[#212121] hover:bg-[#303030] text-[#AAAAAA] hover:text-white border-white/10 active:scale-90"
                                }`}
                                title={isExpanded ? "Collapse details" : "Extend to show details"}
                              >
                                {isExpanded ? (
                                  <X className="h-2.5 w-2.5 stroke-[2.5]" />
                                ) : (
                                  <Info className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-xs text-[#AAAAAA] mt-0.5 flex items-center gap-1.5">
                              <span className="text-white font-bold">
                                ₹{Number(dish.price).toFixed(2)}
                              </span>
                              {!isExpanded && dish.description && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[160px] text-[11px] text-[#717171]">
                                    {dish.description}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Stepper / Add */}
                        <div className="flex-shrink-0">
                          {isSoldOut ? (
                            <span className="text-[10px] font-bold text-[#717171] uppercase px-2 py-1">
                              Sold Out
                            </span>
                          ) : cartEntry ? (
                            <div className="flex items-center gap-1 bg-[#212121] p-1 rounded-lg border border-white/10">
                              <button
                                onClick={() => updateQuantity(dish.id, -1)}
                                className="h-6 w-6 rounded bg-[#303030] flex items-center justify-center text-white active:scale-90"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-['Outfit'] text-xs font-bold text-white w-4 text-center">
                                {cartEntry.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(dish.id, 1)}
                                className="h-6 w-6 rounded bg-[#FF0000] text-white flex items-center justify-center active:scale-90"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(dish)}
                              className="h-9 w-9 rounded-full bg-[#212121] hover:bg-[#FF0000] text-white flex items-center justify-center active:scale-90 transition-all border border-white/10"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Smooth Extended Card Details */}
                      <div
                        className={`grid transition-all duration-300 ease-out overflow-hidden ${
                          isExpanded
                            ? "grid-rows-[1fr] opacity-100 mt-2.5 pt-2.5 border-t border-white/10"
                            : "grid-rows-[0fr] opacity-0 mt-0 pt-0"
                        }`}
                      >
                        <div className="overflow-hidden space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF4D4D] uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#FF4D4D] animate-pulse" />
                            <span>Description & Details</span>
                          </div>
                          <p className="text-xs text-[#E0E0E0] leading-relaxed font-normal">
                            {dish.description ||
                              "Freshly prepared in our kitchen using authentic spices and quality ingredients."}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: ORDER TRAY (LIBRARY / ALBUM STYLE) ================= */}
        {activeTab === "order" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Playlist Header */}
            <div className="flex items-end gap-4 p-4 rounded-2xl bg-gradient-to-b from-[#282828] to-[#121212] border border-white/5">
              <div className="h-20 w-20 rounded-xl bg-[#FF0000] flex items-center justify-center shadow-2xl flex-shrink-0">
                <Disc3 className="h-10 w-10 text-white animate-spin" style={{ animationDuration: "8s" }} />
              </div>

              <div className="leading-tight">
                <div className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wider">
                  Dine-In Session
                </div>
                <h1 className="font-['Outfit'] text-xl font-black text-white mt-1">
                  {isTakeawayParam ? "Takeaway Order" : `Table #${tableIdentifier}`}
                </h1>
                <p className="text-xs text-[#AAAAAA] mt-1">
                  {cartTotalItems} items • Total ₹{grandTotal.toFixed(2)}
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-2xl bg-[#121212] border border-white/5">
                <Disc3 className="h-12 w-12 text-[#717171] mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">Your tray is empty</h3>
                <p className="text-xs text-[#AAAAAA] max-w-xs mx-auto mt-1 mb-5">
                  Select tracks and dishes from the menu to start dining.
                </p>
                <button
                  onClick={() => setActiveTab("menu")}
                  className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold active:scale-95 transition-all"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tracklist of selected dishes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#717171] uppercase px-1 pb-1">
                    <span>Dish Selection</span>
                    <button
                      onClick={clearCart}
                      className="text-[#FF4D4D] hover:underline font-bold"
                    >
                      Clear All
                    </button>
                  </div>

                  {cart.map((ci, index) => (
                    <div
                      key={ci.item.id}
                      className="p-2.5 rounded-xl bg-[#121212] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-[#717171] w-4 text-center">
                          {index + 1}
                        </span>
                        <img
                          src={getImageUrl(ci.item.imageUrl)}
                          alt={ci.item.name}
                          className="h-12 w-12 rounded-lg object-cover bg-[#212121] flex-shrink-0"
                        />
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-white truncate">
                            {ci.item.name}
                          </h4>
                          <span className="text-xs text-[#AAAAAA] font-mono font-bold">
                            ₹{Number(ci.item.price).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 bg-[#212121] p-1 rounded-lg border border-white/10">
                          <button
                            onClick={() => updateQuantity(ci.item.id, -1)}
                            className="h-6 w-6 rounded bg-[#303030] flex items-center justify-center text-white active:scale-90"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-['Outfit'] text-xs font-bold text-white w-4 text-center">
                            {ci.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(ci.item.id, 1)}
                            className="h-6 w-6 rounded bg-[#FF0000] text-white flex items-center justify-center active:scale-90"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(ci.item.id)}
                          className="p-1.5 text-[#717171] hover:text-[#FF4D4D]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cooking Instructions */}
                <div className="p-3.5 rounded-2xl bg-[#121212] border border-white/5 space-y-2">
                  <span className="text-xs font-bold text-[#AAAAAA] block">
                    Kitchen Cooking Notes
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_NOTES.map((tag) => (
                      <button
                        key={tag}
                        onClick={() =>
                          setOrderNotes((prev) =>
                            prev ? `${prev}, ${tag}` : tag
                          )
                        }
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#212121] hover:bg-[#303030] text-[#AAAAAA] hover:text-white border border-white/5"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="e.g. Less spicy, extra sauce..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-xs text-white placeholder-[#717171] focus:outline-none focus:border-[#FF0000]"
                  />
                </div>

                {/* Bill Breakdown Card */}
                <div className="p-4 rounded-2xl bg-[#121212] border border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between text-[#AAAAAA]">
                    <span>Items Subtotal</span>
                    <span className="font-mono text-white">₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#AAAAAA]">
                    <span>Restaurant Tax & GST (5%)</span>
                    <span className="font-mono text-white">₹{taxesAndFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                    <span className="font-['Outfit'] text-sm font-black text-white">
                      Grand Total
                    </span>
                    <span className="font-['Outfit'] text-xl font-black text-[#FF4D4D]">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Big YouTube Red Action Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmittingOrder}
                  className="w-full py-4 rounded-full bg-[#FF0000] hover:bg-[#E60000] disabled:opacity-50 text-white font-['Outfit'] font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xl shadow-[#FF0000]/30"
                >
                  {isSubmittingOrder ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending Order to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white text-white" />
                      <span>Send to Kitchen (₹{grandTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: LIVE STATUS (NOW PLAYING SCREEN) ================= */}
        {activeTab === "status" && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-3">
              <div>
                <h1 className="font-['Outfit'] text-xl font-black text-white flex items-center gap-2">
                  <Radio className="h-5 w-5 text-[#FF0000]" />
                  Live Order Tracker
                </h1>
                <p className="text-xs text-[#AAAAAA] mt-0.5">
                  Table #{tableIdentifier} • Live kitchen display
                </p>
              </div>

              <button
                onClick={() => setActiveTab("menu")}
                className="text-xs font-bold text-black bg-white px-3 py-1.5 rounded-full hover:bg-neutral-200 active:scale-95 transition-all flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Dishes
              </button>
            </div>

            {sessionOrders.length === 0 ? (
              <div className="text-center py-20 px-4 rounded-2xl bg-[#121212] border border-white/5">
                <Radio className="h-12 w-12 text-[#717171] mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No active orders</h3>
                <p className="text-xs text-[#AAAAAA] max-w-xs mx-auto mt-1 mb-5">
                  You haven't dispatched any orders for Table #{tableIdentifier}.
                </p>
                <button
                  onClick={() => setActiveTab("menu")}
                  className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-bold active:scale-95 transition-all"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Now Playing Top Equalizer Hero */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-[#252525] to-[#121212] border border-white/5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#AAAAAA] uppercase tracking-wider block">
                        Table Running Total
                      </span>
                      <span className="font-['Outfit'] text-2xl font-black text-[#FF4D4D]">
                        ₹{sessionTotal.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-[#AAAAAA] block mt-0.5">
                        {sessionOrders.length} round(s) active
                      </span>
                    </div>

                    {/* Equalizer Visualizer */}
                    <div className="flex items-end gap-1 h-6 px-3 py-1 rounded-full bg-black/40 border border-white/10">
                      <span className="w-1 bg-[#FF0000] rounded-full animate-[bounce_1s_infinite_100ms] h-4" />
                      <span className="w-1 bg-[#FF0000] rounded-full animate-[bounce_1s_infinite_300ms] h-6" />
                      <span className="w-1 bg-[#FF0000] rounded-full animate-[bounce_1s_infinite_200ms] h-3" />
                      <span className="w-1 bg-[#FF0000] rounded-full animate-[bounce_1s_infinite_400ms] h-5" />
                    </div>
                  </div>

                  {!isTakeawayParam && (
                    <button
                      onClick={() => handleServiceRequest("REQUEST_BILL")}
                      className="w-full py-2.5 rounded-full bg-[#212121] hover:bg-[#303030] text-white text-xs font-bold border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Receipt className="h-4 w-4 text-[#FF4D4D]" />
                      Request Final Bill
                    </button>
                  )}
                </div>

                {/* Orders Progression (Tracklist Style) */}
                <div className="space-y-3">
                  {sessionOrders.map((order) => {
                    const badge = getStatusBadge(order.status);

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-[#121212] border border-white/5 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <div>
                            <span className="font-['Outfit'] text-xs font-black text-white">
                              #{order.orderNumber}
                            </span>
                            <span className="text-[11px] text-[#717171] ml-2">
                              {new Date(order.orderedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${badge.color}`}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </div>
                        </div>

                        {/* Scrubber / Progress timeline */}
                        {order.status !== "CANCELLED" && (
                          <div className="space-y-1 py-1">
                            <div className="h-1.5 w-full bg-[#212121] rounded-full overflow-hidden flex">
                              <div
                                className="bg-[#FF0000] transition-all duration-500 rounded-full"
                                style={{
                                  width:
                                    badge.step === 1
                                      ? "25%"
                                      : badge.step === 2
                                      ? "50%"
                                      : badge.step === 3
                                      ? "75%"
                                      : "100%",
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-[#717171] font-bold pt-0.5">
                              <span className={badge.step >= 1 ? "text-white" : ""}>Sent</span>
                              <span className={badge.step >= 2 ? "text-white" : ""}>Cooking</span>
                              <span className={badge.step >= 3 ? "text-white" : ""}>Ready</span>
                              <span className={badge.step >= 4 ? "text-white" : ""}>Served</span>
                            </div>
                          </div>
                        )}

                        {/* Items in this order */}
                        <div className="space-y-1.5 pt-1">
                          {order.orderItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2 text-[#AAAAAA]">
                                <span className="font-['Outfit'] font-black text-white">
                                  {item.quantity}×
                                </span>
                                <span>{item.menuItem?.name || "Dish"}</span>
                              </div>
                              <span className="font-mono text-white font-bold">
                                ₹{Number(item.subtotal).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="pt-2 text-[11px] text-[#AAAAAA] italic border-t border-white/5">
                            "{order.notes}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ================= YOUTUBE MUSIC SIGNATURE MINI-PLAYER BAR ================= */}
      {cart.length > 0 && activeTab === "menu" && (
        <div
          onClick={() => setActiveTab("order")}
          className="fixed bottom-16 left-3 right-3 max-w-md mx-auto z-40 cursor-pointer bg-[#212121]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 flex items-center justify-between shadow-2xl active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={getImageUrl(cart[0].item.imageUrl)}
              alt="Cart preview"
              className="h-11 w-11 rounded-xl object-cover bg-[#303030] border border-white/10 flex-shrink-0"
            />
            <div className="truncate leading-tight">
              <div className="text-xs font-bold text-white truncate">
                {cart[0].item.name} {cart.length > 1 ? `+${cart.length - 1} more` : ""}
              </div>
              <div className="text-[11px] text-[#AAAAAA] mt-0.5">
                {cartTotalItems} items in tray • ₹{cartSubtotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-9 w-9 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-md">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM NAVIGATION BAR (UNFILLED, RED ACCENT) ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A1C1E]/95 backdrop-blur-2xl border-t border-[#2D3135] pt-2 pb-3 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto px-4 flex items-center justify-around select-none">
          {/* TAB 1: MENU */}
          <button
            onClick={() => setActiveTab("menu")}
            className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform"
          >
            <div
              className={`w-12 h-7 flex items-center justify-center transition-colors duration-200 ${
                activeTab === "menu"
                  ? "text-[#FF0000]"
                  : "text-[#C4C7C5] group-hover:text-white"
              }`}
            >
              <UtensilsCrossed className={`h-5 w-5 transition-all ${activeTab === "menu" ? "stroke-[2.5] scale-110" : "stroke-[1.8]"}`} />
            </div>
            <span
              className={`text-[11px] tracking-wide mt-1 transition-colors ${
                activeTab === "menu"
                  ? "font-bold text-[#FF0000]"
                  : "font-medium text-[#8E918F]"
              }`}
            >
              Menu
            </span>
          </button>

          {/* TAB 2: ORDER TRAY */}
          <button
            onClick={() => setActiveTab("order")}
            className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="relative">
              <div
                className={`w-12 h-7 flex items-center justify-center transition-colors duration-200 ${
                  activeTab === "order"
                    ? "text-[#FF0000]"
                    : "text-[#C4C7C5] group-hover:text-white"
                }`}
              >
                <ShoppingBag className={`h-5 w-5 transition-all ${activeTab === "order" ? "stroke-[2.5] scale-110" : "stroke-[1.8]"}`} />
              </div>

              {cartTotalItems > 0 && (
                <span className="absolute -top-1 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-[#FF0000] text-white text-[10px] font-black flex items-center justify-center ring-2 ring-[#1A1C1E] animate-in zoom-in shadow-sm">
                  {cartTotalItems}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] tracking-wide mt-1 transition-colors ${
                activeTab === "order"
                  ? "font-bold text-[#FF0000]"
                  : "font-medium text-[#8E918F]"
              }`}
            >
              Order Tray
            </span>
          </button>

          {/* TAB 3: LIVE STATUS */}
          <button
            onClick={() => setActiveTab("status")}
            className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="relative">
              <div
                className={`w-12 h-7 flex items-center justify-center transition-colors duration-200 ${
                  activeTab === "status"
                    ? "text-[#FF0000]"
                    : "text-[#C4C7C5] group-hover:text-white"
                }`}
              >
                <Timer className={`h-5 w-5 transition-all ${activeTab === "status" ? "stroke-[2.5] scale-110" : "stroke-[1.8]"}`} />
              </div>

              {sessionOrders.length > 0 && (
                <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-[#FF0000] ring-2 ring-[#1A1C1E] animate-ping" />
              )}
            </div>
            <span
              className={`text-[11px] tracking-wide mt-1 transition-colors ${
                activeTab === "status"
                  ? "font-bold text-[#FF0000]"
                  : "font-medium text-[#8E918F]"
              }`}
            >
              Live Status
            </span>
          </button>
        </div>
      </nav>

      {/* ================= DISH DETAILS MODAL / BOTTOM SHEET ================= */}
      {selectedDishDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedDishDetail(null)}
        >
          <div
            className="w-full max-w-md bg-[#121212] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto sm:hidden -mt-1 mb-1" />

            {/* Header with Artwork and Close Button */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#1a1a1a] shadow-lg border border-white/10">
              <img
                src={getImageUrl(selectedDishDetail.imageUrl)}
                alt={selectedDishDetail.name}
                className="h-full w-full object-cover"
                onError={(e: any) => {
                  e.target.src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";
                }}
              />
              <button
                type="button"
                onClick={() => setSelectedDishDetail(null)}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center border border-white/20 active:scale-95 transition-all cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Stock / Availability Pill */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                {!selectedDishDetail.isAvailable ||
                (selectedDishDetail.inventory && selectedDishDetail.inventory.remainingQty <= 0) ? (
                  <span className="bg-rose-950/80 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full backdrop-blur-md">
                    Sold Out
                  </span>
                ) : selectedDishDetail.inventory &&
                  selectedDishDetail.inventory.remainingQty <= 5 ? (
                  <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                    <Flame className="h-3 w-3 text-amber-400" />
                    Only {selectedDishDetail.inventory.remainingQty} left
                  </span>
                ) : (
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md">
                    Freshly Available
                  </span>
                )}
              </div>
            </div>

            {/* Dish Title & Price */}
            <div className="flex items-start justify-between gap-3 pt-1">
              <div>
                <h2 className="font-['Outfit'] text-xl font-black text-white tracking-tight leading-snug">
                  {selectedDishDetail.name}
                </h2>
                <span className="text-xs text-[#AAAAAA] font-medium mt-0.5 block">
                  {categories.find((c) => c.id === selectedDishDetail.categoryId)?.name || "Dish"}
                </span>
              </div>
              <div className="text-right">
                <span className="font-['Outfit'] text-xl font-black text-white">
                  ₹{Number(selectedDishDetail.price).toFixed(2)}
                </span>
                <span className="text-[10px] text-[#717171] block">+ 5% GST</span>
              </div>
            </div>

            {/* Description Card */}
            <div className="p-3.5 rounded-2xl bg-[#1A1A1A] border border-white/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FF4D4D] uppercase tracking-wider">
                <Info className="h-3.5 w-3.5" />
                <span>Description & Preparation</span>
              </div>
              <p className="text-xs text-[#CCCCCC] leading-relaxed font-normal">
                {selectedDishDetail.description ||
                  "Prepared freshly to order in our kitchen using authentic recipes, signature seasoning, and quality ingredients."}
              </p>
            </div>

            {/* Action Footer */}
            <div className="pt-2">
              {(() => {
                const cartEntry = cart.find((ci) => ci.item.id === selectedDishDetail.id);
                const isSoldOut =
                  !selectedDishDetail.isAvailable ||
                  (selectedDishDetail.inventory && selectedDishDetail.inventory.remainingQty <= 0);

                if (isSoldOut) {
                  return (
                    <button
                      disabled
                      className="w-full py-3 rounded-2xl bg-[#212121] text-[#717171] text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-white/5"
                    >
                      Item Sold Out
                    </button>
                  );
                }

                if (cartEntry) {
                  return (
                    <div className="flex items-center justify-between p-2 rounded-2xl bg-[#212121] border border-white/10">
                      <div className="flex items-center gap-2 pl-2">
                        <span className="text-xs text-[#AAAAAA]">In your tray:</span>
                        <span className="font-['Outfit'] text-sm font-black text-white">
                          {cartEntry.quantity} portion(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(selectedDishDetail.id, -1)}
                          className="h-8 w-8 rounded-xl bg-[#303030] flex items-center justify-center text-white active:scale-90 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-['Outfit'] text-sm font-black text-white w-5 text-center">
                          {cartEntry.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(selectedDishDetail.id, 1)}
                          className="h-8 w-8 rounded-xl bg-[#FF0000] text-white flex items-center justify-center active:scale-90 font-bold cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(selectedDishDetail);
                    }}
                    className="w-full py-3 rounded-2xl bg-[#FF0000] hover:bg-[#D90000] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-red-600/30 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Add to Tray • ₹{Number(selectedDishDetail.price).toFixed(2)}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
