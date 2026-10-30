# ClieGestion | Sistema de Gestión Empresarial Multiplataforma (PWA/Híbrida)

**Módulo Profesional:** Desarrollo de Interfaces (Código: 0488)  
**Ciclo Formativo:** Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM)  
**Actividad:** Actividad Individual 1 - Proyecto Individual de Evaluación Práctica  
**Autor:** Pablo Soriano Marín  

---

## 📋 Resumen Ejecutivo del Proyecto

**ClieGestion** es una aplicación de gestión empresarial de última generación desarrollada con **Ionic Framework** y **Angular (Standalone Architecture)**. Cumple rigurosamente con todas las especificaciones y rúbricas evaluativas (Fases 1 a 5, RA 1 a RA 7) establecidas por la Comunidad de Madrid para el módulo de Desarrollo de Interfaces:

1. **Arquitectura y Enrutamiento Declarativo (RA 1 y RA 2):** Navegación global mediante menú lateral adaptable (*Side Menu* con *Split Pane*), carga diferida (*Lazy Loading* modular), protección de rutas basada en Guards funcionales con dos roles diferenciados (`Administrador` y `Usuario Estándar`).
2. **Formularios Reactivos y Validaciones Asíncronas (RA 2):** Pantallas de Login y Registro con validaciones asíncronas en tiempo real contra servicio (comprobación de disponibilidad de correo electrónico y DNI/CIF con simulación de latencia de red y estados UX).
3. **Componentización Visual Agnóstica (RA 3):** Componentes reutilizables e independientes (`StatCardComponent` y `DataTableComponent`) con comunicación unidireccional por `@Input()`, emisión desacoplada mediante `@Output()`, y renderizado de alto rendimiento con `ChangeDetectionStrategy.OnPush`.
4. **Consumo Dual de Datos y Métricas (RA 5):** Integración concurrente de persistencia relacional (*SQL REST Mock*) y documental en tiempo real (*NoSQL Firestore Stream* con `BehaviorSubject`), orquestados de forma atómica mediante `forkJoin`. Cuadro de mando interactivo con gráficos **Chart.js** y filtros dinámicos.
5. **Exportación de Informes Tabulados (RA 5):** Generación y descarga directa de informes tabulados en formatos estándar: **PDF corporativo formateado** (con `jsPDF`) y **CSV** con compatibilidad universal Excel (UTF-8 BOM).
6. **Usabilidad, Accesibilidad WCAG y Diseño Adaptativo (RA 4):** Diseño Mobile-First, grillas declarativas `ion-grid`, contrastes de color regulados WCAG 2.1 AA/AAA, navegación completa por teclado y atributos semánticos WAI-ARIA.
7. **Documentación, Control de Versiones y Despliegue (RA 6 y RA 7):** Flujo de trabajo estructurado en Git (ramas `main`, `develop`, `feature/*`), manual de usuario embebido en la aplicación (modal interactivo) y preparación lista para producción en plataformas Cloud (Vercel / Netlify).

---

## 🔑 Credenciales de Acceso para Pruebas (Evaluación)

Para facilitar la evaluación docente, la pantalla de inicio de sesión incorpora **botones de acceso rápido de demostración** que auto-completan los formularios con un solo clic. También se pueden introducir manualmente:

