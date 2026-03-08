# CAA Analytics Platform — Documentación Técnica

> Arquitectura, stack tecnológico y funcionamiento interno

---

## 1. Arquitectura General

```
                    ┌─────────────────────────────────────────────┐
                    │              USUARIO (Browser)              │
                    └──────────────────┬──────────────────────────┘
                                       │
                              HTTPS (Vercel CDN)
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │            FRONTEND (React SPA)             │
                    │                                              │
                    │  React 19 + TypeScript + Vite + Tailwind    │
                    │  Recharts + React Router + Lucide Icons     │
                    │                                              │
                    │  Deploy: Vercel (auto-deploy from master)   │
                    └──────────────────┬──────────────────────────┘
                                       │
                              REST API calls
                              (fetch + CORS)
                                       │
                    ┌──────────────────▼──────────────────────────┐
                    │             BACKEND (Express)               │
                    │                                              │
                    │  Node.js + TypeScript + Express 5           │
                    │                                              │
                    │  Módulos:                                    │
                    │  ├─ /api/data/*    (internal, no auth)      │
                    │  ├─ /api/v1/*     (public, API key auth)   │
                    │  ├─ /api/chat     (AI agent)               │
                    │  ├─ /api/docs     (Swagger UI)             │
                    │  └─ /api/health   (health check)           │
                    │                                              │
                    │  Deploy: Railway / Node PaaS                │
                    └─────────┬─────────────────┬────────────────┘
                              │                 │
                    Snowflake SDK         OpenAI API
                              │                 │
              ┌───────────────▼───┐   ┌─────────▼────────┐
              │    SNOWFLAKE      │   │     OpenAI       │
              │                   │   │                  │
              │  Database: CAA_DB │   │  Model: GPT-4o   │
              │  Schema: GOLD     │   │  Agentic loop    │
              │  20+ tables       │   │  Tool use (SQL)  │
              │  Multi-tenant     │   │                  │
              │  (GOLD_*)         │   │                  │
              └───────────────────┘   └──────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend

| Componente | Tecnología | Versión |
|:---|:---|:---|
| Framework | React | 19.2.0 |
| Lenguaje | TypeScript | ~5.9.3 |
| Bundler | Vite | 7.3.1 |
| CSS | Tailwind CSS | 4.2.1 |
| Gráficos | Recharts | 3.7.0 |
| Routing | React Router DOM | 7.13.1 |
| Iconos | Lucide React | 0.577.0 |
| Markdown | React Markdown | 10.1.0 |
| PDF Export | jsPDF + html2canvas | 4.2.0 / 1.4.1 |
| Grid Layout | React Grid Layout | 2.2.2 |

### Backend

| Componente | Tecnología | Versión |
|:---|:---|:---|
| Runtime | Node.js | LTS |
| Lenguaje | TypeScript | 5.9.3 |
| Framework | Express | 5.2.1 |
| Database Driver | snowflake-sdk | 2.3.4 |
| LLM SDK | OpenAI | 6.27.0 |
| Rate Limiting | express-rate-limit | 8.3.0 |
| Auth | Custom API Key middleware | — |
| UUID | uuid | 13.0.0 |

---

## 3. Estructura de Archivos

```
CAA_DEMO/
├── src/agent/                          # BACKEND
│   ├── server.ts                       # Express app, routing, startup
│   ├── agent.ts                        # AI agentic loop (OpenAI tool use)
│   ├── schema-context.ts              # LLM system prompt + table schemas
│   ├── snowflake-client.ts            # Snowflake connection + query execution
│   ├── data-routes.ts                 # Internal API routes (28 endpoints)
│   ├── public-api.ts                  # Public API v1 (22 data + 3 admin)
│   ├── api-keys.ts                    # API key CRUD + validation
│   ├── api-middleware.ts              # Auth, rate limit, response wrappers
│   └── api-docs.ts                    # OpenAPI 3.0 spec + Swagger UI
│
├── frontend/src/                       # FRONTEND
│   ├── main.tsx                        # Vite entry point
│   ├── App.tsx                         # Root router + providers
│   ├── index.css                       # Global styles + theme overrides
│   │
│   ├── pages/                          # 17 page components
│   │   ├── Dashboard.tsx              # KPI overview (234 lines)
│   │   ├── PlatformPage.tsx           # Google/Meta/Bing detail
│   │   ├── Analytics.tsx              # GA4 analytics
│   │   ├── SEO.tsx                    # Search Console
│   │   ├── CRM.tsx                    # Sales pipeline
│   │   ├── Sales.tsx                  # End-to-end ROI (487 lines)
│   │   ├── Attribution.tsx            # Multi-touch models
│   │   ├── Alerts.tsx                 # Anomaly detection
│   │   ├── BudgetPacing.tsx           # Budget tracking
│   │   ├── Creatives.tsx              # Creative A/B testing
│   │   ├── Keywords.tsx               # Keyword performance
│   │   ├── ChangeAudit.tsx            # Activity log
│   │   ├── Forecast.tsx               # Time series forecast
│   │   ├── Goals.tsx                  # Goal tracking (470 lines)
│   │   ├── PeriodComparison.tsx       # Period comparison (280 lines)
│   │   ├── CustomDashboard.tsx        # Drag & drop builder
│   │   ├── Chat.tsx                   # AI chat (656 lines)
│   │   └── Settings.tsx               # Configuration (791 lines)
│   │
│   ├── components/                     # Shared UI
│   │   ├── Sidebar.tsx                # Navigation (153 lines)
│   │   ├── DateRangePicker.tsx        # Date selector
│   │   ├── KPICard.tsx                # Metric card
│   │   ├── ChartCard.tsx              # Chart wrapper
│   │   ├── ChartTooltip.tsx           # Custom tooltip
│   │   ├── LoadingSpinner.tsx         # Loading state
│   │   └── OnboardingWizard.tsx       # Setup flow (490 lines)
│   │
│   ├── contexts/                       # State management
│   │   ├── ClientContext.tsx           # Multi-tenant client selection
│   │   ├── DateRangeContext.tsx        # Global date range
│   │   ├── ThemeContext.tsx            # Dark/light mode
│   │   └── LanguageContext.tsx         # EN/ES translations
│   │
│   ├── hooks/
│   │   └── useData.ts                 # Generic data fetching hook
│   │
│   ├── api/
│   │   └── client.ts                  # API client (28 methods)
│   │
│   └── utils/
│       ├── exportPdf.ts               # PDF export
│       └── exportCsv.ts               # CSV export
│
├── docs/                               # DOCUMENTACIÓN
├── package.json                        # Backend dependencies
├── frontend/package.json               # Frontend dependencies
├── tsconfig.json                       # TypeScript config
└── .env                                # Environment variables
```

---

## 4. Flujo de Datos

### Request Flow (Frontend → Backend → Snowflake)

```
1. Usuario navega a /google-ads
   │
