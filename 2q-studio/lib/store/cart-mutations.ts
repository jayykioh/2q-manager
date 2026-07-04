import { AppData, CartItem } from "./types";

export const addCartItem = (data: AppData, item: CartItem): AppData => {
  const existingItem = data.cart.find((i) => i.product_id === item.product_id);
  if (existingItem) {
    return data; // Unique per piece
  }
  return { ...data, cart: [...data.cart, item] };
};

export const removeCartItem = (data: AppData, productId: string): AppData => {
  return { ...data, cart: data.cart.filter((i) => i.product_id !== productId) };
};

export const updateCartItemPrice = (data: AppData, productId: string, newPrice: number): AppData => {
  return {
    ...data,
    cart: data.cart.map((i) =>
      i.product_id === productId ? { ...i, sale_price: newPrice } : i
    ),
  };
};

export const clearCart = (data: AppData): AppData => {
  return { ...data, cart: [] };
};

export const getCartTotal = (data: AppData): number => {
  return data.cart.reduce((sum, item) => sum + item.sale_price, 0);
};
