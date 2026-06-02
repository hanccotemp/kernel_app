// Frontend Flutter del núcleo AI-first — UNA base de código, UNA app por build.
// La app objetivo se fija al compilar:  --dart-define=APP_ID=aurora | sina | ...
// Cada build es UNA sola app (su piel, su personaje). NO hay selector ni mezcla.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const String apiBase = 'http://localhost:3000';
// Qué app es ESTE build. Por defecto aurora; Sina se compila con --dart-define=APP_ID=sina.
const String kAppId = String.fromEnvironment('APP_ID', defaultValue: 'aurora');

Color hexColor(String? hex, Color fallback) {
  if (hex == null) return fallback;
  var h = hex.replaceAll('#', '');
  if (h.length == 6) h = 'FF$h';
  final v = int.tryParse(h, radix: 16);
  return v == null ? fallback : Color(v);
}

// nombre -> usuarioId estable y POR APP (u_sina_percy, u_aurora_percy: distintos).
String idDe(String appId, String n) {
  final base = n.trim().toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '_').replaceAll(RegExp(r'^_|_$'), '');
  return 'u_${appId}_${base.isEmpty ? 'invitado' : base}';
}

void main() => runApp(const Root());

// Carga la config de SU app (piel, nombre, idiomas) desde el núcleo y arranca.
class Root extends StatefulWidget {
  const Root({super.key});
  @override
  State<Root> createState() => _RootState();
}

class _RootState extends State<Root> {
  Map<String, dynamic>? _cfg;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    try {
      final res = await http.get(Uri.parse('$apiBase/api/apps/$kAppId/config'));
      if (res.statusCode != 200) throw Exception('HTTP ${res.statusCode}');
      setState(() => _cfg = jsonDecode(utf8.decode(res.bodyBytes)));
    } catch (e) {
      setState(() => _error = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = hexColor(_cfg?['piel']?['color_primario'], const Color(0xFF1F6F5C));
    return MaterialApp(
      title: _cfg?['nombre'] ?? kAppId,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: color)),
      home: _error != null
          ? Scaffold(body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text('No se pudo cargar la app "$kAppId".\n$_error\n\n¿Está corriendo el núcleo en $apiBase?', textAlign: TextAlign.center))))
          : _cfg == null
              ? const Scaffold(body: Center(child: CircularProgressIndicator()))
              : LoginScreen(cfg: _cfg!),
    );
  }
}

// ───────────────────────── LOGIN (de ESTA app) ─────────────────────────
class LoginScreen extends StatefulWidget {
  final Map<String, dynamic> cfg;
  const LoginScreen({super.key, required this.cfg});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _nombre = TextEditingController();
  final _fecha = TextEditingController();
  bool _cargando = false;

  bool get _esAstro => (widget.cfg['vertical'] ?? '') == 'astrologia';
  Color get _color => hexColor(widget.cfg['piel']?['color_primario'], const Color(0xFF1F6F5C));
  String get _icono => widget.cfg['piel']?['icono'] ?? '✨';
  String get _nombreApp => widget.cfg['nombre'] ?? kAppId;

