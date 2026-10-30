/**
 * Modelo de Producto para la gestión y persistencia en Supabase.
 */
export interface Product {
  id?: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  description?: string;
  imageUrl?: string;
  created_at?: string;
}