2. PlatformPage.tsx monta, llama useData()
   │
3. useData() ejecuta api.getCampaigns('Google Ads', range)
   │
4. client.ts construye URL:
   │  GET /api/data/campaigns?channel=Google+Ads&from=2026-01-01&to=2026-03-31&client=GOLD
   │
5. Express route en data-routes.ts:
   │  - Extrae schema con getSchema(req) → "GOLD"
   │  - Construye SQL: SELECT * FROM GOLD.CAMPAIGN_RANKING WHERE CHANNEL='Google Ads'...
   │  - Llama executeQuery(sql)
   │
6. snowflake-client.ts:
   │  - Ejecuta query via snowflake-sdk
   │  - Retorna {columns, rows, rowCount}
   │
7. Express responde con JSON (array de rows)
   │
8. useData() actualiza state → componente re-render con datos
```

### AI Chat Flow

```
1. Usuario escribe: "¿Qué campañas tienen peor ROAS?"
   │
2. Chat.tsx → POST /api/chat {message, sessionId, client}
   │
3. server.ts → chat(message, history, schema)
   │
4. agent.ts → Agentic loop:
   │
   │  Round 1: GPT-4o decide usar tool "execute_sql"
   │           SQL: SELECT CAMPAIGN_NAME, ROAS FROM GOLD.CAMPAIGN_RANKING
   │                WHERE MONTH = '2026-03-01' ORDER BY ROAS ASC LIMIT 10
   │
   │  Round 2: GPT-4o analiza resultados, genera respuesta con datos
   │           + opcionalmente genera ```chart JSON para visualización
   │
5. Respuesta: {response, queriesExecuted: 1, sqlQueries: [...], elapsed: 3.2}
   │
6. Chat.tsx renderiza markdown + charts inline
   │  - SQL queries expandibles con "Copy SQL"
   │  - Charts exportables a SVG/CSV
```

