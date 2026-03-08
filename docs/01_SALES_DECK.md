# CAA Analytics Platform — Sales Deck

> **Miraki AI** · Cross-Channel Advertising Analytics
> Documento de producto para reuniones comerciales

---

## El Problema

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Las agencias y equipos de marketing digital enfrentan:            │
│                                                                     │
│   ❌  Datos dispersos en 5+ plataformas diferentes                  │
│   ❌  Horas semanales creando reportes manuales                     │
│   ❌  Sin visibilidad del ROI real (gasto → venta cerrada)          │
│   ❌  Decisiones basadas en intuición, no en datos                  │
│   ❌  Sin alertas tempranas de anomalías o desviaciones             │
│   ❌  Cada cliente requiere setup manual desde cero                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## La Solución: CAA Analytics

Una plataforma unificada que centraliza **Google Ads, Meta Ads, Microsoft Ads, GA4, Search Console y CRM** en un solo dashboard con IA integrada.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│          Google Ads ──┐                                             │
│          Meta Ads   ──┤                                             │
│          Bing Ads   ──┼──► SNOWFLAKE ──► CAA ANALYTICS ──► CLIENTE │
│          GA4        ──┤      (Data       (Dashboard +      (Toma   │
│          Search     ──┤     Warehouse)    IA + API)        decisión│
│          CRM        ──┘                                     es)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Propuesta de Valor

### Para Agencias de Marketing

| Antes (sin CAA) | Después (con CAA) |
|:---|:---|
| 8h/semana haciendo reportes | Reportes automáticos en 1 click |
| Excel con datos de ayer | Dashboard en tiempo real |
| "El ROAS es 3x" (pero ¿cerró la venta?) | ROI real: gasto → venta cerrada |
| El cliente pregunta, tú buscas datos | El cliente tiene su propio dashboard |
| Un dashboard genérico para todos | Cada cliente ve SUS datos aislados |

### Para Equipos de Marketing In-House

| Antes | Después |
|:---|:---|
| Login en 5 plataformas distintas | Un solo dashboard unificado |
| Sin attribution cross-channel | Attribution multi-touch completa |
| Budget pacing manual en spreadsheets | Alertas automáticas de pacing |
| Sin forecast de rendimiento | Forecast con escenarios de budget |
| Reportes que nadie lee | Pregúntale a la IA lo que quieras |

---

## Funcionalidades Clave

### 1. Dashboard Ejecutivo
Vista unificada de KPIs: Gasto, Conversiones, Revenue, ROAS blended — con comparación vs mes anterior.

### 2. Análisis por Plataforma
Google Ads (Search, Shopping, Display, PMax), Meta Ads (por placement y formato), Microsoft Ads — cada uno con sus métricas específicas.

### 3. AI Analyst (Chat Conversacional)
```
┌─────────────────────────────────────────────────┐
│ Usuario: "¿Qué campañas debería pausar?"        │
│                                                  │
│ AI: Basado en los datos de los últimos 30 días, │
│ estas 3 campañas tienen ROAS < 1x:              │
│                                                  │
│ • Campaign_ES_Search_Generic — ROAS 0.4x        │
│ • Campaign_EU_Display_Retargeting — ROAS 0.7x   │
│ • Campaign_ES_Shopping_Low — ROAS 0.8x          │
│                                                  │
│ [Ver SQL] [Copiar] [Exportar PDF]               │
└─────────────────────────────────────────────────┘
```
- Consulta datos reales via SQL
- Genera gráficos inline
- Exportable a PDF
- Historial de conversaciones persistente

### 4. Sales Performance (Cierre de Ciclo)
```
AD SPEND ──► LEADS ──► QUALIFIED ──► CLOSED WON
 €50K         340       120           42 deals
                                      €320K revenue
                                      ROI real: 6.4x
```
Conecta el gasto publicitario con las ventas reales del CRM.

### 5. Attribution Multi-Touch
Entiende qué canales realmente contribuyen a la conversión, no solo el último click.

### 6. Budget Pacing
Seguimiento diario del presupuesto con alertas de over/underspending.

### 7. Alertas & Anomalías
Detección automática de cambios significativos: CPA spike, CTR drop, budget agotado.