  Future<void> _entrar() async {
    final nombre = _nombre.text.trim();
    if (nombre.isEmpty || _cargando) return;
    if (_esAstro && !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(_fecha.text.trim())) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ingresa tu fecha de nacimiento como AAAA-MM-DD')));
      return;
    }
    setState(() => _cargando = true);
    final usuarioId = idDe(kAppId, nombre);
    final perfil = _esAstro ? {'nacimiento': {'fecha': _fecha.text.trim()}} : {};
    try {
      await http.post(
        Uri.parse('$apiBase/api/apps/$kAppId/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'usuarioId': usuarioId, 'nombre': nombre, 'perfil': perfil}),
      );
      if (!mounted) return;
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => ChatScreen(cfg: widget.cfg, usuarioId: usuarioId, nombre: nombre),
      ));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text(_icono, style: const TextStyle(fontSize: 56)),
              const SizedBox(height: 8),
              Text(_nombreApp, style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: _color)),
              const SizedBox(height: 4),
              Text(
                _esAstro ? 'Tu guía de astrología. Entra con tu nombre.' : 'Tu compañía de fe. Entra con tu nombre.',
                style: const TextStyle(color: Colors.black54), textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              TextField(
                controller: _nombre,
                decoration: const InputDecoration(labelText: 'Tu nombre', border: OutlineInputBorder(), prefixIcon: Icon(Icons.person_outline)),
              ),
              if (_esAstro) ...[
                const SizedBox(height: 12),
                TextField(
                  controller: _fecha,
                  decoration: const InputDecoration(
                    labelText: 'Fecha de nacimiento (AAAA-MM-DD)',
                    hintText: '1994-03-21',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.cake_outlined),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  style: FilledButton.styleFrom(backgroundColor: _color, padding: const EdgeInsets.symmetric(vertical: 14)),
                  onPressed: _cargando ? null : _entrar,
                  child: _cargando
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Entrar'),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

class Mensaje {
  final String texto;
  final bool esUsuario;
  final String? meta;
  Mensaje(this.texto, this.esUsuario, {this.meta});
}

// ───────────────────────── CHAT (de ESTA app) ─────────────────────────
class ChatScreen extends StatefulWidget {
  final Map<String, dynamic> cfg;
  final String usuarioId;
  final String nombre;
  const ChatScreen({super.key, required this.cfg, required this.usuarioId, required this.nombre});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _mensajes = <Mensaje>[];
  final _input = TextEditingController();
  final _scroll = ScrollController();
  late String _lang;
  bool _voz = false;
  bool _cargando = false;

  Color get _color => hexColor(widget.cfg['piel']?['color_primario'], const Color(0xFF1F6F5C));
  String get _icono => widget.cfg['piel']?['icono'] ?? '✨';
  String get _nombreApp => widget.cfg['nombre'] ?? kAppId;
  bool get _esAstro => (widget.cfg['vertical'] ?? '') == 'astrologia';
  List<String> get _idiomas => (widget.cfg['idiomas'] as List?)?.map((e) => '$e').toList() ?? ['es', 'pt', 'en'];

  @override
  void initState() {
    super.initState();
    _lang = widget.cfg['idioma_default'] ?? 'es';
    _mensajes.add(Mensaje(
      _esAstro
          ? 'Hola, ${widget.nombre}. Soy $_nombreApp. Cuéntame qué quieres explorar y miramos los astros.'
          : 'Hola, ${widget.nombre}. Soy $_nombreApp, estoy aquí para acompañarte. ¿Cómo está tu corazón hoy?',
      false,
    ));
  }

  Future<void> _enviar() async {
    final texto = _input.text.trim();
    if (texto.isEmpty || _cargando) return;
    setState(() {
      _mensajes.add(Mensaje(texto, true));
      _input.clear();
      _cargando = true;
    });
    _bajar();
    try {
      final res = await http.post(
        Uri.parse('$apiBase/api/apps/$kAppId/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'usuarioId': widget.usuarioId, 'pregunta': texto, 'lang': _lang, 'conVoz': _voz}),
      );
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (data['ok'] == true) {
        final k = data['meta']?['conocimiento'];
        final prov = data['meta']?['provider'];
        final voz = data['voz'] != null ? ' · 🔊 voz lista' : '';
        setState(() => _mensajes.add(Mensaje(data['texto'] ?? '', false, meta: '🤖 $prov · ${k != null ? jsonEncode(k) : ''}$voz')));
      } else {
        setState(() => _mensajes.add(Mensaje((data['texto'] ?? '') + '\n⚠ ' + (data['error'] ?? 'error'), false)));
      }
    } catch (e) {
      setState(() => _mensajes.add(Mensaje('Error de red: $e', false)));
    } finally {
      setState(() => _cargando = false);
      _bajar();
    }
  }

  void _bajar() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: _color,
        foregroundColor: Colors.white,
        title: Row(children: [
          Text('$_icono ', style: const TextStyle(fontSize: 20)),
          Text(_nombreApp, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(10)),
            child: Text(widget.nombre, style: const TextStyle(fontSize: 13)),
          ),
        ]),
        actions: [
          DropdownButton<String>(
            value: _lang,
            dropdownColor: _color,
            iconEnabledColor: Colors.white,
            underline: const SizedBox(),
            style: const TextStyle(color: Colors.white),
            items: _idiomas.map((l) => DropdownMenuItem(value: l, child: Text(l.toUpperCase()))).toList(),
            onChanged: (v) => setState(() => _lang = v!),
          ),
          IconButton(
            tooltip: 'Cambiar de usuario',
            icon: const Icon(Icons.logout),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Container(
        color: const Color(0xFFF5F5F7),
        child: Column(children: [
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(14),
              itemCount: _mensajes.length,
              itemBuilder: (_, i) => _burbuja(_mensajes[i]),
            ),
          ),
          if (_cargando)
            Padding(padding: const EdgeInsets.all(8), child: Text('$_nombreApp está escribiendo…', style: const TextStyle(color: Colors.grey, fontStyle: FontStyle.italic))),
          _composer(),
        ]),
      ),
    );
  }

  Widget _burbuja(Mensaje m) {
    return Align(
      alignment: m.esUsuario ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 5),
        padding: const EdgeInsets.all(12),
        constraints: const BoxConstraints(maxWidth: 520),
        decoration: BoxDecoration(
          color: m.esUsuario ? _color : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _color.withValues(alpha: 0.25)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(m.texto, style: TextStyle(color: m.esUsuario ? Colors.white : const Color(0xFF222222), height: 1.4)),
          if (m.meta != null)
            Padding(padding: const EdgeInsets.only(top: 6), child: Text(m.meta!, style: const TextStyle(fontSize: 11, color: Colors.grey, fontFamily: 'monospace'))),
        ]),
      ),
    );
  }

  Widget _composer() {
    return Container(
      padding: const EdgeInsets.all(10),
      color: Colors.white,
      child: Row(children: [
        IconButton(
          tooltip: 'Voz (add-on premium)',
          icon: Icon(_voz ? Icons.mic : Icons.mic_off, color: _voz ? _color : Colors.grey),
          onPressed: () => setState(() => _voz = !_voz),
        ),
        Expanded(
          child: TextField(
            controller: _input,
            onSubmitted: (_) => _enviar(),
            decoration: InputDecoration(hintText: 'Escribe a $_nombreApp…', border: const OutlineInputBorder(), isDense: true),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(style: FilledButton.styleFrom(backgroundColor: _color), onPressed: _enviar, child: const Text('Enviar')),
      ]),
    );
  }
}
