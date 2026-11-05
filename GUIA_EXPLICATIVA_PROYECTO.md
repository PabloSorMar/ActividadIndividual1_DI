# RESUMEN EJECUTIVO DEL PROYECTO: CLIEGESTION
## Guía de Arquitectura, Funcionamiento y Decisiones Técnicas

> **Módulo:** Desarrollo de Interfaces (Código: 0488) | **Ciclo:** DAM  
> **Alumno:** Pablo Soriano Marín  
> **Repositorio:** [GitHub](https://github.com/PabloSorMar/ActividadIndividual1_DI.git) | **Despliegue:** [Vercel](https://actividad-individual1-di.vercel.app/login)

---

## 1. VISIÓN GENERAL Y ESTRUCTURA EN CAPAS

La aplicación **ClieGestion** es una solución empresarial multiplataforma (PWA/Híbrida) desarrollada con **Ionic Framework** y **Angular (Standalone Architecture)**, conectada a **Supabase** como backend en la nube.

El proyecto se organiza en 5 grandes bloques funcionales:

```text
src/app/
├── app.routes.ts & app.component.*  →  [Shell y Enrutamiento Protegido]
├── core/
│   ├── models/                      →  [Tipos e Interfaces de Datos]
│   ├── services/                    →  [Lógica de Negocio, Supabase y Exportación]
│   └── guards/ & validators/        →  [Seguridad por Roles y Validaciones]
├── shared/components/               →  [Componentes Visuales Reutilizables]
└── pages/                           →  [Vistas de Administrador y Usuario]
```

---

## 2. ARRANQUE, ENRUTAMIENTO Y SEGURIDAD

### ¿Qué se hace en esta parte?
Controla el inicio de la aplicación (`src/main.ts`), el menú lateral global adaptable (`src/app/app.component.*`), el mapa de rutas (`src/app/app.routes.ts`) y la protección de accesos (`src/app/core/guards/auth.guard.ts`).

### ¿Para qué sirve?
* Si no hay sesión iniciada, el usuario es redirigido obligatoriamente a `/login`.
* Al identificarse, el menú lateral (*Split Pane*) se despliega mostrando solo las opciones permitidas para su rol:
  * **Administrador:** Cuadro de Mando, Gráficos, Gestión de Productos/Clientes y Exportaciones.
  * **Usuario Estándar:** Portal de Incidencias, Filtros de Tickets, Catálogo y Perfil.
* Si un usuario estándar intenta forzar la URL `/admin-dashboard`, el guard lo intercepta y bloquea el acceso.

### ¿Por qué se hizo así?
1. **Carga Diferida (*Lazy Loading*):** Cada pantalla se descarga bajo demanda (`loadComponent: () => import(...)`). El paquete inicial pesa solo ~280 KB en vez de cargar toda la web de golpe.
2. **Guards Funcionales (`CanActivateFn`):** Es el estándar moderno de Angular; más ligero y fácil de mantener que las clases antiguas.
3. **Shell Adaptable:** En móviles el menú es un desplegable; en pantallas grandes se queda fijo en el lateral para aprovechar el espacio.

---

## 3. CAPA DE DATOS Y SERVICIOS (`core/services`)

### ¿Qué se hace en esta parte?
Centraliza la comunicación con la base de datos, el almacenamiento de archivos y la lógica que no pertenece a una pantalla concreta.

* **`auth.service.ts`:** Gobierna la sesión activa usando flujos reactivos (`BehaviorSubject`), emitiendo el estado a cualquier componente que lo necesite.
* **`supabase.service.ts`:** Conecta con Supabase para dos funciones esenciales:
  1. **Base de Datos (SQL / PostgreSQL):** Lectura y escritura de productos y clientes.
  2. **Almacenamiento (Supabase Storage):**
     * Bucket **`perfiles`**: Guarda la foto de perfil subida por el usuario y actualiza su avatar.
     * Bucket **`galeria`**: Busca y vincula las fotos reales de los productos del catálogo por ID o nombre.
* **`ticket.service.ts`:** Maneja las incidencias en tiempo real (crear, cambiar estado, borrar).
* **`report-export.service.ts`:** Motor que genera los informes descargables en **PDF** (diseñado con `jsPDF`) y **CSV** con compatibilidad para Excel.

### ¿Para qué sirve?
Garantiza que las pantallas solo se encarguen de pintar datos, mientras que las llamadas a la nube, subidas de fotos y descargas de archivos se resuelven de forma centralizada y segura.

### ¿Por qué se hizo así?
* **Consumo Dual (SQL + NoSQL):** Cumple con la exigencia del currículo de combinar persistencia relacional con reactividad en tiempo real.
* **Fallback Inteligente de Fotos:** Si Supabase no tuviera una imagen disponible, el servicio resuelve automáticamente una imagen representativa para que la interfaz nunca muestre enlaces rotos.
* **CSV con UTF-8 BOM (`\uFEFF`):** Sin esta cabecera, Excel corrompe las tildes y las eñes al abrir el archivo. Con ella, se abre perfectamente.

---

## 4. COMPONENTES VISUALES REUTILIZABLES (`shared/components`)

### ¿Qué se hace en esta parte?
Contiene bloques visuales que no pertenecen a ninguna pantalla en particular, sino que pueden utilizarse en cualquier lugar del proyecto:
* **`stat-card`:** Tarjeta para mostrar métricas clave (cifra principal, icono, color y porcentaje de tendencia).
* **`data-table`:** Tabla inteligente con buscador predictivo en tiempo real, ordenación por columnas, paginación automática y botones de acción.
* **`help-modal`:** Ventana modal con el Manual de Usuario interactivo integrado.

### ¿Para qué sirve?
Evita duplicar código HTML y CSS en cada pantalla. Por ejemplo, la misma tabla inteligente sirve para mostrar los tickets del usuario y los productos del administrador.

### ¿Por qué se hizo así?
* **Componentes Agnósticos:** Solo reciben datos por `@Input()` y avisan de acciones por `@Output()`. No dependen de la base de datos.
* **Rendimiento `OnPush`:** Ambos usan `ChangeDetectionStrategy.OnPush`, lo que le indica a Angular que no gaste procesador recalculando la tabla a menos que los datos hayan cambiado realmente.

---

## 5. PÁGINAS Y EXPERIENCIA DE USUARIO (`pages/`)

### ¿Qué se hace en cada pantalla?
* **Login (`/login`):** Acceso con credenciales de Supabase. Incluye **botones de acceso rápido de 1 clic** ("Acceso Administrador" y "Acceso Usuario Estándar") para agilizar las pruebas del profesor sin tener que escribir.
* **Registro (`/register`):** Alta de nuevas cuentas con validaciones automáticas. Asigna por defecto el rol de usuario normal por motivos de seguridad.
* **Centro de Mando Admin (`/admin-dashboard`):** 
  * Tarjetas de resumen estadístico (`StatCard`).
  * 2 gráficos interactivos con **Chart.js** (evolución de ingresos y distribución de tickets por urgencia).
  * Tabla con buscador y acciones de estado/borrado.
  * Pestaña para crear/borrar productos y clientes.
  * Botones para exportar informes en **PDF y CSV**.
* **Portal de Usuario (`/user-dashboard`):**
  * Consulta de incidencias personales con **filtros interactivos por prioridad y estado**.
  * Formulario para abrir nuevos tickets.
  * Catálogo visual de productos con fotos traídas desde Supabase Storage.
  * Zona para actualizar la foto de perfil en el bucket `perfiles`.
* **Sobre Nosotros (`/about`) y Contacto (`/contact`):** Páginas informativas con canales de soporte y formulario de contacto.

### ¿Por qué se hizo así?
Separa radicalmente la experiencia según el rol: el usuario solo ve su propia información y productos, mientras que el administrador dispone de métricas analíticas globales y control de inventario.

---

## 6. RENDIMIENTO, ACCESIBILIDAD Y DESPLIEGUE CLOUD

### Auditoría Oficial Google Lighthouse:
* **Accesibilidad:** **96 / 100** *(Requisito oficial: > 90)*
* **Buenas Prácticas:** **96 / 100** *(Requisito oficial: > 90)*
* **SEO:** **91 / 100**
* **Rendimiento:** **80 / 100** en móvil simulado 4G y **98 / 100** en escritorio.

### ¿Por qué se consiguieron estas notas?
1. **Pre-registro de Iconos (`addIcons`):** Los iconos se compilan en memoria en TypeScript. Se eliminaron 8 peticiones de red por pantalla que ralentizaban el móvil.
2. **Fuentes No Bloqueantes:** Google Fonts se carga en segundo plano (`media="print" onload="this.media='all'"`) con respaldo inmediato en fuentes del sistema.
3. **Caché Inmutable en Vercel (`vercel.json`):** Cabeceras `Cache-Control: max-age=31536000, immutable` para que los ficheros estáticos carguen al instante en visitas repetidas.
4. **Accesibilidad WCAG 2.1:** Ratios de contraste calculados para ser legibles en modo oscuro y claro, navegación completa con el teclado (`tabindex`, foco azul visible `:focus-visible`) y etiquetas semánticas para lectores de pantalla (`aria-label`, `role="alert"`).

---

## 7. RESUMEN RÁPIDO PARA DEFENSA ORAL

| Pregunta Típica del Evaluador | Respuesta Técnica Directa |
| :--- | :--- |
| **¿Cómo proteges las rutas?** | Con un guard funcional (`authGuard`) que comprueba el token en `AuthService` y revisa los datos de rol (`data: { role: 'admin' }`). Si no tiene permiso, lo desvía. |
| **¿Cómo gestionas los datos de Supabase?** | Mediante `SupabaseService` con el cliente oficial JS: consultas SQL sobre PostgreSQL para datos maestros y uso de la API de Storage para los buckets `galeria` y `perfiles`. |
| **¿Cómo consigues que la web cargue rápido?** | Con *Lazy Loading* por rutas, pre-registrando los iconos con `addIcons`, cargando fuentes de forma asíncrona y configurando caché inmutable en `vercel.json`. |
| **¿Cómo se comunican tus componentes reutilizables?** | Desacoplados al 100%: reciben entradas por `@Input()`, notifican eventos al padre mediante `@Output() EventEmitter` y usan `ChangeDetectionStrategy.OnPush`. |
| **¿Cómo aseguras la accesibilidad?** | Cumpliendo WCAG 2.1 AA/AAA: contrastes cromáticos regulados, soporte completo de modo oscuro/claro, navegación por teclado visible y atributos WAI-ARIA en todos los controles interactivos. |
