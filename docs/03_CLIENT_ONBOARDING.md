# CAA Analytics — Guía de Onboarding de Nuevos Clientes

> Proceso completo para añadir un nuevo cliente a la plataforma

---

## Resumen del Proceso

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  PASO 1 │───►│  PASO 2 │───►│  PASO 3 │───►│  PASO 4 │───►│  PASO 5 │
│         │    │         │    │         │    │         │    │         │
│ Crear   │    │ ETL     │    │ Config  │    │ Verificar│    │ Entregar│
│ Schema  │    │ Pipeline│    │ Frontend│    │ Datos   │    │ al      │
│         │    │         │    │         │    │         │    │ Cliente │
│ ~5 min  │    │ ~2-4h   │    │ ~5 min  │    │ ~30 min │    │ ~15 min │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘

                    Tiempo total estimado: 1 día laborable
```

---

## Paso 1: Crear Schema en Snowflake

### 1.1 Convención de Naming

```
Patrón:  GOLD_<NOMBRE_CLIENTE>

Ejemplos:
  GOLD_ACME       → Cliente "Acme Corp"
  GOLD_NIKE       → Cliente "Nike"
  GOLD_FASHION    → Cliente "Fashion Brand"
  GOLD            → Schema por defecto (demo)
```

**Reglas**:
- Solo mayúsculas, números y guiones bajos
- Siempre empieza con `GOLD_`
- Sin espacios ni caracteres especiales
- Máximo 30 caracteres

### 1.2 SQL para crear el schema

```sql
-- Conectar a Snowflake como admin
USE DATABASE CAA_DB;

-- Crear schema del nuevo cliente
CREATE SCHEMA IF NOT EXISTS GOLD_ACME;

-- Crear todas las tablas necesarias (copiar estructura de GOLD)
CREATE TABLE GOLD_ACME.EXECUTIVE_KPI       LIKE GOLD.EXECUTIVE_KPI;
CREATE TABLE GOLD_ACME.CHANNEL_DAILY       LIKE GOLD.CHANNEL_DAILY;
CREATE TABLE GOLD_ACME.CAMPAIGN_DAILY      LIKE GOLD.CAMPAIGN_DAILY;
CREATE TABLE GOLD_ACME.CAMPAIGN_RANKING    LIKE GOLD.CAMPAIGN_RANKING;
CREATE TABLE GOLD_ACME.MONTHLY_SUMMARY     LIKE GOLD.MONTHLY_SUMMARY;
CREATE TABLE GOLD_ACME.WEEKLY_TRENDS       LIKE GOLD.WEEKLY_TRENDS;
CREATE TABLE GOLD_ACME.DEVICE_BREAKDOWN    LIKE GOLD.DEVICE_BREAKDOWN;
CREATE TABLE GOLD_ACME.PLACEMENT_BREAKDOWN LIKE GOLD.PLACEMENT_BREAKDOWN;
CREATE TABLE GOLD_ACME.CREATIVE_PERFORMANCE LIKE GOLD.CREATIVE_PERFORMANCE;
CREATE TABLE GOLD_ACME.KEYWORD_PERFORMANCE LIKE GOLD.KEYWORD_PERFORMANCE;
CREATE TABLE GOLD_ACME.BUDGET_PACING       LIKE GOLD.BUDGET_PACING;
CREATE TABLE GOLD_ACME.FUNNEL              LIKE GOLD.FUNNEL;
CREATE TABLE GOLD_ACME.CHANGE_AUDIT        LIKE GOLD.CHANGE_AUDIT;
CREATE TABLE GOLD_ACME.GA4_OVERVIEW        LIKE GOLD.GA4_OVERVIEW;
CREATE TABLE GOLD_ACME.GA4_DAILY           LIKE GOLD.GA4_DAILY;
CREATE TABLE GOLD_ACME.SEO_PERFORMANCE     LIKE GOLD.SEO_PERFORMANCE;
CREATE TABLE GOLD_ACME.SEO_DAILY           LIKE GOLD.SEO_DAILY;
CREATE TABLE GOLD_ACME.CRM_PIPELINE        LIKE GOLD.CRM_PIPELINE;
CREATE TABLE GOLD_ACME.CRM_LEAD_FUNNEL     LIKE GOLD.CRM_LEAD_FUNNEL;
CREATE TABLE GOLD_ACME.ATTRIBUTION         LIKE GOLD.ATTRIBUTION;
CREATE TABLE GOLD_ACME.CHANNEL_OVERLAP     LIKE GOLD.CHANNEL_OVERLAP;
CREATE TABLE GOLD_ACME.ALERTS              LIKE GOLD.ALERTS;
CREATE TABLE GOLD_ACME.FORECAST_BASE       LIKE GOLD.FORECAST_BASE;
```

### 1.3 Verificar que aparece en el dropdown

```sql
-- Esta query es la que ejecuta la plataforma para listar clientes
SELECT SCHEMA_NAME
FROM CAA_DB.INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME LIKE 'GOLD%'
ORDER BY SCHEMA_NAME;

