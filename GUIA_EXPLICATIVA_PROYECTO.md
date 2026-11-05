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

## 7. BANCO DE PREGUNTAS Y DEFENSAS TÉCNICAS: «¿POR QUÉ ESTO Y NO OTRA COSA?»

Este banco de preguntas recoge las dudas típicas que puede plantear un evaluador técnico en una defensa oral, organizadas por temática, con la justificación técnica exacta que debes dar.

---

### 🅰️ FRAMEWORK Y ARQUITECTURA

#### 1. ¿Por qué Angular con Standalone Components y no los módulos tradicionales `NgModule`?
* **¿Qué se hizo?** Toda la aplicación está construida con componentes declarativos individuales con `@Component({ standalone: true, imports: [...] })`.
* **¿Por qué no NgModules?** En Angular moderno (versiones 17 y 18), los `NgModule` están considerados un patrón heredado (*legacy*) que genera código innecesario (*boilerplate*).
* **Defensa:** Los componentes Standalone permiten que cada pieza declare explícitamente solo lo que usa. Esto facilita el *Tree-Shaking* (el compilador descarta el código sobrante), reduce el peso del paquete inicial a tan solo ~280 KB y permite hacer *Lazy Loading* directo sobre el componente sin crear archivos `*.module.ts` intermedios.

#### 2. ¿Por qué Ionic Framework y no React Native o Flutter?
* **¿Qué se hizo?** Se usó Ionic 8 sobre Angular, empaquetado para PWA y preparado para nativo con Capacitor.
* **¿Por qué no React Native o Flutter?** La práctica exigía una aplicación web/PWA desplegable públicamente en un hosting cloud (Vercel).
* **Defensa:** Ionic utiliza estándares web abiertos (Web Components y CSS nativo), lo que permite que una sola base de código funcione como web de escritorio, PWA móvil y aplicación nativa empaquetada con Capacitor (`capacitor.config.ts`). Flutter y React Native generan bundles web pesados y su accesibilidad (lectores de pantalla) es mucho más compleja de adaptar a normativas WCAG.

#### 3. ¿Por qué Ionic y no Angular Material plano?
* **Defensa:** Angular Material está diseñado para aplicaciones de escritorio y carece de soporte nativo para comportamientos móviles: menús colapsables táctiles (`ion-split-pane`), refresco por deslizamiento (`ion-refresher`), integración con la barra de estado móvil (`@capacitor/status-bar`) o gestión de teclados virtuales. Ionic adapta su diseño automáticamente a Material Design (Android/Web) y Cupertino (iOS) con una sola línea.

---

### 🅱️ GESTIÓN DE ESTADO Y REACTIVIDAD

#### 4. ¿Por qué usas `BehaviorSubject` de RxJS en vez de una librería como NgRx o Redux?
* **¿Qué se hizo?** `AuthService` y `TicketService` usan `BehaviorSubject` para gobernar el estado de usuario y tickets.
* **¿Por qué no NgRx?** NgRx introduce una complejidad enorme (actions, reducers, effects, selectors) injustificada para una aplicación de este tamaño.
* **Defensa:** `BehaviorSubject` ofrece el equilibrio arquitectónico perfecto: es reactivo, permite exponer streams de solo lectura (`asObservable()`) y tiene memoria: guarda el último valor emitido. Así, cuando el menú lateral o la cabecera se cargan, reciben de inmediato al usuario autenticado sin esperas ni condiciones de carrera (*race conditions*).

#### 5. ¿Por qué no usar exclusivamente los nuevos `Signals` de Angular?
* **Defensa:** Aunque Signals es excelente para valores reactivos síncronos en plantillas, la orquestación asíncrona de eventos complejos (cancelación con `takeUntil`, filtrado continuo de tickets en tiempo real o sincronización concurrente con `forkJoin`) requiere el manejo de streams temporales que solo RxJS provee. En el proyecto se combinan: RxJS en los servicios y Signals para propiedades puntuales en `SupabaseService`.

