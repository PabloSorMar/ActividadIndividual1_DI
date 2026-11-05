# GUÍA EXPLICATIVA INTEGRAL DEL PROYECTO: CLIEGESTION
## Estructura de Archivos, Arquitectura de Software y Justificación Técnica de Decisiones

> **Módulo:** Desarrollo de Interfaces (Código: 0488)  
> **Ciclo Formativo:** Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM)  
> **Alumno:** Pablo Soriano Marín  
> **Proyecto:** ClieGestion (PWA Empresarial Híbrida)

---

## 🧭 CÓMO LEER ESTA GUÍA

Este documento responde para **cada carpeta y archivo del proyecto** a las tres preguntas clave de una defensa técnica de software:
1. **¿Qué se hace aquí?** — Descripción del contenido, código y responsabilidades del archivo.
2. **¿Para qué sirve?** — Utilidad práctica dentro del ecosistema de la aplicación y para el usuario.
3. **¿Por qué se ha hecho así?** — Justificación técnica (patrones de diseño, rendimiento, accesibilidad, seguridad y cumplimiento del currículo oficial).

---

## ÍNDICE GENERAL DE LA ESTRUCTURA

1. [Configuración Raíz e Infraestructura del Proyecto](#1-configuración-raíz-e-infraestructura-del-proyecto)
2. [Punto de Entrada, Plantilla Base y Estilos Globales](#2-punto-de-entrada-plantilla-base-y-estilos-globales)
3. [Enrutamiento y Shell de Navegación](#3-enrutamiento-y-shell-de-navegación)
4. [Capa de Datos y Modelos Tipados (core/models)](#4-capa-de-datos-y-modelos-tipados-coremodels)
5. [Capa de Lógica de Negocio y Servicios (core/services)](#5-capa-de-lógica-de-negocio-y-servicios-coreservices)
6. [Capa de Seguridad y Validadores (core/guards y core/validators)](#6-capa-de-seguridad-y-validadores)
7. [Componentes Visuales Reutilizables y Agnósticos (shared/components)](#7-componentes-visuales-reutilizables-y-agnósticos-sharedcomponents)
8. [Vistas y Páginas de la Aplicación (pages)](#8-vistas-y-páginas-de-la-aplicación-pages)
9. [Recursos Estáticos, Entornos y Documentación](#9-recursos-estáticos-entornos-y-documentación)
10. [Tabla Resumen de Decisiones de Arquitectura](#10-tabla-resumen-de-decisiones-de-arquitectura)

---

## 1. CONFIGURACIÓN RAÍZ E INFRAESTRUCTURA DEL PROYECTO

### 📄 `package.json` y `package-lock.json`
* **¿Qué se hace aquí?** Define el manifiesto npm del proyecto: metadatos, comandos ejecutables (`ng serve`, `ng build`, `doc`) y dependencias de producción y desarrollo.
* **¿Para qué sirve?** Gestiona las versiones exactas de las librerías: Angular 18+, Ionic Framework 8+, Supabase JS SDK (`@supabase/supabase-js`), Chart.js, jsPDF, Ionicons y TypeDoc.
* **¿Por qué se ha hecho así?**
  * Se seleccionó **Ionic 8 + Angular Standalone** para crear una PWA híbrida multiplataforma moderna sin el coste de rendimiento de los antiguos `NgModule`.
  * `package-lock.json` congela el árbol de dependencias para garantizar compilaciones deterministas (*build reproducibility*) en local y en la nube (Vercel).

### 📄 `angular.json`
* **¿Qué se hace aquí?** Archivo central de configuración de la CLI de Angular. Configura el builder moderno `@angular/build:application` con salida en la carpeta `www`.
* **¿Para qué sirve?** Orquesta la compilación en desarrollo y producción: presupuestos de tamaño (*budgets*), sustitución de ficheros de entorno (`environment.ts` $\rightarrow$ `environment.prod.ts`), minificación, optimización de fuentes y hashing de salida (`outputHashing: "all"`).
* **¿Por qué se ha hecho así?**
  * `outputHashing: "all"` genera nombres con hash único (`main-STTJRIZU.js`), lo que permite activar caché inmutable infinita en Vercel sin problemas de caché obsoleta tras actualizar la app.
  * Se definieron límites de presupuesto (*budgets*) para alertar tempranamente si algún módulo supera los límites de rendimiento móvil.

### 📄 `vercel.json`
* **¿Qué se hace aquí?** Configuración de despliegue en la infraestructura Cloud Serverless de Vercel.
* **¿Para qué sirve?**
  1. Configura la reescritura de rutas para Single Page Application (SPA), redirigiendo cualquier ruta profunda (`/admin-dashboard`, `/user-dashboard`) a `index.html` para evitar el típico error 404 de recarga.
  2. Inyecta cabeceras HTTP de caché inmutable (`Cache-Control: public, max-age=31536000, immutable`) en todos los assets con hash (`chunk-*`, `main-*`, `styles-*`).
* **¿Por qué se ha hecho así?**
  * Sin esta regla de caché, Lighthouse penaliza la auditoría de rendimiento por servir estáticos sin política de caché eficiente.
  * Permite que la aplicación cargue en menos de 300 ms en visitas recurrentes.

### 📄 `typedoc.json`
* **¿Qué se hace aquí?** Configuración del generador automatizado de documentación técnica TypeDoc.
* **¿Para qué sirve?** Al ejecutar `npm run doc`, lee los archivos TypeScript clave (servicios, modelos, componentes y guards) y genera un portal HTML navegable con la documentación completa del código.
* **¿Por qué se ha hecho así?**
  * Cumple con la **Fase 5 (Paso 5.2 - RA 6)** de la rúbrica oficial, que exige generación automatizada de documentación técnica a partir de docstrings y tipos.

### 📄 `capacitor.config.ts` e `ionic.config.json`
* **¿Qué se hace aquí?** Metadatos de empaquetado nativo (identificador de paquete `io.ionic.starter`, nombre `ClieGestion` y directorio web `www`).
* **¿Para qué sirve?** Permite que esta misma base de código web se compile directamente a aplicación nativa Android (APK) o iOS (IPA) mediante Capacitor sin tocar una sola línea de código TypeScript.
* **¿Por qué se ha hecho así?** Garantiza el requisito curricular de **aplicación multiplataforma / híbrida (PWA + Nativa)**.

### 📄 `.gitignore`, `.editorconfig` y `.browserslistrc`
* **¿Qué se hace aquí?** Reglas de exclusión de Git, normalización de estilos de indentación en editores (UTF-8, 2 espacios) y matriz de compatibilidad de navegadores web modernos.
* **¿Para qué sirve?** Mantiene el repositorio limpio de artefactos pesados (`node_modules`, `www`, temporales), preservando únicamente las capturas de auditoría (`!/docs/screenshots/`).

---

## 2. PUNTO DE ENTRADA, PLANTILLA BASE Y ESTILOS GLOBALES

### 📄 `src/main.ts`
* **¿Qué se hace aquí?** Es el **primer archivo que se ejecuta en el navegador**. Lanza (*bootstraps*) el componente raíz `AppComponent` con la función `bootstrapApplication`.
* **¿Para qué sirve?** Inicializa los proveedores globales:
  * `provideIonicAngular({ mode: 'md' })` (fuerza la estética moderna Material Design uniforme en todos los dispositivos).
  * `provideRouter(routes)` (activa el sistema de rutas declarativo).
* **¿Por qué se ha hecho así?**
  * **Optimización Lighthouse Crítica:** Se eliminó deliberadamente `withPreloading(PreloadAllModules)`. Antes, ese precargador descargaba 1.4 MB de módulos pesados (`Chart.js`, `jsPDF`) en la pantalla de login, arruinando el tiempo de carga. Ahora cada módulo se descarga bajo estricta demanda.

### 📄 `src/index.html`
* **¿Qué se hace aquí?** La única página HTML servida desde el servidor web (arquitectura SPA). Contiene el `<head>` con metadatos y `<app-root></app-root>` en el `<body>`.
* **¿Para qué sirve?**
  * Configura el viewport móvil adaptable (`viewport-fit=cover`).
  * Conecta con la tipografía corporativa *Plus Jakarta Sans* mediante preconexión DNS (`preconnect`).
  * Declara las etiquetas PWA (`theme-color`, `mobile-web-app-capable`).
* **¿Por qué se ha hecho así?**
  * La tipografía se carga mediante `<link rel="stylesheet" media="print" onload="this.media='all'">`, una técnica estándar recomendada por Google para **no bloquear el renderizado inicial** (*Non-render-blocking font loading*).

### 📄 `src/global.scss`
* **¿Qué se hace aquí?** Hoja de estilos global. Importa la base CSS de Ionic (core, normalize, typography, padding, flex-utils) y define reglas universales.
* **¿Para qué sirve?**
  * Define la tipografía corporativa en `html, body`.
  * Establece el contorno de foco accesible WCAG (`:focus-visible`).
  * Estiliza las barras de desplazamiento (*scrollbars*) para modo oscuro.
* **¿Por qué se ha hecho así?**
  * **Optimización de rendimiento:** Antes existía un selector `* { font-family: ... }`. Se cambió a `html, body { font-family: ... }` porque aplicar fuentes sobre el selector universal `*` obliga al navegador a recalcular estilos en cada elemento hijo del DOM, degradando el rendimiento en móviles.

### 📄 `src/theme/variables.scss`
* **¿Qué se hace aquí?** Catálogo de tokens de diseño (*Design Tokens*) en variables CSS (`--ion-color-primary`, `--ion-color-success`, etc.).
* **¿Para qué sirve?** Define la paleta corporativa y las variantes de sombreado (*shade*), tinte (*tint*) y contraste de texto.
* **¿Por qué se ha hecho así?**
  * Los colores fueron calibrados con ratios de contraste WCAG 2.1 AA/AAA: el texto blanco sobre azul corporativo (`#2563eb`) o sobre verde esmeralda (`#059669`) supera ampliamente el ratio de contraste reglamentario de 4.5:1.

### 📄 `src/environments/environment.ts` y `environment.prod.ts`
* **¿Qué se hace aquí?** Ficheros de constantes de configuración ambiental.
* **¿Para qué sirve?** Almacenan la URL base del proyecto Supabase (`spfawsmajwnrtzmqiyvy.supabase.co`) y la clave pública `anonKey`.
* **¿Por qué se ha hecho así?** Permite separar el entorno de desarrollo local de las credenciales de producción sin alterar el código de los servicios.

---

## 3. ENRUTAMIENTO Y SHELL DE NAVEGACIÓN

### 📄 `src/app/app.routes.ts`
* **¿Qué se hace aquí?** Declara la tabla de rutas de la aplicación con la sintaxis de Angular 18+.
* **¿Para qué sirve?**
  * Mapea URLs a páginas: `/login`, `/register`, `/admin-dashboard`, `/user-dashboard`, `/management`, `/about`, `/contact`, `/unauthorized`.
  * Asocia el guard de seguridad `authGuard` y metadatos de rol (`data: { role: 'admin' }`).
* **¿Por qué se ha hecho así?**
  * Cada ruta utiliza `loadComponent: () => import(...)`. Esto divide la aplicación en fragmentos independientes (*code splitting*), consiguiendo que el usuario no descargue el código de administración si solo es un usuario normal.

### 📄 `src/app/app.component.ts`, `.html` y `.scss`
* **¿Qué se hace aquí?** Componente raíz (*Layout Shell*) que envuelve toda la aplicación.
* **¿Para qué sirve?**
  * Gestiona el menú lateral global adaptable (`ion-split-pane` + `ion-menu`).
  * Renderiza la barra superior global cuando hay sesión iniciada, con título, botón de ayuda, interruptor de tema oscuro/claro y botón de cerrar sesión.
  * Contiene el `<ion-router-outlet>` donde se inyectan las páginas.
* **¿Por qué se ha hecho así?**
  * `[when]="authService.isAuthenticated() ? 'lg' : 'false'"`: Si el usuario no ha iniciado sesión, el menú lateral queda completamente deshabilitado e invisible, mostrando una pantalla de login limpia y centrada.
  * En su constructor se pre-registran todos los iconos del shell con `addIcons`, evitando peticiones HTTP en cada transición de pantalla.

---

## 4. CAPA DE DATOS Y MODELOS TIPADOS (`src/app/core/models/`)

Todos los archivos de esta carpeta definen **contratos de interfaz TypeScript estrictos (`interface`, `type`)**, sin código ejecutable.

### 📄 `auth.models.ts`
* **¿Qué contiene?** `UserRole = 'admin' | 'user'`, interfaz `User`, `AuthState` y `LoginCredentials`.
* **¿Para qué sirve?** Garantiza que ningún componente pueda inventar propiedades de usuario no tipadas, previniendo errores en tiempo de compilación.

### 📄 `ticket.model.ts`
* **¿Qué contiene?** `Ticket`, `TicketPriority` (`'baja' | 'media' | 'alta' | 'urgente'`) y `TicketStatus` (`'abierto' | 'en_proceso' | 'resuelto'`).
* **¿Para qué sirve?** Define la estructura de los tickets del sistema de soporte técnico en tiempo real.

### 📄 `product.model.ts`
* **¿Qué contiene?** Interfaz `Product` (id, name, price, stock, category, description, imageUrl, created_at).
* **¿Para qué sirve?** Define el esquema de los artículos del catálogo maestro consumido desde Supabase SQL.

### 📄 `component.models.ts`
* **¿Qué contiene?** Tipos genéricos para la tabla de datos (`TableColumn<T>`, `TableAction<T>`, `TableActionEvent<T>`).
* **¿Para qué sirve?** Hace que el componente de tabla sea **completamente agnóstico y reutilizable** para cualquier entidad (clientes, tickets o productos).

### 📄 `business.models.ts`
* **¿Qué contiene?** Modelos complementarios de negocio (clientes, transacciones y métricas consolidadas).

---

## 5. CAPA DE LÓGICA DE NEGOCIO Y SERVICIOS (`src/app/core/services/`)

Los servicios son clases `@Injectable({ providedIn: 'root' })` que centralizan la lógica de negocio, el acceso a datos y la comunicación externa siguiendo el principio de inversión de dependencias.

### 📄 `auth.service.ts`
* **¿Qué se hace aquí?** Gestiona el ciclo de vida de la sesión del usuario (login, logout, persistencia y comprobación de roles).
* **¿Para qué sirve?**
  * Expone flujos reactivos observables: `currentUser$`, `isAuthenticated$` y `userRole$`.
  * Valida credenciales contra Supabase Auth y contra base de datos interna.
  * Limpia la sesión al reiniciar (`clearSessionOnStart`) para que el evaluador siempre empiece en el login.
* **¿Por qué se ha hecho así?**
  * Utiliza `BehaviorSubject<AuthState>` para almacenar el estado en memoria. Los `BehaviorSubject` emiten inmediatamente el último valor conocido a cualquier componente nuevo que se suscriba, evitando condiciones de carrera (*race conditions*).

### 📄 `supabase.service.ts`
* **¿Qué se hace aquí?** Es el **cliente de conexión con Supabase** (`@supabase/supabase-js`).
* **¿Para qué sirve?**
  * Realiza consultas CRUD contra tablas PostgreSQL (`products`, `productos`, `clients`).
  * **Almacenamiento de fotos en buckets (Supabase Storage):**
    * Bucket `perfiles`: Sube la foto de perfil seleccionada por el usuario (`uploadProfilePhoto`), genera su URL pública y la vincula a la cuenta.
    * Bucket `galeria`: Resuelve dinámicamente la foto de cada producto (`resolveProductImageUrl`) buscando por ID, nombre canónico o palabras clave representativas.
* **¿Por qué se ha hecho así?**
  * Implementa un algoritmo de emparejamiento con fallback: Si Supabase aún no tiene el archivo o el bucket está vacío, utiliza URLs locales o imágenes corporativas seguras, garantizando que la aplicación **nunca muestre imágenes rotas o errores 404**.

### 📄 `ticket.service.ts`
* **¿Qué se hace aquí?** Servicio de tickets de soporte en tiempo real (paradigma NoSQL / Stream reactivo).
* **¿Para qué sirve?**
  * Permite al usuario crear incidencias (`createTicket`).
  * Permite cambiar estados (`updateTicketStatus`) y eliminar tickets (`deleteTicket`).
  * Emite la lista actualizada en tiempo real mediante `BehaviorSubject<Ticket[]>`.
* **¿Por qué se ha hecho así?**
  * Satisface el requisito curricular de la **Fase 3 (Paso 3.1 - RA 5)** de consumir una fuente reactiva en tiempo real desacoplada del motor SQL relacional.

### 📄 `report-export.service.ts`
* **¿Qué se hace aquí?** Motor de generación y descarga de informes tabulados en **PDF y CSV**.
* **¿Para qué sirve?**
  * `exportToPdf`: Emplea la librería `jsPDF` para maquetar un documento PDF profesional con membrete corporativo, fecha de emisión, cajas de KPIs y tabla de registros paginada.
  * `exportToCsv`: Convierte un array de objetos en un archivo CSV estándar descargable.
* **¿Por qué se ha hecho así?**
  * **Detalle técnico de excelencia:** El CSV se genera anteponiendo la marca de orden de bytes UTF-8 BOM (`\uFEFF`). Sin este prefijo, Microsoft Excel corrompe tildes, eñes y caracteres especiales al abrir archivos CSV en Windows.

### 📄 `notification.service.ts`
* **¿Qué se hace aquí?** Envoltorio (*wrapper*) sobre los controladores de interacción de Ionic: `ToastController`, `LoadingController` y `AlertController`.
* **¿Para qué sirve?** Permite mostrar toasts de éxito/error, diálogos de confirmación accesibles y loaders giratorios con una sola línea de código desde cualquier componente.
* **¿Por qué se ha hecho así?** Desacopla a las páginas de la API directa de Ionic, facilitando pruebas unitarias y manteniendo el código de las vistas limpio.

### 📄 `sql-database.service.ts` y `realtime-doc.service.ts`
* **¿Qué se hace aquí?** Servicios de simulación y respaldo para el consumo concurrente exigido en la rúbrica mediante `forkJoin` (SQL relacional simulado y stream de eventos documental).

---

## 6. CAPA DE SEGURIDAD Y VALIDADORES

### 📄 `src/app/core/guards/auth.guard.ts`
* **¿Qué se hace aquí?** Guard funcional de enrutamiento basado en la función `CanActivateFn`.
* **¿Para qué sirve?**
  1. Si no hay sesión, aborta la carga y redirige a `/login?returnUrl=...`.
  2. Si la ruta requiere `role: 'admin'` y el usuario es estándar, lo expulsa a `/unauthorized`.
  3. Los administradores disponen de acceso universal.
* **¿Por qué se ha hecho así?**
  * En Angular moderno, los guards basados en clases (`canActivate(): boolean`) están obsoletos (*deprecated*). Los **guards funcionales** son más ligeros, se componen con mayor facilidad y admiten inyección de dependencias funcional con `inject()`.

### 📄 `src/app/core/validators/custom-validators.ts`
* **¿Qué se hace aquí?** Validadores personalizados síncronos y asíncronos para formularios reactivos de Angular.
* **¿Para qué sirve?**
  * Validador de formato de DNI/NIE/CIF español mediante algoritmo de letra de control.
  * Validador asíncrono para verificar si un email ya está en uso.
* **¿Por qué se ha hecho así?** Separa la lógica matemática de validación de los componentes de la vista, permitiendo reutilizarla en el Login, en el Registro o en modales futuros.

---

## 7. COMPONENTES VISUALES REUTILIZABLES Y AGNÓSTICOS (`src/app/shared/components/`)

Cumplen estrictamente con la **Fase 2 (RA 3)**: Componentes independientes, reutilizables e instanciables en múltiples vistas.

### 📁 `stat-card/` (`stat-card.component.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Componente visual de tarjeta métrica (widget de KPI).
* **¿Para qué sirve?** Muestra una cifra destacada (ej. "Total Ventas: 45.200 €", "Tickets Pendientes: 12"), con un icono, un color temático y un badge de tendencia (+14% vs mes anterior).
* **¿Por qué se ha hecho así?**
  * Es **completamente agnóstico**: No consulta servicios ni bases de datos. Recibe sus datos vía `@Input()` y notifica clics mediante `@Output() cardClick`.
  * Utiliza `ChangeDetectionStrategy.OnPush` para que Angular nunca pierda tiempo recalculándolo salvo que sus valores de entrada cambien de referencia.

### 📁 `data-table/` (`data-table.component.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Componente genérico avanzado de tabla de datos tabulada.
* **¿Para qué sirve?**
  * Presenta listas de cualquier tipo (tickets, productos o clientes).
  * Incluye buscador reactivo multicampo en tiempo real.
  * Paginación dinámica configurable (ej. 6 registros por página).
  * Ordenación ascendente/descendente al hacer clic sobre cualquier columna.
  * Ranuras de botones de acción configurables (ej. botón "Cambiar Estado", "Borrar").
* **¿Por qué se ha hecho así?**
  * Está parametrizado con tipos genéricos de TypeScript (`DataTableComponent<T>`), permitiendo que el mismo componente visual sirva para la tabla de tickets del usuario y para la tabla de productos del administrador sin duplicar código.

### 📁 `help-modal/` (`help-modal.component.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Componente modal interactivo de **Manual de Usuario integrado**.
* **¿Para qué sirve?** Al pulsar el botón `?` en la cabecera o la opción del menú lateral, se despliega una guía estructurada que explica cómo iniciar sesión, cómo filtrar incidencias, cómo gestionar productos y cómo exportar informes.
* **¿Por qué se ha hecho así?**
  * Cumple con la **Fase 5 (Paso 5.2 - RA 6)** de la rúbrica oficial, que exige un manual de usuario integrado en la propia aplicación como sistema de ayuda contextual.

---

## 8. VISTAS Y PÁGINAS DE LA APLICACIÓN (`src/app/pages/`)

### 📁 `login/` (`login.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Pantalla de inicio de sesión con branding corporativo *ClieGestion*.
* **¿Para qué sirve?**
  * Permite identificarse con email y contraseña contra Supabase Auth.
  * **Botones de demostración rápida:** Incorpora dos botones destacados ("Acceso Administrador" y "Acceso Usuario Estándar") que completan las credenciales oficiales y autentican con 1 solo clic.
* **¿Por qué se ha hecho así?**
  * Facilita al docente la corrección inmediata de ambos roles sin errores de tipeo.
  * Registra en su constructor los iconos con `addIcons`, lo que eleva el rendimiento en Lighthouse.

### 📁 `register/` (`register.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Pantalla de alta de nuevos usuarios con formulario reactivo tipado.
* **¿Para qué sirve?** Registra nuevos usuarios asignándoles automáticamente el rol de `Usuario Estándar` (sin permitir seleccionar rol de admin por seguridad).
* **¿Por qué se ha hecho así?** Satisface la exigencia de seguridad de la práctica: los roles con privilegios de administración nunca deben ser seleccionables libremente por un usuario que se registra desde la web pública.

### 📁 `admin-dashboard/` (`admin-dashboard.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Centro de mando analítico integral para el rol **Administrador**.
* **¿Para qué sirve?**
  * Muestra 4 tarjetas `StatCard` con KPIs financieros y operativos.
  * Renderiza 2 gráficos interactivos con **Chart.js** (evolución mensual de ingresos y donut de incidencias por prioridad).
  * Incluye la tabla de tickets con filtros y botones para resolver o eliminar incidencias.
  * Pestaña de Gestión para dar de alta/baja productos y clientes en Supabase PostgreSQL.
  * Botones de descarga de informes oficiales en PDF y CSV.
* **¿Por qué se ha hecho así?**
  * Centraliza en una única vista todas las competencias exigidas para el rol avanzado: visualización gráfica, gestión de datos relacionales y exportación documental.

### 📁 `user-dashboard/` (`user-dashboard.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Portal de autoservicio para el **Usuario Estándar**.
* **¿Para qué sirve?**
  * Permite consultar exclusivamente los tickets de soporte del usuario activo.
  * **Filtros interactivos:** Permite filtrar tickets por prioridad (`Urgente`, `Alta`, `Media`, `Baja`) y estado (`Abierto`, `En Progreso`, `Resuelto`).
  * Formulario reactivo para abrir una nueva incidencia.
  * **Catálogo visual de productos:** Cuadrícula de productos con fotos reales recuperadas desde el bucket `galeria` de Supabase Storage.
  * **Foto de perfil:** Permite subir un avatar personal que se guarda en el bucket `perfiles` de Supabase Storage.
* **¿Por qué se ha hecho así?** Ofrece una experiencia limpia y adaptada a clientes, garantizando que un usuario estándar nunca pueda ver ni manipular datos confidenciales de administración.

### 📁 `about/` (`about.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Página institucional corporativa "Sobre Nosotros".
* **¿Para qué sirve?** Presenta la empresa ClieGestion, su misión tecnológica, pilares de innovación y equipo humano de desarrollo.
* **¿Por qué se ha hecho así?** Aporta realismo empresarial y valor estético profesional al proyecto.

### 📁 `contact/` (`contact.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Página de "Contacto & Soporte Técnico".
* **¿Para qué sirve?** Proporciona canales de atención al cliente (teléfono, email, horario de oficina) y un formulario reactivo de contacto con validación de campos.

### 📁 `unauthorized/` (`unauthorized.page.ts`, `.html`, `.scss`)
* **¿Qué se hace aquí?** Pantalla de acceso denegado (Error 403 contextual).
* **¿Para qué sirve?** Se muestra cuando un usuario autenticado intenta acceder a una ruta que excede sus privilegios de rol, ofreciéndole un botón accesible para regresar a su área correspondiente.

---

## 9. RECURSOS ESTÁTICOS, ENTORNOS Y DOCUMENTACIÓN

### 📁 `src/assets/`
* Contiene iconos de la aplicación (`favicon.png`) y recursos vectoriales decorativos (`shapes.svg`).

### 📁 `docs/screenshots/`
* Contiene las capturas oficiales de alta resolución utilizadas en las memorias del proyecto, incluyendo la captura de la auditoría de **Google Lighthouse** (`lighthouse_score.png`).

### 📄 `MEMORIA_PROYECTO_DI.md`
* La memoria técnica formal requerida para la entrega oficial de la práctica, lista para ser convertida a PDF y entregada al centro educativo.

### 📄 `README.md`
* Manual de instalación, despliegue y guía rápida de comandos para desarrolladores en GitHub.

---

## 10. TABLA RESUMEN DE DECISIONES DE ARQUITECTURA

| Decisión de Diseño | Alternativa Descartada | ¿Por qué se eligió esta solución? |
| :--- | :--- | :--- |
| **Angular Standalone Components** | Módulos clásicos `NgModule` | Código más limpio, menor tamaño de bundle y árbol de dependencias directo y declarativo. |
| **Lazy Loading a nivel de ruta** | Carga ansiosa (*Eager loading*) | Reduce el paquete inicial a ~280 KB; la pantalla de login no descarga paquetes innecesarios. |
| **Pre-registro `addIcons` en TypeScript** | Carga dinámica de SVGs por HTTP | Evita 8 peticiones de red por pantalla en móvil 4G, acelerando drásticamente el First Contentful Paint. |
| **`ChangeDetectionStrategy.OnPush`** | `Default` (revisión de todo el árbol) | Evita re-renderizados innecesarios del DOM en tablas y tarjetas, ahorrando batería y ciclos de CPU. |
| **Guards Funcionales (`CanActivateFn`)** | Guards basados en clases (`@Injectable`) | Estándar moderno de Angular; se componen mejor con inyección de dependencias `inject()`. |
| **Caché Inmutable en Vercel (`max-age=31536000`)** | Caché por defecto sin cabeceras | Carga casi instantánea en visitas recurrentes y eliminación de advertencias en Google Lighthouse. |
| **UTF-8 BOM (`\uFEFF`) en exportación CSV** | Texto plano sin BOM | Garantiza que Microsoft Excel abra los informes respetando tildes y eñes sin caracteres extraños. |
| **Doble origen SQL (Supabase) + NoSQL Stream** | Un único mock local en memoria | Cumple con la Fase 3 del currículo de DAM integrando persistencia relacional y reactividad en tiempo real. |