### 8. Comparación de Periodos
Marzo vs Febrero, Q1 vs Q4 — lado a lado con deltas porcentuales.

### 9. Goal Tracking
Define objetivos (ROAS > 3x, CPA < €20) y monitorea progreso con indicadores visuales.

### 10. Custom Dashboard
Construye dashboards personalizados con drag & drop de widgets.

---

## Diferenciadores Competitivos

```
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┐
│                     │   CAA    │ Looker   │ Superme- │ Agency   │
│                     │Analytics │ Studio   │ trics    │Analytics │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ IA conversacional   │    ✅    │    ❌    │    ❌    │    ❌    │
│ Multi-tenant        │    ✅    │    ❌    │    ❌    │    ✅    │
│ Sales performance   │    ✅    │    ❌    │    ❌    │    ❌    │
│ Attribution         │    ✅    │    ❌    │    ❌    │    ✅    │
│ Budget pacing       │    ✅    │    ❌    │    ✅    │    ✅    │
│ API pública         │    ✅    │    ✅    │    ✅    │    ❌    │
│ White-label ready   │    ✅    │    ❌    │    ❌    │    ❌    │
│ Forecast            │    ✅    │    ❌    │    ❌    │    ❌    │
│ Alertas automáticas │    ✅    │    ❌    │    ✅    │    ✅    │
│ PDF/CSV export      │    ✅    │    ✅    │    ✅    │    ✅    │
│ Bilingüe (EN/ES)    │    ✅    │    ❌    │    ❌    │    ❌    │
│ Dark/Light mode     │    ✅    │    ❌    │    ❌    │    ❌    │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## Modelo de Pricing (Propuesta)

| Plan | Incluye | Precio Orientativo |
|:---|:---|:---|
| **Starter** | 1 cliente, 3 plataformas, dashboard básico | €199/mes |
| **Agency** | 5 clientes, todas las plataformas, AI chat, API | €499/mes |
| **Enterprise** | Clientes ilimitados, white-label, SLA, soporte prioritario | €999+/mes |

*Precios orientativos — ajustar según mercado y competencia.*

---

## Casos de Uso

### Agencia de Performance (5-20 clientes)
> "Cada lunes genero 15 reportes. Con CAA, cada cliente accede a SU dashboard y yo solo entro cuando hay alertas."

### E-commerce DTC
> "Necesitaba saber si Google Ads realmente cierra ventas o solo genera leads que no convierten. Sales Performance me dio la respuesta."

### Startup SaaS con Paid Media
> "Le pregunté a la IA '¿dónde pongo €5K extra?' y me mostró exactamente qué campañas escalar."

---

## Arquitectura de Alto Nivel

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   FRONTEND   │     │   BACKEND    │     │  DATA LAYER  │
│              │     │              │     │              │
│  React SPA   │────►│  Express API │────►│  Snowflake   │
│  Tailwind    │     │  AI Agent    │     │  20+ tablas  │
│  Recharts    │     │  Rate Limit  │     │  Multi-tenant│
│  TypeScript  │     │  Auth Keys   │     │              │
│              │     │              │     │              │
│  Vercel      │     │  Railway     │     │  Cloud       │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Demo Flow (Reunión de 30 minutos)

1. **Min 0-5**: Mostrar Dashboard principal → KPIs, gráficos, date picker
2. **Min 5-10**: Navegar a Google Ads → drill down en campañas
3. **Min 10-15**: Sales Performance → enseñar cierre de ciclo (gasto → venta)
4. **Min 15-20**: AI Chat → hacer una pregunta real sobre los datos
5. **Min 20-25**: Budget Pacing + Alerts → mostrar detección de anomalías
6. **Min 25-30**: Settings → multi-cliente, API keys, personalización

**Tip**: Usar el dark mode para la demo. Es más impactante visualmente.

---

## Próximos Pasos

1. **POC gratuito**: Conectar los datos del cliente a un schema de prueba
2. **Setup**: 1-2 días para configurar ETL + schema en Snowflake
3. **Training**: 1 sesión de 30 min para el equipo del cliente
4. **Go-Live**: El cliente accede a su dashboard desde día 1

---

*Documento generado por Miraki AI · Marzo 2026*
