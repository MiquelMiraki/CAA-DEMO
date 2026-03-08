# CAA Analytics Platform — Catálogo de Funcionalidades

> Inventario completo de todas las funcionalidades de la plataforma

---

## Mapa de Funcionalidades

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CAA ANALYTICS PLATFORM                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OVERVIEW          PAID MEDIA        ORGANIC         SALES           │
│  ─────────         ──────────        ───────         ─────           │
│  □ Dashboard       □ Google Ads      □ SEO           □ Sales Perf.  │
│  □ Budget Pacing   □ Meta Ads        □ Web Analytics □ CRM Pipeline │
│  □ Activity Log    □ Bing Ads                                        │
│  □ Alerts          □ Creatives       TOOLS                           │
│  □ Goals           □ Keywords        ─────                           │
│  □ Compare         □ Attribution     □ Forecast                      │
│  □ My Dashboard                      □ Settings                      │
│                                      □ AI Analyst                    │
│                                                                      │
│  PLATAFORMA                                                          │
│  ──────────                                                          │
│  □ Multi-tenant    □ Dark/Light Mode  □ Public API                  │
│  □ Multi-language  □ PDF/CSV Export   □ Onboarding Wizard           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 1. Dashboard Overview

**Ruta**: `/` | **Archivo**: `Dashboard.tsx`

### Qué hace
Vista ejecutiva con los KPIs principales consolidados de todas las plataformas.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **KPI Cards (4)** | Total Spend, Conversions, Revenue, Blended ROAS — con % cambio vs mes anterior |
| **Daily Spend Chart** | Gráfico de área apilada con gasto diario por canal (Google/Meta/Bing) |
| **Spend Distribution** | Donut chart con distribución porcentual del gasto por canal |
| **Monthly ROAS** | Gráfico de barras agrupadas con ROAS mensual por canal |
| **Conversion Funnel** | Funnel visual: Impressions → Clicks → Conversions con tasas de conversión |

### Datos utilizados
- `EXECUTIVE_KPI` (KPIs agregados)
- `CHANNEL_DAILY` (gasto diario)
- `MONTHLY_SUMMARY` (ROAS mensual)
- `FUNNEL` (embudo de conversión)

---

## 2. Platform Pages (Google / Meta / Bing Ads)

**Rutas**: `/google-ads`, `/meta-ads`, `/bing-ads` | **Archivo**: `PlatformPage.tsx`

### Qué hace
Detalle de rendimiento por plataforma publicitaria con drill-down a nivel de campaña.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **KPI Cards** | Spend, Clicks, Conversions, ROAS — específicos del canal |
| **Campaign Table** | Ranking de campañas por ROAS con métricas completas |
| **Daily Trend** | Línea temporal de gasto y conversiones |
| **Device Breakdown** | Rendimiento por Mobile / Desktop / Tablet |
| **Campaign Types** | Desglose por tipo (Search, Shopping, Display, PMax, etc.) |

### Datos utilizados
- `CAMPAIGN_DAILY`, `CAMPAIGN_RANKING`
- `DEVICE_BREAKDOWN`
- `PLACEMENT_BREAKDOWN` (solo Meta)

---

## 3. Budget Pacing

**Ruta**: `/budget-pacing` | **Archivo**: `BudgetPacing.tsx`

### Qué hace
Seguimiento del ritmo de gasto vs presupuesto asignado por campaña y canal.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Status Overview** | Contadores: On Track / Overspending / Underspending |
| **Pacing Table** | Budget mensual, gasto actual, % utilización, días restantes |
| **Progress Bars** | Barras de progreso color-coded por estado de pacing |
| **Remaining Budget** | Presupuesto restante estimado al cierre del mes |

### Estados de pacing
```
🟢 ON_TRACK           80-105% de utilización proporcional
🟡 UNDERSPENDING       50-80% de utilización proporcional
🔴 OVERSPENDING       >105% de utilización proporcional
⚫ SEVERELY_UNDER      <50% de utilización proporcional
```

---

## 4. Activity Log (Change Audit)

**Ruta**: `/change-audit` | **Archivo**: `ChangeAudit.tsx`

### Qué hace
Registro de todos los cambios realizados en las plataformas publicitarias.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Timeline** | Historial cronológico de cambios |
| **Filtros** | Por plataforma, tipo de cambio, fecha |
| **Detail View** | Campo cambiado, valor anterior → valor nuevo |
| **User Attribution** | Quién hizo el cambio (email) |

