/* Genera el documento formal: Modelo del núcleo (simple) + Siguiente hito (Aurora publicable). */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  TableOfContents, PageNumber, Header, Footer, PageBreak, VerticalAlign,
} = require("docx");

const CW = 9360, ACCENT = "1B4965", CODEBG = "F4F4F4";

function P(text, opts = {}) { return new Paragraph({ spacing: { after: 120 }, ...opts, children: runs(text) }); }
function runs(t) { return Array.isArray(t) ? t : [new TextRun(t)]; }
function H1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); }
function H2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); }
function H3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] }); }
function bullet(t) { return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60 }, children: runs(t) }); }
function num(t) { return new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { after: 60 }, children: runs(t) }); }
function code(str) {
  return str.split("\n").map((ln, i, a) => new Paragraph({
    shading: { fill: CODEBG, type: ShadingType.CLEAR },
    spacing: { after: i === a.length - 1 ? 120 : 0, before: i === 0 ? 40 : 0 },
    children: [new TextRun({ text: ln || " ", font: "Consolas", size: 17 })],
  }));
}
function tbl(widths, rows, opts = {}) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: r.map((c, ci) => new TableCell({
        borders: { top: b(), bottom: b(), left: b(), right: b() },
        width: { size: widths[ci], type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        shading: { fill: ri === 0 ? ACCENT : (ri % 2 ? "F7FAFC" : "FFFFFF"), type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        children: String(c).split("\n").map((ln) => new Paragraph({ children: [new TextRun({ text: ln, bold: ri === 0, color: ri === 0 ? "FFFFFF" : "000000", size: 18 })] })),
      })),
    })),
  });
  function b() { return { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }; }
}

const c = [];

// Portada
c.push(new Paragraph({ spacing: { before: 1000 }, children: [new TextRun({ text: "DOCUMENTO DE MODELO Y PLAN", color: ACCENT, bold: true, size: 24 })] }));
c.push(new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 } }, children: [new TextRun({ text: "El modelo del núcleo (en simple) y el siguiente hito: Aurora publicable", bold: true, size: 40 })] }));
c.push(P([new TextRun({ text: "Núcleo AI-first · Fábrica multi-app", size: 24, color: "555555" })]));
c.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
c.push(tbl([2600, 6760], [
  ["Campo", "Valor"],
  ["Repositorio", "https://github.com/hanccotemp/kernel_app"],
  ["Partes", "A) Modelo del núcleo explicado · B) Plan del siguiente hito"],
  ["Versión", "1.0   ·   Fecha: 2026-06-01"],
  ["Diagrama gráfico", "docs/MODELO_NUCLEO.md (se dibuja en GitHub)"],
]));
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("Contenido"));
c.push(new TableOfContents("Contenido", { hyperlink: true, headingStyleRange: "1-2" }));
c.push(new Paragraph({ children: [new PageBreak()] }));

// ===================== PARTE A =====================
c.push(H1("PARTE A — El núcleo explicado en simple"));
c.push(P("Esta parte explica, sin jerga técnica, cómo está construido el motor, para que el dueño del proyecto pueda entenderlo, dar seguimiento y explicarlo a un socio o inversor."));

c.push(H2("A.1 El diagrama del núcleo"));
c.push(P("El usuario habla con la app; la app le pasa la pregunta al núcleo; el núcleo (el “cerebro”) la procesa y responde. El mismo núcleo sirve a todas las apps:"));
c.push(...code(
`        👤 Usuario
           │
   📱 App / Frontend            (Flutter a futuro · web de prueba hoy)
           │  REST / WebSocket
   🚪 Puerta multi-tenant       (identifica la app: Aurora, Sina, …)
           │
┌──────────┴───────────────────────────────────────────────┐
│  🧠 NÚCLEO REUTILIZABLE  (el mismo para las 36+ apps)      │
│                                                           │
│   ⭐ ORQUESTADOR DE IA  (hace los 7 pasos)                │
│        ├─ 🎭 Personaje de 5 capas   (1 JSON por app)      │
│        ├─ 📚 Conocimiento curado    (Biblia/efeméride/…)  │
│        ├─ 🧩 Memoria por usuario    (llave app+usuario)   │
│        ├─ 🛡️ Filtro de límites       (lo que no se permite)│
│        └─ 🔌 Capa de proveedor      (IA intercambiable)   │
└──────────┬───────────────────────────────┬───────────────┘
           │                               │
   🤖 Modelos de IA + voz (STT/TTS)   🗄️ Datos (PostgreSQL) + caché (Redis)`));
