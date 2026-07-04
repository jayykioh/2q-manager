import { useState, useEffect, useCallback } from "react";
import { AppData, EMPTY_APP_DATA } from "./types";
import { getLocalData, dispatchCartAdd, dispatchCartRemove, dispatchCartUpdatePrice, dispatchCartClear, dispatchSetLastOrder } from "./local-store";
import { fetchProductsFromSupabase } from "./supabase-store";
import { getCartTotal } from "./cart-mutations";

export const useAppData = () => {
  const [data, setData] = useState<AppData>(EMPTY_APP_DATA);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const loadData = useCallback(async () => {
    // 1. Get sync local data
    const local = getLocalData();
    
    // 2. Fetch remote products
    const products = await fetchProductsFromSupabase();
    
    setData({
      ...local,
      products, // overwrite with fresh products
    });
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    // Initial load
    loadData();

    // Event listener for in-app mutations (e.g. cart updates)
    const handleLocalSync = () => {
      // We don't necessarily want to refetch products from DB on every cart click.
      // So we just merge the latest local data into our React state.
      const local = getLocalData();
      setData((prev) => ({
        ...prev,
        cart: local.cart,
        lastOrder: local.lastOrder
      }));
    };

    // Event listener for major data changes (e.g. checkout completed)
    const handleMajorSync = () => {
      loadData(); // Re-fetches products from Supabase
    };

    window.addEventListener("2q-data-change", handleLocalSync);
    
    // Cross-tab synchronization! 
    window.addEventListener("storage", handleLocalSync);

    return () => {
      window.removeEventListener("2q-data-change", handleLocalSync);
      window.removeEventListener("storage", handleLocalSync);
    };
  }, [loadData]);

  // Derived properties helper
  const cartTotal = getCartTotal(data);

  return {
    data,
    loadingProducts,
    cartTotal,
    // Provide nice bound methods to hide dispatch details from UI
    cart: {
      addItem: dispatchCartAdd,
      removeItem: dispatchCartRemove,
      updateSalePrice: dispatchCartUpdatePrice,
      clearCart: dispatchCartClear,
    },
    setLastOrder: dispatchSetLastOrder,
    refreshProducts: loadData,
  };
};