-- Resultado esperado:
-- GOLD
-- GOLD_ACME  ← nuevo cliente
```

Una vez creado el schema, el cliente aparecerá automáticamente en el selector del sidebar sin necesidad de reiniciar la aplicación.

---

## Paso 2: Pipeline de Datos (ETL)

### 2.1 Fuentes de datos necesarias

```
┌──────────────────────────────────────────────────────────────┐
│                    FUENTES DEL CLIENTE                       │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Google Ads   │  │ Meta Ads    │  │ Bing Ads    │         │
│  │ API          │  │ API         │  │ API         │         │
│  │ (required)   │  │ (optional)  │  │ (optional)  │         │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                 │                │                 │
│         └────────┬────────┴────────┬───────┘                │
│                  │                 │                         │
│  ┌───────────────▼──┐  ┌──────────▼────────┐               │
│  │ Google Analytics  │  │ Search Console    │               │
│  │ (GA4)             │  │ (SEO)             │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                              │
│  ┌───────────────────┐                                      │
│  │ CRM               │ (HubSpot, Salesforce, etc.)          │
│  │ (optional)         │                                      │
│  └───────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
                          │
                    ETL Process
                    (dbt / Fivetran / custom)
                          │
                          ▼
              ┌───────────────────────┐
              │  GOLD_ACME.*         │
              │  (Snowflake tables)  │
              └───────────────────────┘
```

### 2.2 Credenciales necesarias por plataforma

| Plataforma | Credenciales Requeridas |
|:---|:---|
| **Google Ads** | Customer ID, Developer Token, OAuth Client ID/Secret, Refresh Token |
| **Meta Ads** | Ad Account ID, Long-lived Access Token, App ID/Secret |
| **Microsoft Ads** | Account ID, Customer ID, Developer Token, OAuth credentials |
| **GA4** | Property ID, Service Account JSON Key |
| **Search Console** | Service Account con acceso a la propiedad |
| **HubSpot** | Private App Token, Portal ID |

### 2.3 Tablas mínimas para primera versión

```
Prioridad ALTA (necesarias para el dashboard):
  ✅ CHANNEL_DAILY
  ✅ EXECUTIVE_KPI
  ✅ CAMPAIGN_DAILY
  ✅ MONTHLY_SUMMARY

Prioridad MEDIA (enriquecen la experiencia):
  ⬜ CAMPAIGN_RANKING
  ⬜ WEEKLY_TRENDS
  ⬜ DEVICE_BREAKDOWN
  ⬜ BUDGET_PACING
  ⬜ FUNNEL

Prioridad BAJA (features avanzadas):
  ⬜ CREATIVE_PERFORMANCE
  ⬜ KEYWORD_PERFORMANCE
  ⬜ PLACEMENT_BREAKDOWN
  ⬜ ATTRIBUTION / CHANNEL_OVERLAP
  ⬜ GA4_* / SEO_*
  ⬜ CRM_*
  ⬜ FORECAST_BASE
  ⬜ ALERTS / CHANGE_AUDIT
```

Las páginas que no tengan datos simplemente mostrarán estados vacíos — no rompen la plataforma.

### 2.4 Formato de datos esperado

Cada tabla tiene un schema específico. Para insertar datos correctamente, usar como referencia las columnas de GOLD:

```sql
-- Ver columnas de una tabla
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM CAA_DB.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'GOLD' AND TABLE_NAME = 'CHANNEL_DAILY'
ORDER BY ORDINAL_POSITION;
```

### 2.5 Script de carga ejemplo (CSV)

```sql
-- Cargar datos desde un stage
CREATE OR REPLACE STAGE GOLD_ACME.STAGING;