#### 6. ¿Por qué usas `forkJoin` para cargar los datos iniciales del Dashboard?
* **¿Por qué no llamadas secuenciales con `await`?** Si haces `await getSQL(); await getNoSQL();`, el usuario espera la suma de ambos tiempos ($T_1 + T_2$).
* **Defensa:** Con `forkJoin([streamSQL$, streamNoSQL$])`, ambas peticiones viajan por la red de forma concurrente y paralela. El tiempo de respuesta es únicamente el de la llamada más lenta ($\max(T_1, T_2)$), y ambas fuentes se consolidan de forma atómica antes de ocultar el spinner de carga.

---

### 🅲️ PERSISTENCIA, BACKEND Y STORAGE

#### 7. ¿Por qué Supabase y no Firebase o una API propia en Spring Boot/Express?
* **¿Por qué no Firebase?** Firebase es una base de datos NoSQL puramente documental, lo cual complica mantener la integridad referencial de entidades empresariales como Clientes, Productos y Facturación. Supabase provee un motor **PostgreSQL relacional completo**, con claves foráneas, soporte SQL estándar, autenticación y storage.
* **¿Por qué no Spring Boot?** La asignatura es *Desarrollo de Interfaces (DI)*, donde el foco evaluable es el frontend, la usabilidad y el consumo asíncrono. Desarrollar una API completa en Spring Boot habría consumido el tiempo sin aportar puntos a los criterios de interfaz, mientras que Supabase ofrece un backend profesional real en la nube sin mocks estáticos.

#### 8. ¿Por qué guardar las imágenes en buckets de Storage y no en Base64 en la base de datos?
* **¿Por qué no Base64 en PostgreSQL?** Guardar una imagen en Base64 en una columna de texto incrementa su tamaño un 33% y sobrecarga la memoria de la base de datos. Cada vez que hicieras `SELECT * FROM products`, viajarían megabytes de imágenes por la red, ralentizando la aplicación.
* **Defensa:** Guardar los archivos físicos en buckets de Storage (`perfiles` y `galeria`) y almacenar en la tabla solo la URL pública permite que las imágenes se sirvan a través de CDNs optimizadas con caché, cargándose de forma diferida en el navegador (`loading="lazy"`).

#### 9. ¿Por qué implementaste un algoritmo de resolución de imágenes con fallback en el bucket `galeria`?
* **Defensa:** En entornos de prueba o corrección docente, si un bucket remoto no tiene todas las fotos subidas o hay discrepancias en la extensión (.jpg vs .png), una web normal mostraría el icono de imagen rota y errores 404 en la consola (lo que penaliza la rúbrica). El algoritmo de `SupabaseService` busca por ID, normaliza nombres con slugs, busca palabras clave (Dell, Cisco, Fortinet) y cuenta con imágenes de respaldo seguras, asegurando que la interfaz siempre luzca impecable.

---

### 🅳️ COMPONENTES Y OPTIMIZACIÓN DE RENDERIZADO

#### 10. ¿Por qué configuraste `ChangeDetectionStrategy.OnPush` en `StatCard` y `DataTable`?
* **¿Qué pasa con la detección por defecto?** Con la estrategia `Default`, Angular revisa todos los componentes de la pantalla ante cualquier mínimo evento (un clic, una pulsación de tecla, un timer), consumiendo ciclos de CPU.
* **Defensa:** Con `OnPush`, le indicamos al motor de Angular que ignore el componente salvo que sus referencias `@Input()` cambien de verdad o el usuario interactúe con él. En tablas con decenas de filas de tickets o productos, esto elimina re-renderizados inútiles y garantiza 60 FPS estables en móviles.

