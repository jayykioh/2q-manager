import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  sku: string;
  name: string;
  base_price: number;
  sale_price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  storeId: string | null;
  setStoreId: (storeId: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (product_id: string) => void;
  updateSalePrice: (product_id: string, newPrice: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      setStoreId: (storeId) => set({ storeId }),
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.product_id === item.product_id);
          if (existingItem) {
            return state; // Product is unique per piece (quantity = 1), so don't add again
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (product_id) =>
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== product_id),
        })),
      updateSalePrice: (product_id, newPrice) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.product_id === product_id ? { ...i, sale_price: newPrice } : i
          ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => get().items.reduce((sum, item) => sum + item.sale_price, 0),
    }),
    {
      name: "2q-pos-cart",
    }
  )
);