c.push(P([new TextRun({ text: "Versión gráfica (cajas y flechas): ", bold: true }), new TextRun("docs/MODELO_NUCLEO.md — se dibuja automáticamente al abrirlo en GitHub.")]));

c.push(H2("A.2 Cómo viaja una pregunta: los 7 pasos (ejemplo con Aurora)"));
c.push(P([new TextRun({ text: "Ejemplo: ", bold: true }), new TextRun("João le escribe a Aurora: “Estoy con mucha ansiedad por el trabajo y no logro dormir.”")]));
c.push(num([new TextRun({ text: "Identifica la app y carga su personaje. ", bold: true }), new TextRun("El núcleo ve que es Aurora y carga su “forma de ser” (cálida, de fe).")]));
c.push(num([new TextRun({ text: "Reúne el contexto del usuario. ", bold: true }), new TextRun("Recupera lo que sabe de João (su idioma, su momento).")]));
c.push(num([new TextRun({ text: "Inyecta conocimiento curado. ", bold: true }), new TextRun("Trae el versículo exacto para “ansiedad” desde la Biblia real (no lo inventa).")]));
c.push(num([new TextRun({ text: "Construye el mensaje para la IA. ", bold: true }), new TextRun("Junta personaje + contexto + versículo + memoria previa.")]));
c.push(num([new TextRun({ text: "Llama a la IA. ", bold: true }), new TextRun("La IA redacta una respuesta cálida usando ese versículo.")]));
c.push(num([new TextRun({ text: "Aplica los límites. ", bold: true }), new TextRun("Revisa que no diga nada prohibido (p. ej., no promete sanaciones).")]));
c.push(num([new TextRun({ text: "Entrega la respuesta. ", bold: true }), new TextRun("Devuelve el texto (y, si es premium, lo convierte en voz).")]));
c.push(P([new TextRun({ text: "Resultado real verificado: ", bold: true }), new TextRun("Aurora respondió citando Filipenses 4:6 exacto, con una oración para João. Para Sina (astrología) es el mismo recorrido; solo cambian el personaje y la fuente de conocimiento.")]));

c.push(H2("A.3 Dónde viven las 5 capas y cómo se agrega una app"));
c.push(P("El “cerebro” de cada app es un solo archivo de configuración (JSON) con 5 capas. No es programación: es llenar una plantilla."));
c.push(tbl([2200, 7160], [
  ["Capa", "Qué define (ejemplo de Aurora)"],
  ["1 · Identidad", "Quién es: nombre, personalidad, tono (cálida, de fe)."],
  ["2 · Contexto", "Qué datos del usuario usa (momento espiritual, idioma)."],
  ["3 · Conocimiento", "De dónde saca los datos duros (la Biblia real)."],
  ["4 · Límites", "Lo que NO puede decir (no promete sanaciones, etc.)."],
  ["5 · Formato", "Cómo responde (breve, con un versículo y una oración)."],
]));
c.push(P([new TextRun({ text: "Agregar una app nueva = soltar un archivo JSON. ", bold: true }), new TextRun("Verificado: se agregaron 3 apps nuevas (Familia 7) solo con configuración; el motor no se tocó.")]));

c.push(H2("A.4 Cómo se guarda y se separa la memoria de cada usuario"));
c.push(P("Cada usuario, dentro de cada personalidad, tiene su propio “cuaderno” de conversación. La llave que los separa es la combinación (app/personalidad + usuario). Lo de Juan1 con el Religioso jamás aparece en Juan2 ni en otra personalidad. Validado con pruebas (ver Validacion_Memoria_Tecnica.pdf)."));