#### 11. ¿Por qué una tabla genérica `DataTableComponent<T>` y no tablas normales en cada vista?
* **Defensa:** Cumple con el principio de diseño DRY (*Don't Repeat Yourself*) y el criterio de la **Fase 2 (RA 3)**. El componente es 100% agnóstico: la misma tabla renderiza tickets, clientes o productos gracias a la parametrización de tipos `<T>`, compartiendo la lógica de búsqueda en vivo, ordenación por cabecera y paginación en un único punto mantenible.

#### 12. ¿Cómo evitas las fugas de memoria (*memory leaks*) al suscribirte a observables?
* **Defensa:** En componentes que escuchan streams reactivos, las suscripciones se desuscriben explícitamente en el gancho de ciclo de vida `ngOnDestroy()` (mediante llamadas a `.unsubscribe()` o mediante operadores `takeUntil(this.destroy$)`). De este modo, si el usuario cambia de página, los canales de datos se cierran y no consumen memoria en segundo plano.

---

### 🅴️ SEGURIDAD Y ENRUTAMIENTO

#### 13. ¿Por qué un Functional Guard (`CanActivateFn`) en vez de una clase con `@Injectable()`?
* **Defensa:** En versiones recientes de Angular, los guards basados en clases están declarados obsoletos (*deprecated*). Los guards funcionales son funciones puras mucho más compactas, no requieren instanciar clases y se integran de forma natural con la función `inject()`, facilitando pruebas y reduciendo el código fuente.

#### 14. ¿Por qué en el formulario de registro se asigna forzosamente el rol `user` y no se deja elegir `admin`?
* **Defensa:** Por un principio fundamental de ciberseguridad (*Prevención de Escalada de Privilegios*). En ningún sistema empresarial del mundo real un usuario anónimo que se registra desde internet puede autoproclamarse Administrador. El alta pública siempre crea cuentas con privilegios mínimos (`user`); los administradores deben ser creados o promovidos internamente.

#### 15. ¿Por qué la seguridad se aplica en el Guard y no solo ocultando botones con `*ngIf`?
* **Defensa:** Por el principio de **Defensa en Profundidad**. Ocultar un botón en la interfaz solo aporta comodidad visual (UX), pero no protege la aplicación: cualquier usuario podría escribir `/admin-dashboard` en la barra del navegador. El `authGuard` actúa como cortafuegos en el enrutador, bloqueando la navegación a nivel de código antes de que la página llegue a cargarse.

---

### 🅵️ GENERACIÓN DE INFORMES Y EXPORTACIÓN

#### 16. ¿Por qué usar la librería `jsPDF` en lugar de `window.print()`?
* **Defensa:** `window.print()` abre el diálogo del navegador e imprime la pantalla completa tal como está, arrastrando el menú lateral, los botones, los fondos oscuros y dependiendo del navegador de cada cliente. `jsPDF` genera un documento vectorial formal en formato A4 con membrete corporativo ClieGestion, fecha de auditoría, resumen de KPIs y tabla de datos formateada, listo para ser entregado o archivado.

#### 17. ¿Por qué añades el prefijo `\uFEFF` (Byte Order Mark) al exportar a CSV?
* **Defensa:** Es un detalle técnico clave para Microsoft Excel. En sistemas operativos Windows, Excel abre los archivos CSV asumiendo codificación ANSI/Windows-1252. Si el archivo no lleva la marca BOM UTF-8 (`\uFEFF`), todos los caracteres no anglosajones (tildes como á/é/í, la letra ñ o el símbolo del euro €) se corrompen (*mojibake*). Con el BOM, Excel reconoce inmediatamente que el archivo es UTF-8 nativo y lo abre perfecto.

---

### 🅶️ RENDIMIENTO WEB, ACCESIBILIDAD Y LIGHTHOUSE

#### 18. ¿Por qué tu puntuación de Lighthouse en móvil era de 58 y subió a 80 (y 98 en escritorio)? ¿Qué se hizo exactamente?
* **Defensa:**
  1. **Se eliminó la precarga global en `main.ts`:** Evitó descargar 1.4 MB de módulos analíticos y de PDF en la pantalla de login.
  2. **Se pre-registraron los iconos con `addIcons`:** Se eliminaron 8 peticiones HTTP dinámicas en el arranque.
  3. **Se optimizó la regla CSS en `global.scss`:** Se cambió `* { font-family }` por `html, body { font-family }`, erradicando el recálculo masivo de estilos en cada nodo DOM.
  4. **Se configuró caché inmutable en `vercel.json`:** Directivas `max-age=31536000, immutable` para servir ficheros cacheados al instante.
  5. **Nota:** En móvil se emula una CPU 4 veces más lenta con red 4G reducida (obteniendo 80/100); en escritorio alcanza un **98/100**, cumpliendo de sobra con el requisito curricular (> 90 en Accesibilidad y Mejores Prácticas).

#### 19. ¿Por qué registras los iconos con `addIcons()` en TypeScript en vez de solo poner `<ion-icon name="user">` en el HTML?
* **Defensa:** Por defecto, Ionic descarga cada archivo `.svg` mediante una petición de red HTTP al detectar el componente en el DOM. Al llamar a `addIcons({ person, lockClosed, ... })` en el constructor de TypeScript, los datos del SVG se empaquetan en memoria dentro del propio archivo JavaScript compilado. De este modo, la interfaz renderiza los iconos al instante con **0 peticiones de red**.

#### 20. ¿Cómo garantizas el cumplimiento de WCAG 2.1 AA/AAA?
* **Defensa:**
  * **Contraste de color:** Todos los pares de colores (texto/fondo) superan la relación de contraste reglamentaria de 4.5:1 en texto estándar y 7:1 en elementos destacados.
  * **Navegación por teclado:** Orden lógico de tabulación (`tabindex`) con indicador de foco azul de alta visibilidad (`:focus-visible`).
  * **Semántica WAI-ARIA:** Uso de `role="alert"`, `aria-live="assertive"` para mensajes de error dinámicos, `aria-label` en botones con solo icono y `aria-required` en campos obligatorios para compatibilidad total con lectores de pantalla.

---

## 8. MAPA DE ELEMENTOS TÉCNICOS: DÓNDE Y CÓMO SE HA USADO CADA COSA

Este apartado resume exactamente en qué archivos, clases y métodos del proyecto se implementa cada uno de los conceptos solicitados:

---

### 🌐 1. APIs (Interfaces de Programación de Aplicaciones)

| Tipo de API | Dónde se utiliza (Archivos y Métodos) | ¿Para qué se usa? |
| :--- | :--- | :--- |
| **API REST de Supabase (PostgREST)** | `src/app/core/services/supabase.service.ts`<br>• `getProducts()`: `.from('products').select('*')`<br>• `addProduct()`: `.from('products').insert(...)`<br>• `deleteProduct()`: `.from('products').delete().eq('id', id)`<br>• `getClients()` / `addClient()`: `.from('clients')` | Operaciones CRUD sobre tablas relacionales PostgreSQL en la nube para gestionar el catálogo y clientes. |
| **API de Supabase Storage** | `src/app/core/services/supabase.service.ts`<br>• `uploadProfilePhoto()`: `.storage.from('perfiles').upload(...)`<br>• `resolveProductImageUrl()`: `.storage.from('galeria').getPublicUrl(...)` | Subida multipart de fotos de perfil y resolución de URLs públicas de imágenes de catálogo. |
| **API de Supabase Auth (GoTrue)** | `src/app/core/services/supabase.service.ts`<br>• `loginWithSupabase()`: `auth.signInWithPassword(...)`<br>• `registerWithSupabase()`: `auth.signUp(...)`<br>• `signOut()`: `auth.signOut()` | Autenticación basada en tokens JWT con verificación de credenciales en la nube. |
| **HTML5 2D Canvas API (vía Chart.js)** | `src/app/pages/admin-dashboard/admin-dashboard.page.ts`<br>• `initProductStockChart()`: `new Chart(ctxProduct, { ... })`<br>• `initTicketPriorityChart()`: `new Chart(ctxTicket, { ... })` | Dibujo y renderizado interactivo de gráficos analíticos de barras y dona sobre elementos `<canvas>`. |
| **API de jsPDF (Gráficos Vectoriales en PDF)** | `src/app/core/services/report-export.service.ts`<br>• `exportToPdf()`: `new jsPDF(...)`, `doc.rect()`, `doc.text()`, `doc.save()` | Construcción algorítmica de documentos PDF con coordenadas cartesianas milimétricas, membrete y tablas. |
| **Web Storage API (`localStorage` / `sessionStorage`)** | • `app.component.ts`: Guardar tema oscuro/claro (`cliegestion_theme`)<br>• `auth.service.ts`: Persistir sesión activa y usuarios registrados<br>• `supabase.service.ts`: Guardar clave anon y caché de avatares | Persistencia en el navegador del cliente entre recargas de página sin necesidad de cookies. |
| **Ionic Web Components API** | En todas las páginas y componentes:<br>`ion-split-pane`, `ion-menu`, `ion-modal`, `ion-toast`, `ion-spinner`, `ion-grid`, etc. | Componentes visuales desacoplados que encapsulan la UI nativa multiplataforma mediante Shadow DOM. |

---

### 🛡️ 2. GUARDS (Protección y Control de Rutas)

* **Archivo del Guard:** `src/app/core/guards/auth.guard.ts`
* **Implementación:** Guard funcional basado en `CanActivateFn` con inyección funcional `inject(AuthService)` e `inject(Router)`.
* **Dónde se aplica (Rutas en `src/app/app.routes.ts`):**
  1. `/admin-dashboard` $\rightarrow$ `canActivate: [authGuard]`, `data: { role: 'admin' }`
  2. `/management` $\rightarrow$ `canActivate: [authGuard]`, `data: { role: 'admin' }`
  3. `/user-dashboard` $\rightarrow$ `canActivate: [authGuard]`, `data: { role: 'user' }`
  4. `/about` $\rightarrow$ `canActivate: [authGuard]`
  5. `/contact` $\rightarrow$ `canActivate: [authGuard]`
* **Lógica ejecutada:**
  * Si `!authService.isAuthenticated()` $\rightarrow$ bloquea y redirige forzosamente a `/login?returnUrl=...`.
  * Si la ruta exige rol `admin` y el usuario tiene rol `user` $\rightarrow$ desvía la navegación a `/unauthorized`.
  * Si el usuario es `admin` $\rightarrow$ tiene acceso global concedido.

---

### 👤 3. AUTHSERVICE (Servicio Central de Autenticación)

* **Archivo de definición:** `src/app/core/services/auth.service.ts`
* **Patrón interno:** Gestión de estado reactivo mediante `BehaviorSubject<AuthState>` privado y observables públicos (`currentUser$`, `isAuthenticated$`, `userRole$`).
* **Dónde se inyecta y utiliza en el proyecto:**
  1. `src/app/core/guards/auth.guard.ts`: Para consultar `isAuthenticated()` y `getUserRole()` antes de autorizar cualquier salto de ruta.
  2. `src/app/app.component.ts` y `.html`:
     * `[when]="authService.isAuthenticated() ? 'lg' : 'false'"`: Activa o desactiva el menú lateral según haya sesión.
     * `*ngIf="authService.currentUser$ | async as user"`: Pinta el nombre, email, badge y avatar en la cabecera del menú.
     * `*ngIf="authService.hasRole('admin')"`: Renderiza los enlaces de administración solo si el usuario es admin.
     * `authService.logout()`: Cierra la sesión activa.
  3. `src/app/pages/login/login.page.ts`: Ejecuta `this.authService.login(...)` al pulsar "Acceder" o en los botones rápidos de 1 clic.
  4. `src/app/pages/admin-dashboard/admin-dashboard.page.ts`: Verifica permisos administrativos y provee cierre de sesión.
  5. `src/app/pages/user-dashboard/user-dashboard.page.ts`: Filtra los tickets para mostrar únicamente los que pertenecen al ID del usuario autenticado (`authService.getCurrentUser()?.id`).

---

### ⚡ 4. SUPABASE (Base de Datos, Autenticación y Storage)

* **Archivo central:** `src/app/core/services/supabase.service.ts`
* **Instanciación:** `createClient(environment.supabaseUrl, environment.supabaseKey)` usando las credenciales del proyecto `spfawsmajwnrtzmqiyvy.supabase.co`.
* **Dónde y qué partes se utilizan:**
  1. **Tablas Relacionales (SQL / PostgreSQL):**
     * Tabla `products` / `productos`: En `admin-dashboard` para consultar catálogo maestro, añadir nuevos productos con stock y precio, y borrarlos. En `user-dashboard` para el catálogo visual.
     * Tabla `clients`: En `admin-dashboard` para listar y registrar clientes corporativos.
  2. **Bucket de Almacenamiento `perfiles` (Supabase Storage):**
     * En `src/app/pages/user-dashboard/user-dashboard.page.ts` mediante el método `uploadProfilePhoto()`: El usuario selecciona una imagen de su ordenador y el servicio la sube al bucket `perfiles`, genera la URL pública con `getPublicUrl` y actualiza los metadatos de usuario en Supabase Auth.
  3. **Bucket de Almacenamiento `galeria` (Supabase Storage):**
     * En `user-dashboard` y `admin-dashboard` mediante el método `resolveProductImageUrl()`: Empareja cada producto de la base de datos con los archivos subidos al bucket `galeria` mediante coincidencia por ID, slug y palabras clave.
  4. **Autenticación en la Nube:**
     * En `login.page.ts`: Comprueba credenciales contra Supabase Auth con `loginWithSupabase()`.
     * En `login.page.html`: Si la clave no estuviera introducida, muestra el asistente `saveKey()` para pegarla en caliente.

---

### 📶 5. SIGNALS (Reactividad Nativa de Angular)

* **Dónde se utilizan:** `src/app/core/services/supabase.service.ts`
* **Código exacto:**
  ```typescript
  import { Injectable, signal } from '@angular/core';

  // Signals reactivos para el estado de autenticación en Supabase
  public currentUser = signal<User | null>(null);
  public userRole = signal<'admin' | 'user' | null>(null);
  ```
* **Operaciones realizadas con Signals:**
  * Al iniciar sesión con éxito: `this.currentUser.set(mappedUser); this.userRole.set(res.role);`
  * Al cerrar sesión (`signOut`): `this.currentUser.set(null); this.userRole.set(null);`
* **¿Por qué aquí?** Los Signals ofrecen una lectura síncrona limpia y reactiva dentro del servicio sin requerir tuberías de observables para operaciones de consulta directa de valores.

---

### ⏱️ 6. SINCRONÍA (Operaciones Síncronas en el Proyecto)

Son aquellas operaciones que se ejecutan de manera inmediata en el hilo principal sin esperar eventos de red ni promesas:

| Funcionalidad Síncrona | Dónde se ejecuta | Código / Mecanismo |
| :--- | :--- | :--- |
| **Validaciones de formulario reactivo** | `login.page.ts`, `register.page.ts`, `custom-validators.ts` | `Validators.required`, `Validators.minLength(3)`, comprobación matemática de la letra del DNI con operador módulo `dni % 23`. |
| **Filtrado dinámico de tickets en memoria** | `user-dashboard.page.ts` (`filteredTickets`), `admin-dashboard.page.ts` | Getters síncronos sobre arrays con `.filter(t => t.status === filter && t.priority === filter)`. |
| **Búsqueda en vivo y ordenación de tablas** | `src/app/shared/components/data-table/data-table.component.ts` | Algoritmos síncronos de ordenación `.sort()` sobre las columnas y cálculo de páginas con `.slice(inicio, fin)`. |
| **Pre-registro de iconos en memoria** | En los constructores de `login.page.ts`, `app.component.ts` | `addIcons({ businessOutline, shieldCheckmark, ... })`. Empaqueta inmediatamente las referencias en memoria. |
| **Cambio de tema visual (Dark/Light)** | `app.component.ts` (`toggleTheme()`, `initTheme()`) | Lectura y escritura síncrona en `localStorage.getItem('cliegestion_theme')` y manipulación del DOM con `classList.add('dark')`. |

---

### ⏳ 7. ASINCRONÍA (Operaciones Asíncronas en el Proyecto)

Son las tareas no bloqueantes que dependen de respuestas de red, bases de datos o temporizadores:

| Funcionalidad Asíncrona | Dónde se ejecuta | Tecnología / Operador Asíncrono |
| :--- | :--- | :--- |
| **Flujos reactivos de sesión y tickets** | `auth.service.ts`, `ticket.service.ts` | **RxJS Observables:** `BehaviorSubject`, `Observable.pipe()`, `map()`, suscripciones con `.subscribe()` y desuscripción en `ngOnDestroy`. |
| **Orquestación concurrente de fuentes duales** | `src/app/pages/admin-dashboard/admin-dashboard.page.ts` | **RxJS `forkJoin`:** Dispara concurrentemente la llamada SQL y el stream NoSQL consolidando los datos en un solo callback. |
| **Llamadas CRUD y Storage a Supabase** | `src/app/core/services/supabase.service.ts` | **Promesas con `async / await`:** `await this.supabase.from('products').select('*')`, `await this.supabase.storage.upload(...)`. |
| **Validaciones asíncronas de formularios** | `src/app/core/validators/custom-validators.ts`, `register.page.ts` | `AsyncValidatorFn` con `debounceTime(400)` para pausar la comprobación hasta que el usuario deja de escribir. |
| **Carga perezosa de rutas (*Lazy Loading*)** | `src/app/app.routes.ts` | Funciones dinámicas asíncronas `loadComponent: () => import('./pages/...').then(m => m.Page)`. |
| **Lectura local de archivos fotográficos** | `src/app/core/services/supabase.service.ts` (`fileToBase64`) | `new Promise` con evento asíncrono `FileReader.onload`. |
| **Re-entrada al ciclo de detección de Angular** | `login.page.ts` | `this.ngZone.run(() => { ... })` para sincronizar las respuestas de red asíncronas de Supabase con la vista. |

---

### 🎨 8. ESTILOS (Arquitectura de Diseño y Maquetación)

| Nivel de Estilo | Archivo / Ubicación | Propósito y Técnicas Aplicadas |
| :--- | :--- | :--- |
| **Tokens de Diseño Globales** | `src/theme/variables.scss` | Variables CSS personalizadas (`--ion-color-primary: #2563eb`, `--ion-color-success: #059669`, etc.). Calibradas con ratios de contraste WCAG 2.1 AA/AAA ($\ge 4.5:1$). |
| **Tipografía y Normalización** | `src/global.scss` | Aplicación de la tipografía moderna *Plus Jakarta Sans* a nivel de `html, body`, eliminación de márgenes, y reseteo universal `box-sizing: border-box`. |
| **Accesibilidad de Teclado** | `src/global.scss` | Regla pseudo-clase `:focus-visible` con contorno azul visible de 3px (`3px solid var(--ion-color-primary)`) para usuarios que navegan con la tecla Tabulador. |
| **Estilos Encapsulados (Scoped SCSS)** | En cada página y componente:<br>• `login.page.scss`<br>• `admin-dashboard.page.scss`<br>• `stat-card.component.scss`<br>• `data-table.component.scss` | Estilos aislados por componente mediante el emulador de Shadow DOM de Angular. Uso de flexbox, backdrop blur (`backdrop-filter: blur(16px)` en tarjetas de login) y rejillas `ion-grid`. |
| **Modo Oscuro / Modo Claro** | `src/global.scss`, `src/theme/variables.scss` y `src/index.html` | Activado mediante las clases `.ion-palette-dark` y `.dark` en el `<body>`, adaptando automáticamente fondos oscuros (`#0b0f19`) y textos de alto contraste (`#f8fafc`). |
| **Diseño Adaptativo (*Responsive*)** | `app.component.scss`, `admin-dashboard.page.scss` | Reglas `@media (min-width: 768px)` y `@media (min-width: 992px)` junto con `ion-split-pane` para reorganizar tarjetas y paneles entre móvil, tablet y monitor de escritorio. |


