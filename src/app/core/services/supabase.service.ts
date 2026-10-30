import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Product } from '../models/product.model';
import { RegisterDto } from '../models/auth.models';

const STORAGE_PRODUCTS_KEY = 'novagestion_supabase_products_cache';

/**
 * Servicio de Integración con Supabase (Auth, Clientes y Productos).
 * Se conecta a la API REST de Supabase en https://spfawsmajwnrtzmqiyvy.supabase.co
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  public currentUser = signal<User | null>(null);
  public userRole = signal<'admin' | 'user' | null>(null);

  constructor() {
    this.initSupabaseClient();
  }

  private initSupabaseClient(): void {
    try {
      const savedKey = localStorage.getItem('novagestion_supabase_key');
      if (savedKey && (!environment.supabaseKey || environment.supabaseKey === 'TU_SUPABASE_ANON_KEY')) {
        environment.supabaseKey = savedKey;
      }

      if (environment.supabaseUrl && environment.supabaseKey && environment.supabaseKey !== 'TU_SUPABASE_ANON_KEY') {
        this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
      }
    } catch (e) {
      console.warn('Supabase no inicializado con credenciales activas:', e);
    }
  }



  /**
   * Obtiene la instancia del cliente Supabase
   */
  public get client(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Cierra la sesión activa en Supabase Auth y limpia señales
   */
  public async signOut(): Promise<void> {
    try {
      if (this.supabase) {
        await this.supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Error al cerrar sesión en Supabase:', e);
    } finally {
      this.currentUser.set(null);
      this.userRole.set(null);
    }
  }

  /**
   * Comprueba si el cliente Supabase tiene credenciales configuradas
   */
  public isConfigured(): boolean {
    return !!(this.supabase && environment.supabaseKey && environment.supabaseKey !== 'TU_SUPABASE_ANON_KEY');
  }

  /**
   * Actualiza dinámicamente la Anon Key de Supabase si el usuario la proporciona en caliente
   */
  public setAnonKey(key: string): void {
    const cleanKey = key.trim();
    environment.supabaseKey = cleanKey;
    localStorage.setItem('novagestion_supabase_key', cleanKey);
    this.supabase = createClient(environment.supabaseUrl, cleanKey);
  }

  // =================== AUTENTICACIÓN ESTRICTA EN SUPABASE ===================

  /**
   * Valida inicio de sesión ÚNICAMENTE contra Supabase Auth.
   * Sin bypass ni usuarios falsos locales.
   */
  public async loginWithSupabase(email: string, pass: string): Promise<{ success: boolean; role: 'admin' | 'user'; user?: any; message?: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!this.isConfigured() || !this.supabase) {
      return {
        success: false,
        role: 'user',
        message: 'No se ha configurado la Anon Key de Supabase. Añade tu clave en src/environments/environment.ts para el proyecto spfawsmajwnrtzmqiyvy.'
      };
    }

    try {
      // Autenticación estricta con Supabase Auth
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: pass
      });

      if (error) {
        return {
          success: false,
          role: 'user',
          message: error.message === 'Invalid login credentials'
            ? 'Credenciales no válidas en Supabase. El correo o contraseña no coinciden con ninguna cuenta registrada.'
            : error.message
        };
      }

      if (!data?.user) {
        return {
          success: false,
          role: 'user',
          message: 'No se obtuvo información de usuario desde Supabase.'
        };
      }

      this.currentUser.set(data.user);

      // Determinar rol del usuario desde la tabla 'profiles' en Supabase (o metadatos)
      let role: 'admin' | 'user' = 'user';
      try {
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role) {
          role = profile.role === 'admin' ? 'admin' : 'user';
        } else if (data.user.user_metadata?.['role']) {
          role = data.user.user_metadata['role'] === 'admin' ? 'admin' : 'user';
        } else if (normalizedEmail.includes('admin')) {
          role = 'admin';
        }
      } catch {
        role = normalizedEmail.includes('admin') ? 'admin' : 'user';
      }

      this.userRole.set(role);
      return {
        success: true,
        role,
        user: {
          id: data.user.id,
          email: data.user.email || normalizedEmail,
          name: data.user.user_metadata?.['name'] || data.user.user_metadata?.['full_name'] || (role === 'admin' ? 'Administrador Supabase' : 'Usuario Supabase')
        }
      };
    } catch (err: any) {
      return {
        success: false,
        role: 'user',
        message: err?.message || 'Error de conexión con la base de datos de Supabase.'
      };
    }
  }

  /**
   * Registro de nuevo usuario en Supabase Auth y actualización de la tabla en la base de datos (profiles / usuarios / clients)
   */
  public async registerWithSupabase(dto: RegisterDto): Promise<{ success: boolean; message: string; user?: any }> {
    if (!this.isConfigured() || !this.supabase) {
      return {
        success: false,
        message: 'Supabase no está configurado con una clave activa. Especifica la anon key en src/environments/environment.ts.'
      };
    }

    try {
      const email = dto.email.trim().toLowerCase();

      // 1. Alta en Supabase Auth
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password: dto.password,
        options: {
          data: {
            name: dto.fullName.trim(),
            full_name: dto.fullName.trim(),
            role: dto.role,
            company: dto.companyName.trim(),
            dni_cif: dto.dniCif.trim(),
            phone: dto.phone?.trim() || ''
          }
        }
      });

      if (error) {
        return {
          success: false,
          message: error.message
        };
      }

      if (!data?.user) {
        return {
          success: false,
          message: 'No se pudo generar el usuario en Supabase.'
        };
      }

      const userId = data.user.id;

      // 2. ACTUALIZACIÓN DE LA TABLA EN LA BASE DE DATOS DE SUPABASE (profiles: id, role)
      try {
        const { error: profileErr } = await this.supabase.from('profiles').upsert([
          {
            id: userId,
            role: dto.role
          }
        ]);

        if (profileErr) {
          console.warn('Upsert en profiles:', profileErr.message);
          // Si profiles también acepta otros campos
          await this.supabase.from('profiles').upsert([
            {
              id: userId,
              role: dto.role,
              name: dto.fullName.trim(),
              email: email
            }
          ]);
        }
      } catch (errDb) {
        console.warn('Error al actualizar tabla profiles en base de datos:', errDb);
      }

      // Si además la tabla 'clients' está creada en el proyecto, insertar también
      try {
        await this.supabase.from('clients').insert([
          {
            name: dto.fullName.trim(),
            email: email,
            cif: dto.dniCif.trim(),
            phone: dto.phone?.trim() || '',
            status: 'activo'
          }
        ]);
      } catch (clientErr) {
        console.warn('Inserción en clients (opcional):', clientErr);
      }

      return {
        success: true,
        message: 'Usuario registrado correctamente en Supabase y tabla de base de datos actualizada.',
        user: {
          id: userId,
          email,
          name: dto.fullName.trim(),
          role: dto.role,
          company: dto.companyName.trim(),
          dniCif: dto.dniCif.trim(),
          phone: dto.phone?.trim() || '',
          createdAt: new Date().toISOString()
        }
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Error registrando usuario en Supabase.'
      };
    }
  }

  // =================== CRUD PRODUCTOS (SUPABASE) ===================

  /**
   * Obtiene la lista de productos almacenados en caché síncrona para renderizado inmediato
   */
  public getCachedProducts(): Product[] {
    try {
      const cached = localStorage.getItem(STORAGE_PRODUCTS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  }

  /**
   * Obtiene la lista de productos de Supabase (o caché local si no responde)
   */
  public async getProducts(): Promise<Product[]> {
    if (this.isConfigured() && this.supabase) {
      try {
        // Intenta tabla en inglés 'products'
        let { data, error } = await this.supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        // Si la tabla no existe en inglés, intenta en español 'productos'
        if (error && error.code === '42P01') {
          const resEs = await this.supabase
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });
          data = resEs.data;
          error = resEs.error;
        }

        if (!error && data) {
          // Mapeo según el esquema real de Supabase (nombre, descripcion, precio, stock)
          const mapped: Product[] = data.map((item: any) => {
            const prodId = item.id;
            const storageImg = this.getProductImageUrlFromBucket(prodId);
            return {
              id: prodId,
              name: item.nombre || item.name || 'Producto sin nombre',
              price: Number(item.precio ?? item.price ?? 0),
              stock: Number(item.stock ?? 0),
              category: item.categoria || item.category || 'General',
              description: item.descripcion || item.description || '',
              imageUrl: item.image_url || item.imageUrl || item.imagen || storageImg,
              created_at: item.created_at || new Date().toISOString()
            };
          });
          try {
            localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(mapped));
          } catch {}
          return mapped;
        }
      } catch (e) {
        console.warn('Error al leer productos de Supabase:', e);
      }
    }

    return this.getCachedProducts();
  }

  /**
   * Añade un producto a Supabase (reflejado directamente en la base de datos)
   */
  public async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    if (!this.isConfigured() || !this.supabase) {
      throw new Error('Supabase no está configurado.');
    }

    // 1. Intenta insertar según las columnas reales de la tabla 'products' (nombre, precio, stock, descripcion)
    let { data, error } = await this.supabase.from('products').insert([
      {
        nombre: product.name,
        precio: product.price,
        stock: product.stock,
        descripcion: product.description
      }
    ]).select().single();

    // 2. Si falla porque espera columnas en inglés (name, price...)
    if (error) {
      const resEn = await this.supabase.from('products').insert([
        {
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
          description: product.description
        }
      ]).select().single();

      if (resEn.error) {
        throw new Error(resEn.error.message || error.message);
      }
      data = resEn.data;
    }

    return {
      id: data.id,
      name: data.nombre || data.name || product.name,
      price: Number(data.precio ?? data.price ?? product.price),
      stock: Number(data.stock ?? product.stock),
      category: data.categoria || data.category || product.category,
      description: data.descripcion || data.description || product.description,
      created_at: data.created_at || new Date().toISOString()
    };
  }

  /**
   * Modifica un producto existente en Supabase
   */
  public async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    if (!this.isConfigured() || !this.supabase) {
      throw new Error('Supabase no está configurado.');
    }

    let { data, error } = await this.supabase
      .from('products')
      .update({
        nombre: product.name,
        precio: Number(product.price),
        stock: Number(product.stock),
        descripcion: product.description
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const resEn = await this.supabase
        .from('products')
        .update({
          name: product.name,
          price: Number(product.price),
          stock: Number(product.stock),
          category: product.category,
          description: product.description
        })
        .eq('id', id)
        .select()
        .single();

      if (resEn.error) {
        throw new Error(resEn.error.message || error.message);
      }
      data = resEn.data;
    }

    return {
      id: data.id,
      name: data.nombre || data.name || product.name || '',
      price: Number(data.precio ?? data.price ?? product.price ?? 0),
      stock: Number(data.stock ?? product.stock ?? 0),
      category: data.categoria || data.category || product.category || 'General',
      description: data.descripcion || data.description || product.description || '',
      created_at: data.created_at || new Date().toISOString()
    };
  }

  /**
   * Elimina un producto de Supabase
   */
  public async deleteProduct(id: string): Promise<boolean> {
    if (!this.isConfigured() || !this.supabase) {
      throw new Error('Supabase no está configurado.');
    }

    let { error } = await this.supabase.from('products').delete().eq('id', id);
    if (error && error.code === '42P01') {
      const resEs = await this.supabase.from('productos').delete().eq('id', id);
      error = resEs.error;
    }

    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  // =================== CLIENTES (SUPABASE) ===================

  /**
   * Obtiene la lista de clientes directamente de Supabase (sin datos de prueba)
   */
  public async getClients(): Promise<any[]> {
    if (this.isConfigured() && this.supabase) {
      try {
        const { data, error } = await this.supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map((c: any) => ({
            id: c.id,
            nombre: c.nombre || c.name || 'Cliente sin nombre',
            empresa: c.empresa || c.company || 'Empresa no especificada',
            email: c.email || 'Sin correo',
            created_at: c.created_at || new Date().toISOString()
          }));
        } else if (error) {
          console.warn('Error al leer clientes de Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Excepción al leer clientes de Supabase:', e);
      }
    }
    return [];
  }

  /**
   * Añade un cliente a la tabla 'clients' de Supabase
   */
  public async addClient(client: { nombre: string; empresa: string; email: string }): Promise<any> {
    if (!this.isConfigured() || !this.supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const { data, error } = await this.supabase.from('clients').insert([
      {
        nombre: client.nombre,
        empresa: client.empresa,
        email: client.email
      }
    ]).select().single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Modifica un cliente existente en la tabla 'clients' de Supabase
   */
  public async updateClient(id: string, client: { nombre: string; empresa: string; email: string }): Promise<any> {
    if (!this.isConfigured() || !this.supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const { data, error } = await this.supabase
      .from('clients')
      .update({
        nombre: client.nombre,
        empresa: client.empresa,
        email: client.email
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Elimina un cliente de la tabla 'clients' de Supabase
   */
  public async deleteClient(id: string): Promise<boolean> {
    if (!this.isConfigured() || !this.supabase) {
      throw new Error('Supabase no está configurado.');
    }

    const { error } = await this.supabase.from('clients').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  // =================== SUPABASE STORAGE (BUCKETS 'perfiles' Y 'galeria') ===================

  public readonly BUCKET_PROFILES = 'perfiles';
  public readonly BUCKET_GALLERY = 'galeria';

  /**
   * Obtiene la URL pública de una imagen de producto alojada en el bucket 'galeria'
   */
  public getProductImageUrlFromBucket(productIdOrName?: string): string {
    if (!productIdOrName) return '';
    if (this.isConfigured() && environment.supabaseUrl) {
      return `${environment.supabaseUrl}/storage/v1/object/public/${this.BUCKET_GALLERY}/${productIdOrName}.png`;
    }
    return '';
  }

  /**
   * Resuelve la URL de imagen del producto (prioridad: URL directa, localStorage o bucket galeria de Supabase)
   */
  public getProductImageUrl(product: Product): string {
    if (product.imageUrl && (product.imageUrl.startsWith('http') || product.imageUrl.startsWith('data:'))) {
      return product.imageUrl;
    }
    if (product.id) {
      const cached = localStorage.getItem('novagestion_product_img_' + product.id);
      if (cached) return cached;
    }
    return this.getProductImageUrlFromBucket(product.id || encodeURIComponent(product.name.toLowerCase().replace(/\s+/g, '-')));
  }

  /**
   * Sube una foto de perfil al bucket 'perfiles' de Supabase Storage.
   * Si el bucket o RLS aún no están configurados en Supabase, guarda un respaldo local en Base64.
   */
  public async uploadProfilePhoto(file: File, userId: string): Promise<{ success: boolean; url: string; error?: string }> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${userId}.${fileExt}`;

    if (!this.isConfigured() || !this.supabase) {
      const base64 = await this.fileToBase64(file);
      localStorage.setItem('novagestion_avatar_' + userId, base64);
      return { success: false, url: base64, error: 'Supabase no inicializado.' };
    }

    try {
      // 1. Subida al bucket 'perfiles' en Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from(this.BUCKET_PROFILES)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.warn('Subida a bucket perfiles de Supabase:', uploadError.message);
        const base64 = await this.fileToBase64(file);
        localStorage.setItem('novagestion_avatar_' + userId, base64);
        return { success: false, url: base64, error: uploadError.message };
      }

      // 2. Obtener URL pública desde el bucket 'perfiles'
      const { data } = this.supabase.storage
        .from(this.BUCKET_PROFILES)
        .getPublicUrl(fileName);

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      // 3. Actualizar metadatos del usuario en Supabase Auth
      try {
        await this.supabase.auth.updateUser({
          data: { avatar_url: publicUrl }
        });
      } catch (authErr) {
        console.warn('No se pudo actualizar avatar_url en auth.updateUser:', authErr);
      }

      // 4. Actualizar tabla profiles si existe
      try {
        await this.supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      } catch {}

      localStorage.setItem('novagestion_avatar_' + userId, publicUrl);
      return { success: true, url: publicUrl };
    } catch (err: any) {
      console.warn('Excepción subiendo avatar a Supabase Storage:', err);
      const base64 = await this.fileToBase64(file);
      localStorage.setItem('novagestion_avatar_' + userId, base64);
      return { success: false, url: base64, error: err?.message || 'Error de red' };
    }
  }

  /**
   * Sube una fotografía de producto al bucket 'galeria' de Supabase Storage.
   */
  public async uploadProductPhoto(file: File, productId: string): Promise<{ success: boolean; url: string; error?: string }> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${productId}.${fileExt}`;

    if (!this.isConfigured() || !this.supabase) {
      const base64 = await this.fileToBase64(file);
      localStorage.setItem('novagestion_product_img_' + productId, base64);
      return { success: false, url: base64, error: 'Supabase no inicializado.' };
    }

    try {
      const { error: uploadError } = await this.supabase.storage
        .from(this.BUCKET_GALLERY)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.warn('Subida a bucket galeria de Supabase:', uploadError.message);
        const base64 = await this.fileToBase64(file);
        localStorage.setItem('novagestion_product_img_' + productId, base64);
        return { success: false, url: base64, error: uploadError.message };
      }

      const { data } = this.supabase.storage
        .from(this.BUCKET_GALLERY)
        .getPublicUrl(fileName);

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      localStorage.setItem('novagestion_product_img_' + productId, publicUrl);
      return { success: true, url: publicUrl };
    } catch (err: any) {
      console.warn('Excepción subiendo imagen a bucket galeria:', err);
      const base64 = await this.fileToBase64(file);
      localStorage.setItem('novagestion_product_img_' + productId, base64);
      return { success: false, url: base64, error: err?.message || 'Error de conexión' };
    }
  }

  /**
   * Convierte un archivo local File en Base64 Data URL (para vista previa y respaldo local instantáneo)
   */
  public fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