PUT file://channel_daily.csv @GOLD_ACME.STAGING;

COPY INTO GOLD_ACME.CHANNEL_DAILY
FROM @GOLD_ACME.STAGING/channel_daily.csv
FILE_FORMAT = (TYPE = 'CSV' SKIP_HEADER = 1 FIELD_OPTIONALLY_ENCLOSED_BY = '"');
```

---

## Paso 3: Configuración del Frontend

### No se requiere configuración adicional del frontend.

El sistema detecta automáticamente nuevos schemas gracias al endpoint `/api/data/clients` que ejecuta:

```sql
SELECT SCHEMA_NAME FROM CAA_DB.INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME LIKE 'GOLD%'
```

El nuevo cliente aparecerá en el dropdown del sidebar automáticamente.

### 3.1 Personalización opcional

Si quieres que el nombre del cliente se muestre diferente al schema:

```
Schema: GOLD_ACME  →  Nombre mostrado: "ACME"
                       (se elimina el prefijo GOLD_ automáticamente)
```

Para nombres más descriptivos, se puede crear una tabla de metadata:

```sql
CREATE TABLE GOLD.CLIENT_METADATA (
  SCHEMA_NAME VARCHAR,
  DISPLAY_NAME VARCHAR,
  LOGO_URL VARCHAR,
  PRIMARY_COLOR VARCHAR
);

INSERT INTO GOLD.CLIENT_METADATA VALUES
  ('GOLD_ACME', 'Acme Corporation', '/logos/acme.png', '#FF6B00');
```

---

## Paso 4: Verificación

### Checklist de verificación

```
┌──────────────────────────────────────────────────────────────┐
│                    CHECKLIST DE VERIFICACIÓN                  │
│                                                              │
│  □  El schema aparece en el selector de clientes             │
│  □  Dashboard muestra KPIs del nuevo cliente                 │
│  □  Google Ads page muestra campañas                         │
│  □  El date picker filtra datos correctamente                │
│  □  AI Chat responde con datos del cliente seleccionado      │
│  □  PDF export funciona                                      │
│  □  El cambio de cliente no muestra datos del anterior       │
│  □  La página de Budget Pacing muestra datos coherentes      │
│  □  Goals se guardan por separado para cada cliente          │
│  □  Las conversaciones del chat son independientes           │
└──────────────────────────────────────────────────────────────┘
```

### Comandos de verificación rápida

```sql
-- Verificar que hay datos
SELECT COUNT(*) as rows, MIN(DATE) as first_date, MAX(DATE) as last_date
FROM GOLD_ACME.CHANNEL_DAILY;

-- Verificar KPIs
SELECT * FROM GOLD_ACME.EXECUTIVE_KPI;

-- Verificar campañas
SELECT DISTINCT CHANNEL, COUNT(DISTINCT CAMPAIGN_NAME) as campaigns
FROM GOLD_ACME.CAMPAIGN_DAILY
GROUP BY CHANNEL;
```

---

## Paso 5: Entrega al Cliente

### 5.1 Acceso

Proporcionar al cliente:
1. **URL del dashboard**: `https://caa.miraki.ai` (o dominio personalizado)
2. **Instrucciones**: Seleccionar su empresa en el dropdown del sidebar
3. **Onboarding wizard**: Se mostrará automáticamente en la primera visita

### 5.2 API Key (si aplica)

Para clientes que necesitan acceso programático:

```bash
# Crear API key restringida a su schema
POST /api/v1/keys
Headers: X-API-Key: <admin_key>
Body: {
  "name": "ACME Integration",
  "client_schema": "GOLD_ACME",
  "scopes": ["read"],
  "rate_limit": 60
}
```

### 5.3 Documentación para el cliente

Compartir:
- URL de Swagger UI: `https://api.example.com/api/docs`
- Su API key (una sola vez, no se puede recuperar después)
- Rate limit asignado

---

## Troubleshooting

### El cliente no aparece en el dropdown

```
Causa: El schema no sigue el patrón GOLD_*
Fix: Renombrar schema → ALTER SCHEMA ACME RENAME TO GOLD_ACME;
```

### Las páginas muestran "No data available"

```
Causa: Las tablas existen pero están vacías
Fix: Cargar datos con COPY INTO o INSERT INTO
```

### El AI Chat no responde con datos del cliente