### Tipos de cambios tracked
- Budget changes, Bid adjustments, Status changes (pause/enable)
- Keyword additions/removals, Ad copy changes, Targeting updates

---

## 5. Alerts & Anomaly Detection

**Ruta**: `/alerts` | **Archivo**: `Alerts.tsx`

### Qué hace
Detección y notificación de anomalías en el rendimiento.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Alert Feed** | Lista cronológica de alertas con severidad |
| **Severity Badges** | Critical / Warning / Info |
| **Metric Context** | Valor actual vs umbral esperado |
| **Channel Filter** | Filtrar alertas por plataforma |

### Tipos de alertas
- CPA spike (>20% sobre media)
- CTR drop significativo
- Budget agotado antes de fin de mes
- Conversiones a cero durante >24h
- ROAS por debajo de target

---

## 6. Goal Tracking

**Ruta**: `/goals` | **Archivo**: `Goals.tsx`

### Qué hace
Definir objetivos de marketing y monitorear progreso en tiempo real.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Goal Form** | Crear objetivo: métrica, operador, target, canal opcional |
| **Goal Cards** | Progreso visual con barra y estado (On Track / At Risk / Off Track) |
| **Summary Bar** | Contadores por estado |
| **Current vs Target** | Valor actual computado vs objetivo definido |

### Métricas disponibles para goals
```
ROAS, CPA, Spend, Revenue, Conversions, Clicks, Impressions, CTR
```

### Operadores
```
> (mayor que), >= (mayor o igual), < (menor que), <= (menor o igual)
```

### Almacenamiento
LocalStorage por cliente: `caa_goals_${clientId}`

---

## 7. Period Comparison

**Ruta**: `/compare` | **Archivo**: `PeriodComparison.tsx`

### Qué hace
Comparación lado a lado de dos periodos de tiempo.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Period Selectors** | Dos selectores independientes con presets (This/Last month, quarter, etc.) |
| **Swap Button** | Intercambiar Period A ↔ Period B |
| **KPI Comparison** | Cards con valores de ambos periodos y delta % |
| **Overlay Chart** | Daily spend de ambos periodos superpuesto |
| **Channel Breakdown** | Tabla con delta por canal y métricas |
| **Bar Chart** | Gasto por canal de ambos periodos agrupado |

### Presets disponibles
- This Month / Last Month
- This Quarter / Last Quarter
- Last 30 days / Previous 30 days
- Custom date range

---

## 8. Custom Dashboard

**Ruta**: `/custom-dashboard` | **Archivo**: `CustomDashboard.tsx`

### Qué hace
Constructor de dashboards personalizados con drag & drop.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Widget Palette** | Biblioteca de widgets disponibles |
| **Grid Layout** | Grid responsive con React Grid Layout |
| **Drag & Drop** | Arrastrar, redimensionar y reposicionar widgets |
| **Save/Load** | Persistencia del layout en localStorage |
| **Widget Types** | KPI cards, charts, tables |

---

## 9. Creative Performance

**Ruta**: `/creatives` | **Archivo**: `Creatives.tsx`

### Qué hace
Análisis de rendimiento de creatividades publicitarias con comparación A/B.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Creative Table** | Lista de creatividades con métricas (ROAS, CTR, CPA) |
| **Format Filter** | Filtrar por formato: Image, Carousel, Video |
| **A/B Comparison** | Comparar dos creatividades lado a lado |
| **Top Performers** | Ranking automático por ROAS |

---

## 10. Keyword Performance

**Ruta**: `/keywords` | **Archivo**: `Keywords.tsx`

### Qué hace
Análisis de keywords con filtros avanzados.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Keyword Table** | Lista con Spend, Clicks, ROAS, CPA por keyword |
| **Search Filter** | Búsqueda de texto libre |
| **Match Type Filter** | Exact / Phrase / Broad |
| **Channel Filter** | Google / Bing |
| **Sort** | Por cualquier columna |

---

## 11. Attribution

**Ruta**: `/attribution` | **Archivo**: `Attribution.tsx`

### Qué hace
Modelos de atribución multi-touch y análisis de overlap entre canales.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Attribution Models** | Visualización de crédito por modelo |
| **Channel Overlap** | Matriz de solapamiento entre canales |
| **Model Comparison** | Comparar resultado de diferentes modelos |
| **Recommendation** | Insights sobre reasignación de presupuesto |