c.push(H2("A.5 Qué está hecho, a medias y qué falta"));
c.push(tbl([3400, 1600, 4360], [
  ["Pieza", "Estado", "Detalle"],
  ["Orquestador (7 pasos)", "✅ Hecho", "Probado con IA real (Claude)"],
  ["Personajes 5 capas", "✅ Hecho", "Por configuración; 5 apps cargadas"],
  ["Conocimiento curado", "✅ Hecho", "Biblia completa + efemérides + corpus genérico"],
  ["Memoria por usuario", "✅ Hecho", "Aislada por (app+usuario); falta persistirla"],
  ["Multi-tenant", "✅ Hecho", "Mismo motor, varias apps aisladas"],
  ["Multimodal (imagen)", "✅ Hecho", "Capacidad reutilizable; probada con Claude"],
  ["Capa de proveedor IA", "✅ Hecho", "mock/deepseek/openai/anthropic intercambiables"],
  ["Caché", "🟡 A medias", "En memoria; falta Redis real"],
  ["Base de datos", "🟡 A medias", "En memoria; falta PostgreSQL real"],
  ["Voz (STT/TTS)", "🟡 A medias", "Estructura lista; falta proveedor real"],
  ["Frontend", "🟡 Mínimo", "Cliente web de prueba; falta app Flutter"],
  ["Pagos / Auth", "🟡 Andamiaje", "Falta RevenueCat + login real"],
  ["Infraestructura", "❌ Falta", "Falta desplegar en AWS São Paulo"],
]));

c.push(H2("A.6 El modelo de datos (entidades y relaciones)"));
c.push(P("Los datos son genéricos (no atados a “astrología” ni “fe”), para servir a muchas apps. Entidades principales:"));
c.push(tbl([2200, 4360, 2800], [
  ["Entidad", "Qué guarda", "Se relaciona con"],
  ["App", "Cada app/personalidad (Aurora, Sina…)", "Config, Usuarios, Roles"],
  ["Config", "El personaje 5 capas, precios, piel, idiomas", "App (1 a 1)"],
  ["Usuario", "Datos del usuario final y su perfil", "App, Suscripción, Conversación"],
  ["Suscripción", "Plan free/premium y add-ons (voz)", "Usuario, App"],
  ["Conversación", "El hilo de chat de un usuario en una app", "Usuario+App, Mensajes"],
  ["Mensaje", "Cada turno (usuario o IA)", "Conversación"],
  ["Recurso", "Contenido abstracto (versículo, tránsito…)", "App"],
  ["Rol / Permiso", "Quién puede hacer qué en el back-office", "App, Usuario (staff)"],
]));
c.push(P("Diagrama entidad-relación completo (gráfico): docs/MODELO_DATOS.md."));

// ===================== PARTE B =====================
c.push(new Paragraph({ children: [new PageBreak()] }));
c.push(H1("PARTE B — Siguiente hito: Aurora publicable"));
c.push(P("El núcleo (el cerebro) está probado. El siguiente salto es darle “cuerpo”: una app real que una persona pueda descargar, usar, suscribirse y pagar. A continuación, las respuestas a las 6 preguntas."));
c.push(P([new TextRun({ text: "Nota sobre las estimaciones: ", bold: true }), new TextRun("plazos y horas son estimaciones de ingeniería con supuestos explícitos; los montos en dinero de desarrollo dependen de la tarifa del equipo (CHA/DEAN), por lo que se entregan en horas para que multipliquen por su tarifa. Los costos de servicios sí se estiman.")]));

c.push(H2("B.1 Los 6 entregables"));
c.push(bullet("1. Persistencia real (PostgreSQL): que usuarios, memoria y suscripciones sobrevivan reinicios."));
c.push(bullet("2. Frontend Flutter: la app publicable de Aurora (iOS + Android)."));
c.push(bullet("3. Voz real (STT + TTS): entrada por voz y respuesta hablada (add-on premium)."));
c.push(bullet("4. Pagos reales (RevenueCat + compras in-app): free, base y add-on de voz, prueba 7 días."));
c.push(bullet("5. Autenticación real: login email / Google / Apple."));
c.push(bullet("6. Infraestructura: AWS São Paulo con auto-escalado + Redis real."));

