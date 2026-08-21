export interface ProductImage {
  public_url: string | null;
  thumb_r2_key?: string | null; // R2 object key for the 400px thumbnail
  thumb_url?: string | null;    // Pre-generated 400px thumbnail for grids
  is_primary: boolean;
  sort_order: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  tier: string;
  base_price: number;
  product_images: ProductImage[];
}

export interface CartItem {
  product_id: string;
  sku: string;
  name: string;
  base_price: number;
  sale_price: number;
  quantity: number;
}

export interface LastOrder {
  id: string;
  items: CartItem[];
  total: number;
  date: string;
  paymentMethod: string;
  notes: string;
}

export interface AppData {
  cart: CartItem[];
  products: Product[];
  lastOrder: LastOrder | null;
}

export const EMPTY_APP_DATA: AppData = {
  cart: [],
  products: [],
  lastOrder: null,
};