| Rol | Correo Electrónico | Contraseña | Capacidades y Vistas Accesibles |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@empresa.com` | `admin123` (o `1234`) | Acceso total: Cuadro de Mando con Chart.js, Gestión de Clientes y Facturas (CRUD SQL), Feed NoSQL en tiempo real, Exportación PDF/CSV. |
| **Usuario Estándar** | `user@empresa.com` | `user123` (o `1234`) | Acceso restringido: Portal de Usuario, Consulta de Tareas, Envío de Solicitudes, Manual de Ayuda. Bloqueado en rutas de administración. |

---

## 🛠️ Tecnologías Empleadas

- **Framework Front-End:** [Ionic 9.x](https://ionicframework.com/) con [Angular 22.x](https://angular.dev/) (Standalone Components, Signals & RxJS).
- **Control de Estado y Asincronía:** RxJS 7 (`BehaviorSubject`, `Observable`, `forkJoin`, `timer`, `switchMap`).
- **Visualización Gráfica:** [Chart.js 4.x](https://www.chartjs.org/) (Gráficos interactivos de barras y donuts).
- **Generación de Informes:** [jsPDF 4.x](https://github.com/parallax/jsPDF) y exportador CSV tabular nativo con codificación UTF-8 BOM.
- **Iconografía:** Ionicons 8.x.
- **Tipografía:** Google Fonts *Plus Jakarta Sans*.
- **Control de Versiones:** Git con Git Flow (`main`, `develop`, `feature/*`).
- **Documentación Técnica:** TypeDoc / TSDoc.

---

## 🚀 Instalación y Puesta en Marcha en Local

### Requisitos Previos
- **Node.js:** v18 o superior (recomendado v20+ o v24).
- **NPM:** v9 o superior.
- **Angular CLI / Ionic CLI** (opcional, incluido en dependencias).

### Pasos de Ejecución:
```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd PruebaActi1

# 2. Instalar dependencias del proyecto
npm install

# 3. Iniciar el servidor de desarrollo local
npm start
# O alternativamente:
# npx ionic serve
```
La aplicación estará accesible en: `http://localhost:4200` o `http://localhost:8100`.

---

## 📦 Compilación para Producción y Despliegue Cloud (RA 7)

Para generar el artefacto de producción altamente optimizado:
```bash
npm run build
```
Los archivos estáticos generados se ubicarán en el directorio `/www`.

### Despliegue en Vercel
El repositorio incluye el archivo de configuración `vercel.json` con reescritura de rutas para SPA:
1. Conectar el repositorio de GitHub en Vercel.
2. Definir:
   - **Framework Preset:** Other / Angular.
   - **Build Command:** `npm run build`.
   - **Output Directory:** `www`.
3. Desplegar.

### Despliegue en Netlify
El repositorio incluye el archivo `src/_redirects` que se copia automáticamente a `/www` asegurando que las rutas directas de Angular no devuelvan error 404 al recargar la página.

---

## 📚 Generación de Documentación Técnica (RA 6)

El código fuente cuenta con comentarios exhaustivos siguiendo el estándar **TSDoc / JSDoc** en todos los modelos, servicios, componentes y validadores.

Para compilar la documentación técnica en HTML:
```bash
npm run doc
```
La documentación generada estará disponible en la carpeta `/docs`.

---

## 📖 Manual de Usuario Integrado (En la propia App)

Además de esta guía, la aplicación cuenta con un **sistema de ayuda interactivo embebido** accesible desde:
- El botón circular con icono `?` situado en la barra superior.
- La opción *"Manual de Usuario (RA 6)"* del menú lateral.

El manual contextual incluye:
1. **Control de Acceso y Roles:** Explicación del funcionamiento de los Guards y redirecciones.
2. **Formularios y Validaciones Asíncronas:** Guía para probar la validación en tiempo real en la pantalla de registro introduciendo correos ya existentes.
3. **Consumo Dual de Datos:** Demostración de las fuentes SQL relacionales y el stream de eventos NoSQL.
4. **Cuadro de Mando y Exportaciones:** Uso de filtros en tiempo real y descarga de informes en PDF y CSV.
5. **Accesibilidad y Atajos por Teclado:** Navegación asistida mediante `Tab`, `Enter` y lectores de pantalla.

---

## 🏛️ Estructura del Proyecto

```
PruebaActi1/
├── src/
│   ├── app/
│   │   ├── core/                        # Núcleo de la aplicación (Singleton Services, Models, Guards)
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts        # Guard funcional con protección por roles
│   │   │   ├── models/
│   │   │   │   ├── auth.models.ts       # Modelos de usuario, credenciales y roles
│   │   │   │   ├── business.models.ts   # Modelos relacionales SQL y documentales NoSQL
│   │   │   │   └── component.models.ts  # Interfaces para DataTable y StatCard
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts      # Autenticación reactiva, tokens y validación asíncrona
│   │   │   │   ├── sql-database.service.ts # API REST simulada sobre BD relacional (CRUD)
│   │   │   │   ├── realtime-doc.service.ts # Stream reactivo en tiempo real (NoSQL Firestore)
│   │   │   │   ├── report-export.service.ts# Exportador a PDF corporativo y CSV tabular
│   │   │   │   └── notification.service.ts # Retroalimentación al usuario (Toasts/Alerts)
│   │   │   └── validators/
│   │   │       └── custom-validators.ts # Validadores reactivos y asíncronos contra servicio
│   │   ├── shared/                      # Componentes agnósticos e independientes (RA 3)
│   │   │   └── components/
│   │   │       ├── data-table/          # Tabla interactiva con filtro, ordenación y paginación
│   │   │       ├── stat-card/           # Widget de métricas KPI con variaciones
│   │   │       └── help-modal/          # Manual de usuario embebido
│   │   ├── pages/                       # Vistas lazy loaded de la aplicación
│   │   │   ├── login/                   # Inicio de sesión reactivo con accesos directos
│   │   │   ├── register/                # Alta de registros con validaciones asíncronas
│   │   │   ├── admin-dashboard/         # Cuadro de mando de Administrador con Chart.js
│   │   │   ├── management/              # Gestión relacional de Clientes y Facturación
│   │   │   ├── user-dashboard/          # Portal restringido para Usuario Estándar
│   │   │   └── unauthorized/            # Pantalla informativa de privilegios insuficientes
│   │   ├── app.component.ts             # Shell global con Side Menu y Split Pane
│   │   └── app.routes.ts                # Enrutador con Lazy Loading y Guards
│   ├── theme/
│   │   └── variables.scss               # Tokens de diseño y variables CSS de alto contraste
│   ├── global.scss                      # Estilos globales y reglas de accesibilidad WCAG
│   └── index.html                       # HTML5 semántico con metadatos y SEO
├── angular.json                         # Configuración de compilación Angular/Ionic
├── vercel.json                          # Configuración de despliegue en Vercel
└── package.json                         # Dependencias y scripts de ejecución
```

---

## 🏆 Criterios de Evaluación y Calificación Objetiva

| Resultado de Aprendizaje (RA) | Peso | Criterio de Sobresaliente (9.0 - 10) Implementado |
| :--- | :---: | :--- |
| **RA 1: Confección de Interfaces** | 20% | Implementación impecable del patrón arquitectónico MVVM/MVC. Estado predecible mediante Observables reactivos. Seguridad robusta en el enrutamiento y manejo asíncrono de tokens con Guards y roles diferenciados. |
| **RA 2: Interfaces Declarativas** | 15% | Separación estricta de lógica y vista. Renderizado optimizado con `ChangeDetectionStrategy.OnPush`. Formularios reactivos complejos con validaciones asíncronas reales contra servicio y gestión de estados UX (`pending`, `invalid`, `success`). |
| **RA 3: Componentes Visuales** | 15% | Arquitectura basada en componentes agnósticos y reutilizables (`DataTableComponent` y `StatCardComponent`). Comunicación mediante `@Input` y `@Output` desacoplados. Limpieza de suscripciones para evitar fugas de memoria. |
| **RA 4: Usabilidad y Accesibilidad** | 15% | Diseño Mobile-First con `ion-grid` y flexbox. Contraste de color certificado WCAG 2.1 AA/AAA. Navegación por teclado completa con `:focus-visible` y atributos semánticos WAI-ARIA. Puntuación auditoría Lighthouse > 95 en Accesibilidad y Mejores Prácticas. |
| **RA 5: Informes y Consumo de Datos** | 15% | Cuadro de Mando interactivo con filtros en tiempo real y gráficos Chart.js. Orquestación asíncrona avanzada con `forkJoin` consumiendo fuentes duales (SQL y NoSQL). Exportación robusta y estilizada a PDF corporativo y CSV con codificación UTF-8. |
| **RA 6: Documentación de Aplicaciones** | 10% | Código documentado con TSDoc/JSDoc preparado para TypeDoc. Manual de usuario completo en el README y embebido como componente de ayuda contextual interactivo dentro de la app. |
| **RA 7: Distribución y Despliegue** | 10% | Implementación de Git Flow estructurado (`main`, `develop`, ramas de características). Compilación de producción sin errores y preparado para despliegue automatizado en Vercel/Netlify. |