c.push(H2("B.2 (Pregunta 3) Orden recomendado y por qué"));
c.push(num([new TextRun({ text: "Persistencia (PostgreSQL) — primero. ", bold: true }), new TextRun("Base de todo; sin esto se pierden datos. Riesgo bajo, alto valor.")]));
c.push(num([new TextRun({ text: "Auth + esqueleto Flutter — en paralelo. ", bold: true }), new TextRun("La app necesita login desde el inicio; conviene definirlo antes de construir pantallas para no rehacerlas.")]));
c.push(num([new TextRun({ text: "Pagos (RevenueCat). ", bold: true }), new TextRun("Una vez hay usuarios y pantallas, se conecta el cobro (free/base/voz + prueba 7 días).")]));
c.push(num([new TextRun({ text: "Voz real (STT/TTS) — puede ir en paralelo. ", bold: true }), new TextRun("Es el diferenciador; entra por la capa de voz que ya existe, sin frenar lo demás.")]));
c.push(num([new TextRun({ text: "Infraestructura AWS + Redis — al final. ", bold: true }), new TextRun("Para publicar con escala; se hace cuando la app ya funciona de extremo a extremo.")]));
c.push(P("Coincide con la propuesta del solicitante, con un ajuste: adelantar la autenticación para que el frontend no se rehaga."));

c.push(H2("B.3 (Pregunta 1) Plazo estimado"));
c.push(P("Supuesto: 1 desarrollador full-stack con experiencia en Flutter, dedicado (con un segundo en paralelo, los tiempos bajan ~30-40%)."));
c.push(tbl([4200, 2000, 3160], [
  ["Entregable", "Horas aprox.", "Calendario (1 dev)"],
  ["Persistencia PostgreSQL", "30 – 50 h", "~1 semana"],
  ["Frontend Flutter (MVP Aurora)", "120 – 200 h", "~4 – 6 semanas"],
  ["Auth (email/Google/Apple)", "30 – 50 h", "~1 – 1.5 semanas"],
  ["Pagos (RevenueCat + IAP)", "40 – 60 h", "~1.5 – 2 semanas"],
  ["Voz real (STT + TTS)", "40 – 60 h", "~1.5 – 2 semanas"],
  ["Infra AWS São Paulo + Redis", "40 – 70 h", "~1.5 – 2 semanas"],
  ["Pruebas, pulido y envío a tiendas", "40 – 60 h", "~1 – 2 semanas"],
]));
c.push(P([new TextRun({ text: "Total a app publicada: ", bold: true }), new TextRun("≈ 10 – 14 semanas (2.5 – 3.5 meses) con 1 dev dedicado y solapamientos; ≈ 6 – 9 semanas con 2 devs en paralelo. A esto se suma la revisión de la tienda (Apple suele tardar de días a 1–2 semanas).")]));

c.push(H2("B.4 (Pregunta 2) Costo"));
c.push(P([new TextRun({ text: "Desarrollo (una vez): ", bold: true }), new TextRun("≈ 340 – 550 horas en total (ver tabla anterior). El monto = horas × tarifa del equipo. Recomendación: pedir cotización a CHA/DEAN con este desglose por entregable, y construir por etapas para validar antes de invertir en todo.")]));
c.push(P([new TextRun({ text: "Servicios recurrentes (mensual, a baja escala ~1.000 usuarios): ", bold: true })]));
c.push(tbl([4200, 5160], [
  ["Servicio", "Costo aprox."],
  ["AWS São Paulo (contenedor + PostgreSQL + Redis chicos)", "≈ US$ 80 – 250 / mes"],
  ["IA (DeepSeek, con caché)", "≈ US$ 10 – 50 / mes a baja escala"],
  ["Voz STT + TTS (pago por uso, add-on premium)", "≈ US$ 0.015 – 0.02 por interacción de voz"],
  ["RevenueCat (pagos)", "Gratis hasta US$ 2,500/mes de ingresos; luego ~1%"],
  ["Apple Developer / Google Play", "US$ 99 / año  ·  US$ 25 (único)"],
]));
c.push(P([new TextRun({ text: "Conviene por etapas: ", bold: true }), new TextRun("sí. La etapa 1 (Persistencia + Flutter + Auth + Pagos, sin voz ni AWS gestionado) ya permite una versión usable; voz e infraestructura escalable se suman después.")]));