```
Causa: El schema del cliente no se pasa correctamente
Fix: Verificar que el ClientContext está activo y que
     la llamada a /api/chat incluye el parámetro "client"
```

### Error 500 al acceder a una página

```
Causa: Una tabla no existe en el schema del cliente
Fix: Crear la tabla faltante con CREATE TABLE GOLD_ACME.X LIKE GOLD.X
```

---

## Script Completo de Onboarding

```sql
-- ============================================
-- ONBOARDING SCRIPT: Nuevo cliente
-- Reemplazar NOMBRE_CLIENTE por el nombre real
-- ============================================

USE DATABASE CAA_DB;

-- 1. Crear schema
CREATE SCHEMA IF NOT EXISTS GOLD_NOMBRE_CLIENTE;

-- 2. Crear todas las tablas (copiar estructura)
CREATE TABLE GOLD_NOMBRE_CLIENTE.EXECUTIVE_KPI       LIKE GOLD.EXECUTIVE_KPI;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CHANNEL_DAILY        LIKE GOLD.CHANNEL_DAILY;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CAMPAIGN_DAILY       LIKE GOLD.CAMPAIGN_DAILY;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CAMPAIGN_RANKING     LIKE GOLD.CAMPAIGN_RANKING;
CREATE TABLE GOLD_NOMBRE_CLIENTE.MONTHLY_SUMMARY      LIKE GOLD.MONTHLY_SUMMARY;
CREATE TABLE GOLD_NOMBRE_CLIENTE.WEEKLY_TRENDS        LIKE GOLD.WEEKLY_TRENDS;
CREATE TABLE GOLD_NOMBRE_CLIENTE.DEVICE_BREAKDOWN     LIKE GOLD.DEVICE_BREAKDOWN;
CREATE TABLE GOLD_NOMBRE_CLIENTE.PLACEMENT_BREAKDOWN  LIKE GOLD.PLACEMENT_BREAKDOWN;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CREATIVE_PERFORMANCE LIKE GOLD.CREATIVE_PERFORMANCE;
CREATE TABLE GOLD_NOMBRE_CLIENTE.KEYWORD_PERFORMANCE  LIKE GOLD.KEYWORD_PERFORMANCE;
CREATE TABLE GOLD_NOMBRE_CLIENTE.BUDGET_PACING        LIKE GOLD.BUDGET_PACING;
CREATE TABLE GOLD_NOMBRE_CLIENTE.FUNNEL               LIKE GOLD.FUNNEL;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CHANGE_AUDIT         LIKE GOLD.CHANGE_AUDIT;
CREATE TABLE GOLD_NOMBRE_CLIENTE.GA4_OVERVIEW         LIKE GOLD.GA4_OVERVIEW;
CREATE TABLE GOLD_NOMBRE_CLIENTE.GA4_DAILY            LIKE GOLD.GA4_DAILY;
CREATE TABLE GOLD_NOMBRE_CLIENTE.SEO_PERFORMANCE      LIKE GOLD.SEO_PERFORMANCE;
CREATE TABLE GOLD_NOMBRE_CLIENTE.SEO_DAILY            LIKE GOLD.SEO_DAILY;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CRM_PIPELINE         LIKE GOLD.CRM_PIPELINE;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CRM_LEAD_FUNNEL      LIKE GOLD.CRM_LEAD_FUNNEL;
CREATE TABLE GOLD_NOMBRE_CLIENTE.ATTRIBUTION          LIKE GOLD.ATTRIBUTION;
CREATE TABLE GOLD_NOMBRE_CLIENTE.CHANNEL_OVERLAP      LIKE GOLD.CHANNEL_OVERLAP;
CREATE TABLE GOLD_NOMBRE_CLIENTE.ALERTS               LIKE GOLD.ALERTS;
CREATE TABLE GOLD_NOMBRE_CLIENTE.FORECAST_BASE        LIKE GOLD.FORECAST_BASE;

-- 3. Verificar
SELECT SCHEMA_NAME FROM CAA_DB.INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME LIKE 'GOLD%' ORDER BY SCHEMA_NAME;

-- 4. Resultado: El cliente ya es visible en la plataforma
-- Ahora cargar datos via ETL/CSV/API
```

---

*Guía de Onboarding · CAA Analytics Platform · v1.0 · Marzo 2026*