---

## 5. Sistema de Autenticación

### Internal API (Frontend)
- **Sin autenticación** — las rutas `/api/data/*` son abiertas
- CORS habilitado globalmente
- El schema del cliente se pasa como `?client=GOLD`
- Sanitización: solo acepta pattern `/^GOLD[A-Z0-9_]*$/i`

### Public API v1
```
Request:
  GET /api/v1/kpi?client=GOLD&from=2026-01-01&to=2026-03-31
  Headers:
    X-API-Key: caa_a1b2c3d4e5f6...

Respuesta exitosa (200):
  {
    "data": [...],
    "meta": {
      "timestamp": "2026-03-08T...",
      "schema": "GOLD",
      "count": 1,
      "limit": 100,
      "offset": 0
    }
  }

Respuesta error (401):
  {
    "error": {
      "code": "MISSING_API_KEY",
      "message": "Provide your API key in the X-API-Key header."
    },
    "meta": { "timestamp": "..." }
  }
```

### Scopes y Permisos

| Scope | Acceso |
|:---|:---|
| `read` | Todos los endpoints GET de datos |
| `write` | (Reservado para futuras operaciones de escritura) |
| `admin` | Gestión de API keys (crear, listar, revocar) |

### Rate Limiting
- Configurable por API key (default: 60 req/min)
- Ventana: 1 minuto sliding window
- Headers estándar: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

---

## 6. Modelo de Datos (Snowflake)

### Diagrama de Relaciones

```
                        ┌──────────────┐
                        │EXECUTIVE_KPI │ (1 row, aggregated)
                        └──────┬───────┘
                               │ derived from
                ┌──────────────▼───────────────┐
                │        CHANNEL_DAILY          │ (270 rows)
                │  DATE | CHANNEL | SPEND | ... │
                └──────────────┬───────────────┘
                               │ aggregated by
          ┌────────────────────▼────────────────────┐
          │            CAMPAIGN_DAILY                │ (2,500 rows)
          │  DATE | CHANNEL | CAMPAIGN_ID | SPEND.. │
          └───┬────────┬────────┬───────────────────┘
              │        │        │
    ┌─────────▼──┐  ┌──▼────┐  ┌▼──────────────┐
    │  KEYWORD   │  │DEVICE │  │  CREATIVE      │
    │PERFORMANCE │  │BREAK  │  │  PERFORMANCE   │
    │  (search)  │  │DOWN   │  │  (display/     │
    │            │  │       │  │   social)      │
    └────────────┘  └───────┘  └────────────────┘

    ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
    │ MONTHLY       │  │ WEEKLY       │  │ CAMPAIGN     │
    │ SUMMARY       │  │ TRENDS       │  │ RANKING      │
    │ (9 rows)      │  │ (42 rows)    │  │ (84 rows)    │
    └───────────────┘  └──────────────┘  └──────────────┘

    ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
    │ BUDGET        │  │ FUNNEL       │  │ PLACEMENT    │
    │ PACING        │  │              │  │ BREAKDOWN    │
    └───────────────┘  └──────────────┘  └──────────────┘

    ┌───────────────┐  ┌──────────────┐
    │ GA4_OVERVIEW  │  │ GA4_DAILY    │  (Web Analytics)
    └───────────────┘  └──────────────┘

    ┌───────────────┐  ┌──────────────┐
    │ SEO_PERFORM.  │  │ SEO_DAILY    │  (Search Console)
    └───────────────┘  └──────────────┘

    ┌───────────────┐  ┌──────────────┐
    │ CRM_PIPELINE  │  │ CRM_LEAD     │  (Sales/CRM)
    │               │  │ FUNNEL       │
    └───────────────┘  └──────────────┘

    ┌───────────────┐  ┌──────────────┐
    │ ATTRIBUTION   │  │ CHANNEL      │  (Attribution)
    │               │  │ OVERLAP      │
    └───────────────┘  └──────────────┘

    ┌───────────────┐  ┌──────────────┐
    │ ALERTS        │  │ CHANGE_AUDIT │  (Monitoring)
    └───────────────┘  └──────────────┘

    ┌───────────────┐
    │ FORECAST_BASE │  (Forecasting)
    └───────────────┘
```