c.push(H2("B.5 (Pregunta 4) Cómo conectaremos la voz"));
c.push(P("La voz entra por la “capa de voz” que ya existe en el núcleo (hoy es un stub). Como la capa de proveedor de IA, será intercambiable, para no quedar atados a un proveedor y proteger el margen."));
c.push(tbl([2400, 3600, 3360], [
  ["Función", "Proveedor propuesto", "Costo aprox."],
  ["STT (voz → texto)", "Deepgram (Nova) — multilingüe ES/PT/EN", "≈ US$ 0.004 – 0.006 / min"],
  ["TTS (texto → voz)", "Google/Azure Neural (costo) o ElevenLabs (premium)", "≈ US$ 16 / millón de caracteres"],
]));
c.push(P([new TextRun({ text: "Costo combinado: ", bold: true }), new TextRun("≈ US$ 0.015 – 0.02 por interacción de voz. Por eso la voz se ofrece como add-on premium (protege el margen). Se empieza con una opción económica y se puede subir a ElevenLabs para voces más naturales sin cambiar el resto.")]));

c.push(H2("B.6 (Pregunta 5) Qué necesitamos de su parte"));
c.push(bullet("Cuentas de tienda a nombre de la empresa: Apple Developer (US$99/año) y Google Play (US$25)."));
c.push(bullet("Accesos / cuentas: AWS (o autorización para crearla), claves de IA (DeepSeek), de voz (Deepgram/Google), y cuenta RevenueCat."));
c.push(bullet("Contenido de Aurora validado: plan de lectura, “momentos”, textos. (La versión bíblica ya está resuelta en dominio público; si quieren RVR1960, requiere licencia.)"));
c.push(bullet("Decisiones de negocio: precios finales por mercado/moneda, branding (logo, colores) de Aurora, e idiomas de lanzamiento."));
c.push(bullet("Legal: política de privacidad y términos (requeridos por las tiendas y por LGPD)."));

c.push(H2("B.7 (Pregunta 6) Confirmación: no se reescribe el núcleo"));
c.push(P("Confirmado. Cada entregable entra por una interfaz que ya quedó preparada; el orquestador y su lógica no cambian:"));
c.push(tbl([3200, 6160], [
  ["Entregable", "Entra por la interfaz ya existente"],
  ["PostgreSQL", "Reemplaza la capa de datos (mismos find/insert/remove)"],
  ["Redis", "Reemplaza la caché (mismos get/set/wrap)"],
  ["Voz real", "Rellena la capa de voz (stub) + STT en la puerta de entrada"],
  ["Pagos", "Reemplaza el control de suscripción (gating ya existe)"],
  ["Auth", "Reemplaza el andamiaje de login por JWT real"],
  ["Flutter", "Es otro cliente del MISMO API REST/WebSocket"],
  ["AWS", "Despliegue; no cambia el código"],
]));

c.push(H1("Conclusión"));
c.push(P("Parte A: el modelo del núcleo queda explicado en simple, con diagrama, los 7 pasos, las 5 capas, la memoria, el estado y el modelo de datos. Parte B: el hito “Aurora publicable” es alcanzable en ~2.5–3.5 meses (1 dev) sin reescribir el núcleo, entrando todo por las interfaces ya preparadas."));
c.push(P([new TextRun({ text: "Primer paso ejecutable de inmediato: ", bold: true }), new TextRun("la Persistencia (PostgreSQL), que además cierra la única nota pendiente de la validación de memoria.")]));

const doc = new Document({
  creator: "Núcleo AI-first",
  title: "Modelo del núcleo y siguiente hito",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, color: ACCENT, font: "Arial" }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 25, bold: true, color: "2E6072", font: "Arial" }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: "333333", font: "Arial" }, paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 } }, children: [new TextRun({ text: "Modelo del núcleo y siguiente hito (Aurora publicable)", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Núcleo AI-first · Página ", size: 16, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" })] })] }) },
    children: c,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "..", "docs", "Modelo_Nucleo_y_Hito.docx");
  fs.writeFileSync(out, buf);
  console.log("OK escrito:", out, "(" + buf.length + " bytes)");
});