---

## 12. SEO Performance

**Ruta**: `/seo` | **Archivo**: `SEO.tsx`

### Qué hace
Datos de Google Search Console: queries, clicks, impressions, posición media.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **KPI Cards** | Total clicks, impressions, avg CTR, avg position |
| **Query Table** | Keywords orgánicas con métricas |
| **Daily Trend** | Gráfico de clicks e impressions diarios |
| **Position Changes** | Cambios de posición vs mes anterior |

---

## 13. Web Analytics (GA4)

**Ruta**: `/analytics` | **Archivo**: `Analytics.tsx`

### Qué hace
Métricas de Google Analytics 4: sesiones, usuarios, engagement, conversiones por canal.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Traffic Overview** | Sessions, users, engagement rate por canal |
| **Channel Breakdown** | Paid Search, Organic, Direct, Social, Referral |
| **Daily Metrics** | Tendencia diaria de sesiones y conversiones |
| **Conversion Tracking** | Revenue y conversiones por channel grouping |

---

## 14. CRM Pipeline

**Ruta**: `/crm` | **Archivo**: `CRM.tsx`

### Qué hace
Visualización del pipeline de ventas por etapa y fuente de leads.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **KPI Cards** | Total Deals, Pipeline Value, Weighted Pipeline, Won Revenue |
| **Pipeline Chart** | Bar chart por etapa (Prospecting → Closed Won/Lost) |
| **Lead Table** | Fuentes de leads con tasas de conversión y progress bars |

---

## 15. Sales Performance

**Ruta**: `/sales` | **Archivo**: `Sales.tsx`

### Qué hace
Cierra el ciclo: conecta gasto publicitario con ventas reales cerradas.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **KPI Cards (5)** | Closed Revenue, Ad Spend, Real ROI, Win Rate, Avg Deal Size |
| **ROI by Channel** | Barras de gasto vs revenue cerrado + línea de ROI |
| **Full Funnel Table** | Impressions → Clicks → Conversions → Leads → Qualified → Closed |
| **Pipeline by Stage** | Barra horizontal con valor por etapa |
| **Deal Size Distribution** | Donut: Small / Medium / Large / Enterprise |
| **Industry Breakdown** | Tabla con pipeline, won revenue, y win % por vertical |

```
              EL FULL FUNNEL

  Impressions ──► Clicks ──► Conversions ──► Leads ──► Qualified ──► Closed
    500K          25K          1,200          340        120           42
                                                                   €320K
                                                                 ROI: 6.4x
```

---

## 16. Forecast

**Ruta**: `/forecast` | **Archivo**: `Forecast.tsx`

### Qué hace
Proyecciones de rendimiento basadas en tendencias históricas.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Forecast Chart** | Línea histórica + proyección punteada |
| **Scenario Builder** | Simular con +/- % de presupuesto |
| **Channel Forecast** | Proyección independiente por canal |
| **Confidence Bands** | Rangos de confianza en la proyección |

---

## 17. AI Analyst (Chat)

**Ruta**: `/chat` | **Archivo**: `Chat.tsx`

### Qué hace
Asistente de IA conversacional que consulta datos en Snowflake via SQL.

### Elementos

| Elemento | Descripción |
|:---|:---|
| **Chat Interface** | Conversación estilo ChatGPT |
| **Suggestion Cards** | 6 preguntas sugeridas para empezar |
| **SQL Viewer** | Expandible con queries ejecutadas |
| **Copy SQL** | Botón para copiar cada query |
| **Copy Response** | Copiar texto de respuesta |
| **Inline Charts** | Gráficos generados por la IA (Line, Bar, Area, Pie) |
| **Chart Export** | Exportar gráfico como SVG o datos como CSV |
| **PDF Export** | Exportar conversación completa a PDF |
| **File Import** | Drag & drop o click para adjuntar CSV/JSON/TXT/SQL |
| **Conversation Sidebar** | Historial de conversaciones con crear/borrar/continuar |
| **Persistence** | Conversaciones guardadas en localStorage por cliente |

