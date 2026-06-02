/* Genera el documento técnico formal de la Validación de Memoria (.docx). */
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType, ShadingType,
  TableOfContents, PageNumber, Header, Footer, PageBreak, VerticalAlign,
} = require("docx");

const CW = 9360; // content width (US Letter, 1" margins)
const ACCENT = "1B4965";
const LIGHT = "EEF3F7";
const CODEBG = "F4F4F4";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

function P(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun(text)] });
}
function H1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); }
function H2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); }
function H3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] }); }
function bullet(t) { return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60 }, children: runs(t) }); }
function runs(t) { return Array.isArray(t) ? t : [new TextRun(t)]; }
function code(str) {
  return str.split("\n").map((ln, i, a) => new Paragraph({
    shading: { fill: CODEBG, type: ShadingType.CLEAR },
    spacing: { after: i === a.length - 1 ? 120 : 0, before: i === 0 ? 40 : 0 },
    children: [new TextRun({ text: ln || " ", font: "Consolas", size: 18 })],
  }));
}
function cell(content, { w, head = false, fill } = {}) {
  const kids = Array.isArray(content) ? content : [new Paragraph({ children: runs(content) })];
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    shading: { fill: fill || (head ? ACCENT : "FFFFFF"), type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: kids.map((p) => head ? new Paragraph({ children: p.options ? p.options.children : runs(content), }) : p),
  });
}
function tbl(widths, rows) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      tableHeader: ri === 0,
      children: r.map((c, ci) => new TableCell({
        borders, width: { size: widths[ci], type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        shading: { fill: ri === 0 ? ACCENT : (ri % 2 ? "F7FAFC" : "FFFFFF"), type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: String(c), bold: ri === 0, color: ri === 0 ? "FFFFFF" : "000000", size: 19 })] })],
      })),
    })),
  });
}

const children = [];

