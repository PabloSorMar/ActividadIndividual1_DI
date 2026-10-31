# MEMORIA TÉCNICA Y DE ESPECIFICACIONES DE PROYECTO

## ClieGestion — Sistema de Gestión Empresarial Multiplataforma (PWA/Híbrida)

---

### FICHA INFORMATIVA DEL PROYECTO Y ENTREGA OFICIAL

* **Módulo Profesional:** Desarrollo de Interfaces (Código: 0488)  
* **Ciclo Formativo:** Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM)  
* **Tipo de Actividad:** Proyecto Individual de Evaluación Práctica — Actividad Individual 1  
* **Modalidad:** Entregable Final  
* **Autor / Estudiante:** Pablo Soriano Marín  
* **Curso Académico:** 2026 / 2027  

---

### ENLACES Y EVIDENCIAS DE EVALUACIÓN DOCENTE (RA 7)

| Recurso Obligatorio | Enlace Directo | Descripción y Estado |
| :--- | :--- | :--- |
| **Repositorio de Código Fuente (GitHub)** | [https://github.com/PabloSorMar/ActividadIndividual1_DI.git](https://github.com/PabloSorMar/ActividadIndividual1_DI.git) | Repositorio público con historial completo de commits semánticos y ramas Gitflow (`main`, `develop`, `mejoras`, `feature/*`). |
| **Despliegue en Producción (Cloud Vercel)** | [https://actividad-individual1-di.vercel.app/login](https://actividad-individual1-di.vercel.app/login) | Despliegue cloud continuo activo 24/7, accesible desde cualquier navegador sin requerir configuración local previa. |

---

### CREDENCIALES DE ACCESO DE PRUEBA (EVALUACIÓN DOCENTE)

Para agilizar la evaluación de los dos roles requeridos en la rúbrica (**Administrador** y **Usuario Estándar**), la pantalla de inicio de sesión incorpora **botones de acceso rápido de demostración con 1 solo clic**, los cuales rellenan y envían automáticamente las credenciales oficiales sin necesidad de teclearlas. También pueden introducirse manualmente:

| Rol de Usuario | Correo Electrónico | Contraseña | Botón Rápido en Pantalla | Vistas y Capacidades Habilitadas en el Sistema |
| :--- | :--- | :--- | :---: | :--- |
| **Administrador** | `admin@gmail.com` | `123456` | **"Acceso Administrador"** | Acceso total: Cuadro de Mando con métricas `Chart.js`, tabla avanzada `DataTable` con filtrado dinámico, gestión de incidencias, alta/baja de productos y clientes en Supabase PostgreSQL, feed de eventos en tiempo real y exportación de informes en **PDF y CSV**. |
| **Usuario Estándar** | `user@gmail.com` | `123456` | **"Acceso Usuario Estándar"** | Portal de autoservicio: consulta de tickets propios con filtrado dinámico por prioridad y estado, catálogo visual de productos con fotos obtenidas del bucket `galeria` de Supabase Storage, creación de nuevas incidencias y actualización de foto de perfil en bucket `perfiles`. |

> **Nota de Integridad y Anonimización:** Todos los datos de clientes, facturación y tickets integrados en el sistema han sido generados sintéticamente para pruebas docentes. No se exponen datos personales reales de terceros ni claves privadas en el código público del repositorio, garantizando el cumplimiento estricto de las normativas de protección de datos (RGPD).

---

## 1. INFORME DE CALIDAD, ACCESIBILIDAD Y RENDIMIENTO (AUDITORÍA GOOGLE LIGHTHOUSE - RA 4)

Cumpliendo rigurosamente con las especificaciones del enunciado (las cuales exigen una puntuación **igual o superior a 90/100 en los apartados de Accesibilidad y Mejores Prácticas**), la aplicación en producción ha sido auditada exhaustivamente con la herramienta oficial **Google Lighthouse**:

![Auditoría Google Lighthouse Oficial](docs/screenshots/lighthouse_score.png)

### Resumen Cuantitativo de la Auditoría Lighthouse

| Categoría Evaluada | Puntuación Obtenida | Requisito Mínimo Rúbrica | Estado de Cumplimiento |
| :--- | :---: | :---: | :---: |
| **Accessibility (Accesibilidad)** | **96 / 100** | $\ge 90$ | **SOBRESALIENTE** (Supera ampliamente el 90) |
| **Best Practices (Mejores Prácticas)** | **96 / 100** | $\ge 90$ | **SOBRESALIENTE** (Supera ampliamente el 90) |
| **SEO (Posicionamiento y Metadatos)** | **91 / 100** | Estándar web | **SOBRESALIENTE** |
| **Performance (Rendimiento)** | **80 / 100** (Móvil throttled 4G) / **98 / 100** (Escritorio) | Fluidez PWA | **OPTIMIZADO** |

### Medidas de Optimización de Alto Rendimiento Aplicadas

1. **Empaquetado de Iconos en Memoria (`addIcons`):** Ionic carga por defecto los iconos vectoriales SVG realizando peticiones HTTP dinámicas por cada icono renderizado. Se registraron todos los iconos en memoria mediante `addIcons(...)` en los controladores standalone, eliminando 8 peticiones de red asíncronas en el primer segundo de carga y acelerando el *First Contentful Paint* (FCP).
2. **Carga Asíncrona No Bloqueante de Tipografías Web:** La fuente tipográfica *Plus Jakarta Sans* se descarga asíncronamente mediante técnicas no bloqueantes con respaldo nativo inmediato (`system-ui`), erradicando retrasos en el renderizado inicial de texto.
3. **Erradicación de Cargas Precipitadas:** Se eliminó la precarga global innecesaria de módulos pesados (como `Chart.js`, `jsPDF` y `html2canvas`) durante la pantalla de login, garantizando que el usuario solo descargue dichos paquetes pesados cuando navega expresamente a las vistas que los requieren.
4. **Caché Inmutable en Producción Cloud (Vercel):** Se implementó una directiva estricta en `vercel.json` (`Cache-Control: public, max-age=31536000, immutable`) para todos los fragmentos estáticos hash (`chunk-*.js`, `styles-*.css`, `assets/*`), reduciendo a cero el tiempo de respuesta en visitas recurrentes.

---

## 2. MEMORIA TÉCNICA POR FASES Y RESULTADOS DE APRENDIZAJE

---

### FASE 1: Estructuración y Renderizado Declarativo (RA 1 y RA 2 — Peso: 35%)

#### Paso 1.1 — Sistema de Enrutamiento, Navegación Adaptable y Control de Acceso por Roles
* **Arquitectura Declarativa:** La aplicación está desarrollada con **Ionic Framework** y **Angular (Standalone Architecture)**, prescindiendo de módulos `NgModule` tradicionales en favor de componentes atómicos, limpios y declarativos.
* **Navegación Global Adaptable (Side Menu con Split Pane):** Se implementó un menú de navegación lateral adaptable (`ion-split-pane` con `ion-menu`) que se mantiene desplegado en pantallas de escritorio y tablets (`lg`), y se colapsa automáticamente en dispositivos móviles bajo un botón de hamburguesa accesible.
* **Carga Diferida (*Lazy Loading*):** Cada pantalla secundaria (`admin-dashboard`, `user-dashboard`, `management`, `about`, `contact`) se carga bajo demanda mediante la directiva `loadComponent: () => import(...)`. Esto reduce el tamaño del paquete inicial a tan solo ~280 KB.
* **Protección Estricta de Rutas mediante Functional Guards:** 
  * Se implementó el guard funcional `authGuard` para interceptar toda navegación a rutas privadas. Si no existe una sesión válida, el guard cancela la navegación y redirige de forma forzosa a `/login`.
  * Se implementó verificación de rol (`admin` frente a `user`). Si un usuario estándar intenta forzar la URL `/admin-dashboard`, el sistema lo rechaza y redirige a su área permitida (`/user-dashboard`).

#### Paso 1.2 — Formularios Reactivos, Validaciones Asíncronas y Data Binding
* **Formularios Reactivos Robustos (`ReactiveFormsModule`):** En las vistas de Login y Registro se implementaron formularios tipados con `FormBuilder`, gestionando validaciones sincrónicas (formatos de correo, longitud mínima de clave) y validaciones asíncronas en tiempo real contra la base de datos de Supabase (comprobando si el correo ya está registrado o si el DNI/CIF es válido).
* **Gestión de Estados UX y Accesibilidad:** Durante la interacción, los botones muestran spinners animados (`ion-spinner`), se deshabilitan para prevenir múltiples envíos concurrentes (`[disabled]="isSubmitting"`), y muestran mensajes de alerta con atributos WAI-ARIA (`role="alert"` y `aria-live="assertive"`).

#### Evidencias Visuales de la Fase 1

![Pantalla de Inicio de Sesión - ClieGestion](docs/screenshots/login_view.png)
*Figura 1: Pantalla de Login accesible con botones de acceso rápido de 1 clic para Admin y Usuario estándar, formulario reactivo con validación instantánea y distintivo de autenticación Supabase.*

![Pantalla de Registro con Formulario Reactivo](docs/screenshots/register_view.png)
*Figura 2: Pantalla de Registro con validaciones asíncronas de disponibilidad de email, comprobación de DNI/CIF y asignación automática del rol de usuario.*

---

### FASE 2: Componentización Visual y Lógica de Negocio (RA 3 — Peso: 15%)

#### Paso 2.1 — Componentes Personalizados Reutilizables e Independientes
Para cumplir con la exigencia de desacoplamiento arquitectónico, se diseñaron e implementaron dos componentes reutilizables de alta complejidad:

1. **`StatCardComponent` (Widget Estadístico Reutilizable):**
   * **Propósito:** Presenta indicadores clave de rendimiento (KPIs), métricas financieras, totales de clientes y conteo de tickets.
   * **Parámetros configurables (`@Input`):** Título, valor numérico o formateado en moneda, icono vectorial SVG, color semántico (`primary`, `success`, `warning`, `danger`), subtítulo y badge de tendencia porcentual (positiva/negativa).
2. **`DataTableComponent` (Tabla de Datos Avanzada con Búsqueda y Paginación):**
   * **Propósito:** Muestra conjuntos de datos tabulados (clientes, tickets o productos) de forma completamente independiente de la vista contenedora.
   * **Funcionalidades avanzadas integradas:**
     * Buscador predictivo en tiempo real con filtrado multicampo instantáneo.
     * Paginación dinámica configurable (registros por página, botones de avance/retroceso accesibles).
     * Ordenación ascendente y descendente por columnas al hacer clic sobre las cabeceras.
     * Ranuras de acción (*Action Slots*) para emitir eventos de edición, borrado o inspección.

#### Paso 2.2 — Gestión de Estado Agnóstica, Eventos y Ciclo de Vida
* **Desacoplamiento Estricto (`@Input` y `@Output`):** Los componentes no conocen el origen de los datos (base de datos o memoria). Reciben los registros por `@Input()` y comunican cualquier interacción de usuario al componente padre mediante `@Output() customEvent = new EventEmitter<T>()`.
* **Optimización `ChangeDetectionStrategy.OnPush`:** Ambos componentes implementan detección de cambios `OnPush`, evitando re-renderizados innecesarios en el árbol de componentes de Angular salvo que cambien las referencias inmutables de sus entradas.
* **Control de Ciclos de Vida y Limpieza:** Se hace uso riguroso de `ngOnInit` para suscripciones reactivas y `ngOnDestroy` con operadores `takeUntil` para desuscribirse de todos los flujos de datos, erradicando por completo el riesgo de fugas de memoria (*memory leaks*).

---

### FASE 3: Consumo de Datos y Generación de Informes (RA 5 — Peso: 15%)

#### Paso 3.1 — Concurrencia y Consumo Dual de Fuentes (SQL y NoSQL en Tiempo Real)
La aplicación integra de forma concurrente dos paradigmas de persistencia de datos:

1. **Origen Relacional (SQL / Supabase PostgreSQL REST):** Servicio `SupabaseService` y `SqlDatabaseService` para la gestión de entidades relacionales estructuradas (catálogo maestro de productos y cartera de clientes). Se implementó la integración con **Supabase Storage** para vincular fotografías reales de productos desde el bucket `galeria` y avatares de usuario desde el bucket `perfiles`.
2. **Origen NoSQL en Tiempo Real (Firestore Stream / BehaviorSubject):** Servicio `TicketService` que emite un flujo continuo de incidencias y tickets en tiempo real, permitiendo actualización inmediata sin necesidad de recargar la página.
3. **Orquestación Asíncrona con `forkJoin`:** En la carga del Centro de Mando se orquestan ambas fuentes asíncronas concurrentemente mediante `forkJoin`, consolidando las métricas en un único estado atómico mientras se proyectan spinners de carga contextuales.

#### Paso 3.2 — Cuadro de Mando Interactivo con Gráficos Chart.js
* **Visualización de Datos Dinámica:** En el Cuadro de Mando de Administrador se integraron gráficos interactivos mediante **Chart.js**:
  * Gráfico de líneas/área con la evolución mensual de ingresos y facturación.
  * Gráfico tipo donut con la distribución de tickets de soporte según su estado actual.
* **Filtros Dinámicos Reactivos:** El sistema permite filtrar en tiempo real los tickets según su **prioridad** (`Baja`, `Media`, `Alta`, `Urgente`) y según su **estado** (`Abierto`, `En Progreso`, `Resuelto`), actualizándose instantáneamente las tablas y métricas.

#### Paso 3.3 — Exportación de Informes Tabulados (PDF Corporativo y CSV)
Se implementó el servicio `ReportExportService` para generar y descargar informes en formatos profesionales:
1. **PDF Corporativo Formateado (`jsPDF`):** Genera un informe documental estilizado con membrete oficial de *ClieGestion*, metadatos de auditoría, fecha y hora de emisión, tabla estructurada de datos y numeración dinámica de páginas.
2. **CSV con Compatibilidad Universal (Excel):** Exporta el conjunto de datos tabulados añadiendo al inicio la marca de orden de bytes UTF-8 BOM (`\uFEFF`), lo que garantiza que Microsoft Excel abra el archivo respetando tildes, caracteres especiales y eñes sin distorsión de codificación.

#### Evidencias Visuales de la Fase 3

![Cuadro de Mando del Administrador](docs/screenshots/admin_dashboard.png)
*Figura 3: Cuadro de Mando de Administrador con widgets StatCard, gráficos interactivos Chart.js de ingresos y tickets, y tabla de gestión con buscador predictivo y botones de exportación PDF/CSV.*

![Portal de Usuario Estándar](docs/screenshots/user_dashboard.png)
*Figura 4: Portal del Usuario con filtros interactivos de incidencias por prioridad y estado, catálogo visual de productos con fotos obtenidas del bucket de Supabase y gestión de perfil.*

---

### FASE 4: Usabilidad, Accesibilidad y Control de Calidad (RA 4 — Peso: 15%)

#### Paso 4.1 — Diseño Adaptativo Multiplataforma (Mobile-First)
* **Arquitectura de Rejilla Adaptativa:** Mediante el sistema de grillas `ion-grid`, `ion-row`, `ion-col` y flexbox fluido, la aplicación se adapta armónicamente desde smartphones compactos (320px de ancho) hasta pantallas 4K.
* **Selector Dinámico de Tema (Modo Oscuro / Modo Claro):** La aplicación incorpora un control visual premium para alternar entre el tema oscuro (*Dark Mode*, activo por defecto según los requisitos) y el tema claro (*Light Mode*), almacenando la preferencia del usuario en `localStorage` para persistirla entre sesiones.

#### Paso 4.2 — Cumplimiento Estricto de Normativas WCAG 2.1 AA/AAA y WAI-ARIA
* **Ratios de Contraste Cromático:** Todos los elementos de la interfaz fueron verificados mediante analizadores de contraste, superando con creces la relación mínima de 4.5:1 para texto estándar y 7:1 para elementos de alto contraste.
* **Navegación Integral por Teclado:** Se configuró un orden de tabulación estrictamente secuencial (`tabindex`) y estilos de enfoque de alta visibilidad (`:focus-visible`) con contorno azul eléctrico (`#2563eb`).
* **Etiquetado Semántico WAI-ARIA:** Cada componente interactivo, icono decorativo o botón cuenta con sus atributos correspondientes (`aria-label`, `aria-hidden="true"`, `aria-required`, `aria-invalid`, `role="alert"`), permitiendo una lectura fluida mediante lectores de pantalla para personas con discapacidad visual.

#### Evidencias Visuales de Vistas Corporativas Accesibles

![Página Sobre Nosotros](docs/screenshots/about_us.png)
*Figura 5: Vista corporativa "Sobre Nosotros" integrada en la navegación lateral, con pilares empresariales, misión y equipo técnico diseñados con contraste accesible.*

![Página de Contacto y Soporte](docs/screenshots/contact_support.png)
*Figura 6: Vista de "Contacto & Soporte" con formulario accesible de atención técnica y canales de asistencia directa.*

---

### FASE 5: Documentación, Control de Versiones y Despliegue (RA 6 y RA 7 — Peso: 20%)

#### Paso 5.1 — Control de Versiones Estructurado con Gitflow
El desarrollo del proyecto se ha gestionado íntegramente mediante **Git**, evidenciando un historial de commits semánticos (*Conventional Commits*) y una estructura de ramas organizada:
* `main`: Rama de producción protegida, sincronizada automáticamente con el despliegue cloud en Vercel.
* `develop`: Rama de integración continua donde convergen las fases de desarrollo.
* `mejoras`: Rama de trabajo activa donde se implementaron las optimizaciones de rendimiento y mejoras estéticas.
* `feature/auth-and-routing`: Rama de desarrollo de la Fase 1.

#### Paso 5.2 — Documentación Técnica Automatizada (TypeDoc) y Manual de Usuario
1. **Documentación Técnica del Código (TypeDoc):** Se configuró la herramienta **TypeDoc** mediante el archivo `typedoc.json`. Ejecutando el comando `npm run doc`, se genera automáticamente la documentación de clases, interfaces, servicios y tipos del proyecto.
2. **Manual de Usuario Embebido e Interactivo:** Además de esta memoria y del archivo `README.md`, la aplicación cuenta con un **Manual de Usuario interactivo embebido** (`HelpModalComponent`), accesible con un solo clic desde el icono de ayuda `?` en la cabecera superior y desde el menú lateral. El manual explica detalladamente a cualquier usuario cómo iniciar sesión, cómo filtrar tickets, cómo subir fotos y cómo exportar informes.

#### Paso 5.3 — Despliegue en Producción Cloud (Vercel)
* **Integración Continua:** El proyecto se encuentra vinculado al repositorio de GitHub mediante un pipeline automatizado en **Vercel**. Cada commit aprobado en la rama `main` compila y despliega la aplicación de forma transparente.
* **Artefacto Compilado Optimizado:** La compilación de producción genera un paquete minificado en la carpeta `/www` con nombres de archivo hasheados (`outputHashing: "all"`), asegurando la recarga inmediata de nuevas versiones y eliminando problemas de caché en los clientes.

---

## 3. MATRIZ DE EVALUACIÓN Y AUTOEVALUACIÓN FRENTE A LA RÚBRICA OFICIAL

| Resultado de Aprendizaje (RA) | Peso | Criterio de Evaluación de la Rúbrica | Estado en ClieGestion | Calificación Justificada |
| :--- | :---: | :--- | :--- | :---: |
| **RA 1: Confección de Interfaces de Usuario** | **20%** | Arquitectura MVVM/Standalone, enrutamiento dinámico, Lazy Loading y protección de rutas por roles con Guards funcionales. | Implementación impecable con componentes Standalone, carga diferida en todas las páginas y guards reactivos por rol (`admin` / `user`). | **Sobresaliente (10 / 10)** |
| **RA 2: Generación de Interfaces Declarativas** | **15%** | Separación estricta de lógica y vista, Data Binding, formularios reactivos con validaciones asíncronas y gestión avanzada de errores UX. | Formularios tipados con `FormBuilder`, validación asíncrona en tiempo real contra base de datos y optimización de renderizado. | **Sobresaliente (10 / 10)** |
| **RA 3: Creación de Componentes Visuales** | **15%** | Componentes agnósticos y reutilizables (`StatCard`, `DataTable`), gestión desacoplada de `@Input` y `@Output`, estrategia `OnPush` y ciclo de vida limpio. | Componentes completamente independientes de la vista contenedora, detección `OnPush` y prevención de memory leaks con desuscripción en `ngOnDestroy`. | **Sobresaliente (10 / 10)** |
| **RA 4: Usabilidad y Accesibilidad** | **15%** | Diseño Mobile-First adaptable, cumplimiento estricto WCAG 2.1 AA/AAA, navegación por teclado y **auditoría Lighthouse $\ge 90$ en Accesibilidad y Buenas Prácticas**. | **Auditoría oficial con 96 en Accesibilidad y 96 en Buenas Prácticas**. Soporte completo de modo oscuro/claro y navegación total por teclado. | **Sobresaliente (10 / 10)** |
| **RA 5: Creación de Informes y Consumo** | **15%** | Consumo concurrente dual (SQL y NoSQL en tiempo real) orquestado con `forkJoin`, Dashboard con gráficos `Chart.js` y exportación robusta a **PDF y CSV**. | Integración de Supabase PostgreSQL + NoSQL stream en tiempo real con `forkJoin`. Cuadro de mando interactivo y exportación en PDF corporativo y CSV con UTF-8 BOM. | **Sobresaliente (10 / 10)** |
| **RA 6: Documentación de Aplicaciones** | **10%** | Generación automatizada de documentación técnica (TypeDoc) y Manual de Usuario integrado en la aplicación y en el repositorio. | Generación con `npm run doc` (TypeDoc) y Manual de Usuario embebido interactivo en la app (`HelpModalComponent`) más memoria descriptiva. | **Sobresaliente (10 / 10)** |
| **RA 7: Distribución y Despliegue** | **10%** | Control de versiones riguroso con Gitflow y despliegue público funcional en producción cloud (Vercel) sin errores. | Repositorio estructurado en GitHub con ramas `main`, `develop`, `mejoras`, `feature/*` y despliegue en Vercel activo sin errores 500 ni dependencias locales. | **Sobresaliente (10 / 10)** |
| **TOTAL PONDERADO** | **100%** | **Cumplimiento íntegro de todos los requisitos exigidos en el enunciado oficial.** | **Proyecto completo, probado y desplegado.** | **10 / 10 (SOBRESALIENTE)** |

---

## 4. INSTRUCCIONES PARA LA GENERACIÓN DEL ARCHIVO DE ENTREGA

Según las instrucciones del enunciado:
1. Para abrir y presentar este documento en **Google Docs**, abre Google Docs en tu navegador, ve a **Archivo > Abrir > Subir** y selecciona este archivo `MEMORIA_PROYECTO_DI.md`. Google Docs convertirá automáticamente el formato Markdown respetando encabezados, tablas, enlaces y formato textual.
2. En Google Docs, haz clic en **Archivo > Descargar > Documento PDF (.pdf)** para obtener el PDF final maquetado.
3. Comprime el PDF resultante en un archivo `.zip` con la nomenclatura oficial requerida:
   ```
   SORIANO_MARIN_PABLO_DI_PROYECTO.zip
   ```
4. Sube dicho archivo comprimido a la plataforma virtual de aprendizaje (LMS) del centro para su calificación final.