### Capacidades de la IA
```
┌────────────────────────────────────────────────────┐
│  La IA puede:                                      │
│                                                    │
│  ✅ Consultar cualquier tabla del schema del cliente│
│  ✅ Ejecutar SQL SELECT / WITH (max 50 rows)       │
│  ✅ Generar gráficos inline (JSON → Recharts)     │
│  ✅ Comparar periodos, canales, campañas          │
│  ✅ Recomendar acciones basadas en datos          │
│  ✅ Analizar archivos CSV/JSON adjuntados         │
│  ✅ Mantener contexto en la conversación          │
│                                                    │
│  ❌ No puede modificar datos (solo SELECT)         │
│  ❌ No puede acceder a datos de otros clientes     │
│  ❌ No puede ejecutar más de 50 rows por query     │
└────────────────────────────────────────────────────┘
```

---

## 18. Settings

**Ruta**: `/settings` | **Archivo**: `Settings.tsx`

### Secciones

| Sección | Descripción |
|:---|:---|
| **Platform Connections** | Formularios para conectar Google Ads, Meta, Bing, GA4, HubSpot, Snowflake |
| **Data Sync Schedule** | Frecuencia de sincronización (Daily, 12h, 6h, Hourly) + timezone |
| **AI Configuration** | Selector de LLM provider (OpenAI/Anthropic) y modelo |
| **Appearance & Language** | Toggle Dark/Light mode + selector EN/ES |
| **Webhook Notifications** | Slack URL, email, triggers (alerts, goals, daily digest) |
| **Public API** | Gestión de API keys (crear, listar, revocar) + link a docs |
| **Setup Wizard** | Botón para re-ejecutar el onboarding wizard |

---

## 19. Onboarding Wizard

**Componente**: `OnboardingWizard.tsx`

### Qué hace
Guía paso a paso para nuevos usuarios.

### Steps

```
Step 1: WELCOME          → Bienvenida y explicación
Step 2: PLATFORMS         → Conectar plataformas (6 disponibles)
Step 3: REVIEW            → Resumen de conexiones
Step 4: DONE              → Confirmación y acceso al dashboard
```

### Plataformas configurables
- Snowflake (obligatorio)
- Google Ads (opcional)
- Meta Ads (opcional)
- Microsoft Ads (opcional)
- Google Analytics 4 (opcional)
- HubSpot CRM (opcional)

---

## 20. Funcionalidades Transversales

### Multi-Tenant (Multi-Cliente)
```
Selector en sidebar → cambia schema Snowflake → todos los datos se actualizan
Persistencia: localStorage
Aislamiento: cada cliente solo ve sus datos
```

### Dark / Light Mode
```
Toggle en TopBar + Settings
CSS variables dinámicas
Persistencia: localStorage('caa_theme')
```

### Multi-language (EN/ES)
```
Toggle en TopBar + Settings
84 claves de traducción
Cubre: sidebar, dashboards, common UI
Persistencia: localStorage('caa_lang')
```

### Date Range Picker
```
Componente global en TopBar
Presets: Last 7/30/90 days, full months, quarters
Custom range con date inputs
Afecta: todas las páginas de datos
```

### PDF Export
```
Botón en TopBar (todas las páginas excepto Chat/Settings/Compare)
Usa html2canvas + jsPDF
Captura el contenido visible de la página
```

### CSV Export
```
Botón en cada ChartCard
Exporta los datos del gráfico como CSV
Disponible en todas las tablas y gráficos
```

### Public API
```
Base URL: /api/v1/
Auth: X-API-Key header
22 endpoints de datos + 3 admin
Rate limiting configurable
Swagger UI: /api/docs
OpenAPI spec: /api/docs/openapi.json
```

---

## Resumen Numérico

```
┌─────────────────────────────────────────┐
│          NÚMEROS DE LA PLATAFORMA       │
│                                          │
│   17  páginas/vistas                    │
│   28  endpoints internos                │
│   25  endpoints API pública             │
│   20+ tablas Snowflake                  │
│    4  context providers                 │
│    7  componentes shared                │
│    2  idiomas (EN/ES)                   │
│    2  temas (Dark/Light)                │
│   84  claves de traducción             │
│    6  formatos de export                │
│        (PDF, CSV, SVG, SQL copy,        │
│         chart PNG, conversation PDF)    │
│                                          │
│  ~8,000 líneas TypeScript (frontend)    │
│  ~1,500 líneas TypeScript (backend)     │
└─────────────────────────────────────────┘
```

---

*Catálogo de Funcionalidades · CAA Analytics Platform · v1.0 · Marzo 2026*
