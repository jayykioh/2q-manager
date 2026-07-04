import { AppData, EMPTY_APP_DATA, CartItem, LastOrder } from "./types";
import { addCartItem, clearCart, removeCartItem, updateCartItemPrice } from "./cart-mutations";

const STORAGE_KEY = "2q_app_data";
const EVENT_NAME = "2q-data-change";

export const getLocalData = (): AppData => {
  if (typeof window === "undefined") return EMPTY_APP_DATA;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return EMPTY_APP_DATA;
  try {
    return JSON.parse(stored) as AppData;
  } catch {
    return EMPTY_APP_DATA;
  }
};

const setLocalData = (data: AppData) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const dispatchCartAdd = (item: CartItem) => {
  const data = getLocalData();
  const nextData = addCartItem(data, item);
  setLocalData(nextData);
};

export const dispatchCartRemove = (productId: string) => {
  const data = getLocalData();
  const nextData = removeCartItem(data, productId);
  setLocalData(nextData);
};

export const dispatchCartUpdatePrice = (productId: string, newPrice: number) => {
  const data = getLocalData();
  const nextData = updateCartItemPrice(data, productId, newPrice);
  setLocalData(nextData);
};

export const dispatchCartClear = () => {
  const data = getLocalData();
  const nextData = clearCart(data);
  setLocalData(nextData);
};

export const dispatchSetLastOrder = (lastOrder: LastOrder | null) => {
  const data = getLocalData();
  setLocalData({ ...data, lastOrder });
};

// Generic trigger for other updates (like fetching products)
export const dispatchDataChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};