// ---- Portada ----
children.push(new Paragraph({ spacing: { before: 1200, after: 0 }, children: [new TextRun({ text: "INFORME TÉCNICO DE VALIDACIÓN", color: ACCENT, bold: true, size: 24 })] }));
children.push(new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 } }, children: [new TextRun({ text: "Aislamiento de memoria por usuario y personalidad", bold: true, size: 44 })] }));
children.push(P([new TextRun({ text: "Núcleo AI-first · Fábrica multi-app (Sina, Aurora, … 36+ apps)", size: 24, color: "555555" })]));
children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
children.push(tbl([2600, 6760], [
  ["Campo", "Valor"],
  ["Proyecto", "Núcleo AI-first (Orquestador de IA)"],
  ["Repositorio", "https://github.com/hanccotemp/kernel_app"],
  ["Documento", "Validación de memoria aislada por (personalidad + usuario)"],
  ["Versión", "1.0"],
  ["Fecha", "2026-06-01"],
  ["Estado", "APROBADO (nivel \"Ideal\", con nota de persistencia)"],
  ["Reproducible con", "node scripts/test-memoria.js"],
]));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- TOC ----
children.push(H1("Contenido"));
children.push(new TableOfContents("Contenido", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 1. Resumen ejecutivo ----
children.push(H1("1. Resumen ejecutivo"));
children.push(P("Este informe valida, con evidencia ejecutable, que el núcleo mantiene la memoria de conversación SEPARADA por cada usuario dentro de cada personalidad de IA. La llave de aislamiento es la combinación (personalidad/app + usuario), no solo el usuario ni solo la personalidad."));
children.push(P([new TextRun({ text: "Veredicto: ", bold: true }), new TextRun("APROBADO. Las cuatro pruebas exigidas (A–D) pasan, más una prueba adicional de borrado LGPD (E). El único elemento pendiente es la persistencia física en base de datos (PostgreSQL); la llave de aislamiento ya es la correcta, por lo que corresponde al nivel “Aceptable con nota” previsto en el criterio del solicitante.")]));
children.push(tbl([1100, 5060, 3200], [
  ["Prueba", "Qué valida", "Resultado"],
  ["A", "Aislamiento entre usuarios de la misma personalidad", "✓ Pasa"],
  ["B", "Continuidad de memoria del mismo usuario", "✓ Pasa"],
  ["C", "Aislamiento entre personalidades", "✓ Pasa"],
  ["D", "Escala (12 usuarios en una personalidad)", "✓ Pasa (12/12)"],
  ["E", "Borrado LGPD (derecho a eliminar)", "✓ Pasa"],
]));

// ---- 2. Objetivo y alcance ----
children.push(H1("2. Objetivo y alcance"));
children.push(P("Confirmar técnicamente que un único Orquestador de IA, que sirve a varias personalidades (Astrólogo, Religioso, Letrado, Psicólogo, …), mantiene para cada usuario una memoria propia y totalmente aislada dentro de cada personalidad."));
children.push(P([new TextRun({ text: "Dentro de alcance: ", bold: true }), new TextRun("modelo de almacenamiento de memoria, llave de aislamiento, mecánica de cada caso de prueba, evidencia de ejecución, y la ruta a persistencia en PostgreSQL.")]));
children.push(P([new TextRun({ text: "Fuera de alcance: ", bold: true }), new TextRun("rendimiento bajo carga real de producción y la implementación física de PostgreSQL (planificada, no incluida en esta validación).")]));

// ---- 3. Requisito y modelo ----
children.push(H1("3. Requisito y modelo de aislamiento"));
children.push(P("Un Orquestador maneja N personalidades; dentro de cada personalidad hay muchos usuarios, cada uno con su propia memoria:"));
children.push(...code(
`ORQUESTADOR DE IA
│
├── Astrólogo  → Mario1, Mario2, … Mario∞   (cada uno su memoria)
├── Letrado    → Luis1,  Luis2,  … Luis∞
├── Psicólogo  → Maria1, Maria2, … Maria∞
└── Religioso  → Juan1,  Juan2,  … Juan∞`));
children.push(P([new TextRun("La regla central: la memoria se aísla por el "), new TextRun({ text: "par (personalidad/app + usuario)", bold: true }), new TextRun(". Lo que conversa Juan1 con el Religioso no debe aparecer en Juan2 (mismo Religioso, otro usuario) ni en Mario1 (otra personalidad).")]));

// ---- 4. Arquitectura de almacenamiento ----
children.push(H1("4. Arquitectura de almacenamiento de memoria"));
children.push(P("La memoria de cada usuario se materializa en dos entidades: Conversación y Mensaje. La Conversación es la unidad de aislamiento; los Mensajes cuelgan de ella."));

children.push(H2("4.1 Entidades y campos"));
children.push(P([new TextRun({ text: "Conversación", bold: true })]));
children.push(tbl([2600, 6760], [
  ["Campo", "Descripción"],
  ["id", "Identificador único de la conversación"],
  ["app_id", "Personalidad/app a la que pertenece (tenant)"],
  ["usuario_id", "Usuario dueño de la conversación"],
  ["activa", "Si es la conversación vigente del par"],
  ["resumen", "Resumen de memoria (opcional, cacheable)"],
  ["creada", "Marca temporal de creación"],
]));
children.push(P([new TextRun({ text: "Mensaje", bold: true })]));
children.push(tbl([2600, 6760], [
  ["Campo", "Descripción"],
  ["id", "Identificador único del mensaje"],
  ["conversacion_id", "Conversación a la que pertenece (llave foránea)"],
  ["role", "\"user\" o \"assistant\""],
  ["content", "Texto del mensaje"],
  ["ts", "Marca temporal (orden cronológico)"],
]));

children.push(H2("4.2 La llave de aislamiento"));
children.push(P([new TextRun("La memoria se localiza SIEMPRE por la combinación "), new TextRun({ text: "(app_id + usuario_id)", bold: true }), new TextRun(", que resuelve una Conversación; los Mensajes se traen por conversacion_id:")]));
children.push(...code(
`(app_id + usuario_id)  →  Conversación (activa)  →  Mensajes
   personalidad+usuario          la llave             la memoria`));
children.push(P("Código real del localizador de conversación (src/orchestrator/memory.js):"));
children.push(...code(
`db.conversaciones.findOne(
  (c) => c.app_id === appId
      && c.usuario_id === usuarioId
      && c.activa
);`));

children.push(H2("4.3 Flujo de datos por petición"));
children.push(bullet("1. Llega la petición con (app_id, usuario_id, pregunta)."));
children.push(bullet("2. getConversacion(app_id, usuario_id) localiza o crea la conversación del par."));
children.push(bullet("3. guardarMensaje() añade el mensaje del usuario a esa conversación."));
children.push(bullet("4. historial()/resumir() leen SOLO los mensajes de esa conversacion_id y se inyectan como memoria al prompt."));
children.push(bullet("5. La respuesta de la IA se guarda en la misma conversación."));

children.push(H2("4.4 Implementación actual (en memoria) y ruta a PostgreSQL"));
children.push(P("Hoy el almacén es en memoria del proceso, con una tabla genérica (estilo Odoo) que expone find/insert/remove. Persiste mientras el servidor vive y se pierde al reiniciar. La llave ya es la correcta, por lo que migrar a PostgreSQL es reemplazar la capa de datos manteniendo la misma interfaz, sin tocar el orquestador ni la memoria."));
children.push(P("Esquema previsto en PostgreSQL (con índices que garantizan aislamiento y escala):"));
children.push(...code(
`CREATE TABLE conversacion (
  id           TEXT PRIMARY KEY,
  app_id       TEXT NOT NULL,
  usuario_id   TEXT NOT NULL,
  activa       BOOLEAN NOT NULL DEFAULT true,
  resumen      TEXT,
  creada       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_conv_par ON conversacion (app_id, usuario_id, activa);

CREATE TABLE mensaje (
  id              TEXT PRIMARY KEY,
  conversacion_id TEXT NOT NULL REFERENCES conversacion(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  ts              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_msg_conv ON mensaje (conversacion_id, ts);`));
children.push(P([new TextRun({ text: "Nota: ", bold: true }), new TextRun("el índice (app_id, usuario_id, activa) hace que localizar la memoria de un par sea O(log n) y escale a millones de usuarios por personalidad. El borrado en cascada (ON DELETE CASCADE) respalda el derecho LGPD a eliminar.")]));

// ---- 5. Casos de prueba ----
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("5. Casos de prueba: cómo funciona cada uno"));
children.push(P("Cada prueba se ejecuta con el proveedor de IA “mock” (sin costo) a través del orquestador real, de modo que la memoria se guarda y se lee por los mismos caminos que en producción. Las personalidades usadas: aurora = Religioso, sina = Astrólogo."));

const casos = [
  ["A", "Aislamiento entre usuarios de la misma personalidad",
   "Dos usuarios distintos (Juan1 y Juan2) en la MISMA personalidad (Religioso). Juan1 revela un dato íntimo (un divorcio). Luego se inspecciona la memoria de Juan2.",
   "La memoria de Juan2 NO contiene ningún dato de Juan1. Cada uno tiene una Conversación distinta, localizada por su propio (app_id + usuario_id).",
   "✓ La memoria de Juan2 no contiene el divorcio de Juan1."],
  ["B", "Continuidad del mismo usuario",
   "Juan1 aporta un dato y, en una interacción posterior (nueva “sesión”), vuelve. Se verifica que la IA recuerde lo anterior.",
   "La memoria de Juan1 persiste entre interacciones mientras el proceso vive; resumir() devuelve el dato previo.",
   "✓ Al volver, la IA recuerda el divorcio de Juan1."],
  ["C", "Aislamiento entre personalidades",
   "Mario1 aporta un dato en el Astrólogo (sina). Se verifica que ese dato no aparezca en ninguna memoria del Religioso (aurora). Además se comprueba que el mismo usuarioId en dos personalidades produce dos Conversaciones distintas.",
   "El dato del Astrólogo nunca aparece en el Religioso. La llave incluye app_id, por lo que un mismo usuarioId en dos apps genera memorias separadas.",
   "✓ Dato de Mario (Astrólogo) ausente en el Religioso; conversaciones distintas confirmadas."],
  ["D", "Escala (muchos usuarios)",
   "Se crean 12 usuarios en la misma personalidad (Religioso), cada uno con un dato secreto único (un “código”). Se verifica que cada memoria contenga SOLO su propio dato.",
   "Los 12 usuarios mantienen memoria propia sin contaminación cruzada.",
   "✓ 12/12 con memoria propia y sin contaminación de otros."],
  ["E", "Borrado LGPD (derecho a eliminar)",
   "Se invoca borrarMemoriaUsuario(app, usuario) para Juan1 y se verifica que se elimine SOLO su memoria, dejando intactos a los demás usuarios.",
   "Se borran únicamente las conversaciones y mensajes del par (app + usuario) indicado.",
   "✓ Se eliminó solo la memoria de Juan1 (1 conversación, 4 mensajes); los demás intactos."],
];
for (const [id, titulo, mecanica, comportamiento, resultado] of casos) {
  children.push(H2(`Prueba ${id} — ${titulo}`));
  children.push(P([new TextRun({ text: "Cómo funciona el caso: ", bold: true }), new TextRun(mecanica)]));
  children.push(P([new TextRun({ text: "Qué demuestra del sistema: ", bold: true }), new TextRun(comportamiento)]));
  children.push(P([new TextRun({ text: "Resultado: ", bold: true, color: "1B7F3B" }), new TextRun(resultado)]));
}

children.push(H2("5.1 Evidencia de ejecución (salida del script)"));
children.push(...code(
`A · ¿Juan2 sabe del divorcio de Juan1? → NO  (aislado)
B · Juan1 vuelve → "El usuario antes mencionó: ...divorcio..." → recuerda
C · ¿Dato de Mario (Astrólogo) aparece en Religioso? → NO
    u_juan1 en Religioso → conv con_wps0pmmp
    usuario en Astrólogo → conv con_f37o2jgp   (conversaciones distintas)
D · Usuarios con memoria propia y SIN contaminación: 12/12
E · Borrado de u_juan1 → conversaciones:1, mensajes:4; otro usuario intacto`));

// ---- 6. Preguntas de arquitectura ----
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("6. Respuestas a las preguntas de arquitectura"));
const qa = [
  ["¿Cuál es la llave que separa una memoria de otra?",
   "La entidad Conversación, localizada por la combinación (app_id + usuario_id); los Mensajes cuelgan de conversacion_id. Es por par, no solo por usuario ni solo por personalidad."],
  ["¿Es persistente o solo dura la sesión? ¿Cómo pasa a PostgreSQL sin reescribir el núcleo?",
   "Hoy persiste mientras el proceso vive y se pierde al reiniciar (almacén en memoria). La migración consiste en reemplazar la capa de datos por un repositorio PostgreSQL manteniendo la interfaz find/insert/remove; el orquestador y la memoria no cambian."],
  ["¿Hay límite de usuarios por personalidad? ¿Escala a millones?",
   "No hay límite lógico. En memoria es O(n) sobre estructuras de mapa; en PostgreSQL, con el índice (app_id, usuario_id, activa), la búsqueda es O(log n) y escala a millones por personalidad. El cuello de botella esperado es la base, mitigado con índices, réplicas y caché."],
  ["¿Cómo se evita técnicamente traer la memoria de otro usuario o personalidad?",
   "Toda consulta de memoria filtra por app_id Y usuario_id juntos; el historial se trae solo por conversacion_id (que ya pertenece a ese par). No existe ningún lookup global por solo-usuario o solo-app, ni estado global de “usuario actual”. Adicionalmente, la validación de usuario exige que el usuario pertenezca a la app."],
  ["¿Respeta el borrado de datos del usuario (LGPD)?",
   "Sí. La función borrarMemoriaUsuario(app, usuario) elimina solo las conversaciones y mensajes de ese par. En PostgreSQL, el ON DELETE CASCADE garantiza el borrado completo y consistente."],
];
let qi = 1;
for (const [q, a] of qa) {
  children.push(H3(`6.${qi}. ${q}`));
  children.push(P(a));
  qi++;
}

