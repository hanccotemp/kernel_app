# El modelo del núcleo — diagrama y vista rápida

> Documento visual de acompañamiento. La explicación completa (no técnica) y el plan del siguiente hito están en **[Modelo_Nucleo_y_Hito.pdf](Modelo_Nucleo_y_Hito.pdf)** / **[.docx](Modelo_Nucleo_y_Hito.docx)**.

## Diagrama del núcleo (cómo se conectan las piezas)

```mermaid
flowchart TD
  U["👤 Usuario"] --> APP["📱 App / Frontend<br/>Flutter (futuro) · HTML de prueba (hoy)"]
  APP -->|"REST / WebSocket"| GW["🚪 API Gateway multi-tenant<br/>identifica la app (Aurora, Sina…)"]
  GW --> ORQ

  subgraph NUCLEO["🧠 NÚCLEO REUTILIZABLE (el mismo para las 36+ apps)"]
    ORQ["⭐ Orquestador de IA<br/>flujo de 7 pasos"]
    ORQ --> PERS["🎭 Personaje 5 capas<br/>(1 archivo JSON por app)"]
    ORQ --> CONO["📚 Conocimiento curado<br/>Biblia · efemérides · corpus"]
    ORQ --> MEM["🧩 Memoria por usuario<br/>llave (app + usuario)"]
    ORQ --> FILT["🛡️ Filtro de límites<br/>(Capa 4)"]
    ORQ --> PROV["🔌 Capa de proveedor (intercambiable)<br/>mock · deepseek · openai · anthropic"]
  end

  PROV -->|"API (pago por uso)"| IA["🤖 Modelos de IA<br/>+ STT / TTS (voz)"]
  ORQ --> DATOS[("🗄️ Datos<br/>PostgreSQL (futuro) · caché Redis")]

  style NUCLEO fill:#EEF3F7,stroke:#1B4965
  style ORQ fill:#1B4965,color:#fff
```

## La memoria, separada por (personalidad + usuario)

```mermaid
flowchart LR
  ORQ["⭐ Orquestador"]
  ORQ --> A["🔮 Astrólogo (Sina)"]
  ORQ --> R["🕊️ Religioso (Aurora)"]
  A --> A1["Mario1 · su memoria"]
  A --> A2["Mario2 · su memoria"]
  R --> R1["Juan1 · su memoria"]
  R --> R2["Juan2 · su memoria"]
```

Cada caja de memoria es independiente: la llave es el **par (app + usuario)**. Validado en **[Validacion_Memoria_Tecnica.pdf](Validacion_Memoria_Tecnica.pdf)**.

## Modelo de datos (relaciones)

El diagrama entidad-relación completo está en **[MODELO_DATOS.md](MODELO_DATOS.md)** (se dibuja solo en GitHub).