### Patrón Multi-Tenant

```
CAA_DB
├── GOLD              ← Schema por defecto (demo / default client)
│   ├── EXECUTIVE_KPI
│   ├── CHANNEL_DAILY
│   ├── CAMPAIGN_DAILY
│   └── ... (20+ tablas)
│
├── GOLD_ACME         ← Cliente "ACME"
│   ├── EXECUTIVE_KPI
│   ├── CHANNEL_DAILY
│   └── ... (mismas tablas, datos del cliente)
│
├── GOLD_NIKE         ← Cliente "NIKE"
│   └── ...
│
└── INFORMATION_SCHEMA ← Metadata para discovery
```

---

## 7. Variables de Entorno

### Backend (.env)

```bash
# ── Snowflake (obligatorias) ──
SNOWFLAKE_ACCOUNT=xxxx-xxxxx         # Account identifier
SNOWFLAKE_USERNAME=user              # Username
SNOWFLAKE_PASSWORD=pass              # Password
SNOWFLAKE_DATABASE=CAA_DB            # Database name
SNOWFLAKE_WAREHOUSE=COMPUTE_WH      # Warehouse
SNOWFLAKE_DEFAULT_SCHEMA=GOLD        # Default schema

# ── LLM (obligatoria) ──
OPENAI_API_KEY=sk-proj-...           # OpenAI API key for AI chat

# ── Server ──
PORT=3001                             # Express port

# ── API Keys (opcional) ──
CAA_API_MASTER_KEY=caa_xxx...        # Master key for public API
                                      # Auto-generated if not set
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001/api  # Backend URL (optional, defaults to /api)
```

---

## 8. Sistema de Temas (CSS Variables)

```css
/* Dark Theme (default) */
--color-bg:             #000000
--color-surface:        #0A0A0A
--color-surface-hover:  #111111
--color-border:         #1A1A1A
--color-gold:           #C8A84E
--color-gold-light:     #E8D5A0
--color-gold-dim:       rgba(200, 168, 78, 0.15)
--color-text:           #FFFFFF
--color-text-secondary: #808080
--color-text-muted:     #4A4A4A
--color-success:        #22C55E
--color-error:          #EF4444

/* Light Theme */
--color-bg:             #F5F5F5
--color-surface:        #FFFFFF
--color-border:         #E0E0E0
--color-text:           #111111
--color-text-secondary: #555555
--color-text-muted:     #999999
```

El ThemeContext aplica estas variables dinámicamente al `document.documentElement.style`.

---

## 9. Scripts de Desarrollo

```bash
# Backend
npm run agent          # Iniciar backend con ts-node (dev)
npm run build          # Compilar TypeScript a dist/
npm start              # Ejecutar build compilado

# Frontend
cd frontend
npm run dev            # Vite dev server (HMR)
npm run build          # Build de producción
npm run preview        # Preview del build
```

---

## 10. Seguridad

### Implementado
- API keys con hash prefix (`caa_`)
- Rate limiting por key
- Schema validation (regex whitelist)
- SQL quote escaping en parámetros
- Secrets solo en `.env` (nunca hardcoded)
- `.env` en `.gitignore`
- CORS habilitado

### Recomendado para Producción
- Parametrized queries (bind variables) en Snowflake
- HTTPS forzado en backend
- JWT tokens para sesiones del dashboard
- Rotación de API keys
- Audit logging de queries
- WAF / DDoS protection

---

*Documentación técnica · CAA Analytics Platform · v1.0 · Marzo 2026*