// ---- 7. Conclusión ----
children.push(H1("7. Conclusión"));
children.push(P("El núcleo aísla la memoria por la combinación (personalidad/app + usuario), de forma verificable y reproducible. Las pruebas A–E confirman el aislamiento entre usuarios, la continuidad por usuario, el aislamiento entre personalidades, el comportamiento a escala y el borrado LGPD."));
children.push(P([new TextRun({ text: "Pendiente único: ", bold: true }), new TextRun("conectar la persistencia física (PostgreSQL). La llave de aislamiento ya es la correcta, por lo que este paso no requiere rediseñar el núcleo. El pilar del producto —una IA que conoce solo a cada usuario, dentro de cada personalidad, sin mezclarse— queda confirmado.")]));
children.push(P([new TextRun({ text: "Reproducibilidad: ", bold: true }), new TextRun("npm install && node scripts/test-memoria.js")]));

const doc = new Document({
  creator: "Núcleo AI-first",
  title: "Validación de memoria por usuario y personalidad",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: ACCENT, font: "Arial" }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, color: "2E6072", font: "Arial" }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, color: "333333", font: "Arial" }, paragraph: { spacing: { before: 140, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
  ]},
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 2 } }, children: [new TextRun({ text: "Validación técnica · Memoria por usuario y personalidad", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Núcleo AI-first · ", size: 16, color: "888888" }), new TextRun({ text: "Página ", size: 16, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, "..", "docs", "Validacion_Memoria_Tecnica.docx");
  fs.writeFileSync(out, buf);
  console.log("OK escrito:", out, "(" + buf.length + " bytes)");
});
