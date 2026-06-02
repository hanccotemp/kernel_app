// Aurora — frontend Flutter del núcleo AI-first.
// Consume el MISMO API REST del núcleo (POST /api/apps/aurora/chat).
// Pantallas: Chat (con su personaje y diseño) + Paywall (simulado).
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

// Núcleo (Node + PostgreSQL). En web, el navegador llama a este origen (CORS ya habilitado).
const String apiBase = 'http://localhost:3000';
const String appId = 'aurora';
const String usuarioId = 'u_demo_aurora';

// Colores de la "piel" de Aurora (de su config de 5 capas: verde fe).
const Color kPrimary = Color(0xFF1F6F5C);
const Color kSecondary = Color(0xFFA8D5BA);

void main() => runApp(const AuroraApp());

class AuroraApp extends StatelessWidget {
  const AuroraApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aurora',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: kPrimary),
        fontFamily: 'Georgia',
      ),
      home: const ChatScreen(),
    );
  }
}

class Mensaje {
  final String texto;
  final bool esUsuario;
  final String? meta;
  Mensaje(this.texto, this.esUsuario, {this.meta});
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _mensajes = <Mensaje>[];
  final _input = TextEditingController();
  final _scroll = ScrollController();
  String _lang = 'es';
  bool _voz = false;
  bool _cargando = false;

  @override
  void initState() {
    super.initState();
    _mensajes.add(Mensaje(
      'Hola, soy Aurora. Estoy aquí para acompañarte. ¿Cómo está tu corazón hoy?',
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
        Uri.parse('$apiBase/api/apps/$appId/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'usuarioId': usuarioId,
          'pregunta': texto,
          'lang': _lang,
          'conVoz': _voz,
        }),
      );
      final data = jsonDecode(utf8.decode(res.bodyBytes));
      if (data['ok'] == true) {
        final k = data['meta']?['conocimiento'];
        final prov = data['meta']?['provider'];
        final voz = data['voz'] != null ? ' · 🔊 voz lista' : '';
        setState(() => _mensajes.add(Mensaje(
              data['texto'] ?? '',
              false,
              meta: '🤖 $prov · ${k != null ? jsonEncode(k) : ''}$voz',
            )));
      } else {
        setState(() => _mensajes.add(Mensaje(
            (data['texto'] ?? '') + '\n⚠ ' + (data['error'] ?? 'error'), false)));
      }
    } catch (e) {
      setState(() => _mensajes.add(Mensaje('Error de red: $e', false)));
    } finally {
      setState(() => _cargando = false);
      _bajar();
    }
  }

  void _bajar() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) {
          _scroll.animateTo(_scroll.position.maxScrollExtent,
              duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
        }
      });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        title: const Row(children: [
          Text('🕊️ ', style: TextStyle(fontSize: 20)),
          Text('Aurora', style: TextStyle(fontWeight: FontWeight.bold)),
        ]),
        actions: [
          DropdownButton<String>(
            value: _lang,
            dropdownColor: kPrimary,
            iconEnabledColor: Colors.white,
            underline: const SizedBox(),
            style: const TextStyle(color: Colors.white),
            items: const [
              DropdownMenuItem(value: 'es', child: Text('ES')),
              DropdownMenuItem(value: 'pt', child: Text('PT')),
              DropdownMenuItem(value: 'en', child: Text('EN')),
            ],
            onChanged: (v) => setState(() => _lang = v!),
          ),
          IconButton(
            tooltip: 'Premium',
            icon: const Icon(Icons.workspace_premium),
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const PaywallScreen())),
          ),
        ],
      ),
      body: Container(
        color: const Color(0xFFF4F8F6),
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
            const Padding(
                padding: EdgeInsets.all(8),
                child: Text('Aurora está escribiendo…',
                    style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic))),
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
          color: m.esUsuario ? kPrimary : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: kSecondary.withValues(alpha: 0.6)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(m.texto,
                style: TextStyle(
                    color: m.esUsuario ? Colors.white : const Color(0xFF222222),
                    height: 1.4)),
            if (m.meta != null)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(m.meta!,
                    style: const TextStyle(
                        fontSize: 11, color: Colors.grey, fontFamily: 'monospace')),
              ),
          ],
        ),
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
          icon: Icon(_voz ? Icons.mic : Icons.mic_off,
              color: _voz ? kPrimary : Colors.grey),
          onPressed: () => setState(() => _voz = !_voz),
        ),
        Expanded(
          child: TextField(
            controller: _input,
            onSubmitted: (_) => _enviar(),
            decoration: const InputDecoration(
              hintText: 'Escribe a Aurora…',
              border: OutlineInputBorder(),
              isDense: true,
            ),
          ),
        ),
        const SizedBox(width: 8),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: kPrimary),
          onPressed: _enviar,
          child: const Text('Enviar'),
        ),
      ]),
    );
  }
}

// Paywall SIMULADO — la lógica de planes; el cobro real (IAP/RevenueCat)
// solo funciona en tienda/dispositivo. Aquí el botón simula la suscripción.
class PaywallScreen extends StatelessWidget {
  const PaywallScreen({super.key});
  @override
  Widget build(BuildContext context) {
    Widget plan(String titulo, String precio, String detalle, {bool destacado = false}) {
      return Card(
        elevation: destacado ? 4 : 1,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: destacado ? kPrimary : Colors.grey.shade300, width: destacado ? 2 : 1),
        ),
        child: ListTile(
          leading: Icon(destacado ? Icons.star : Icons.check_circle_outline, color: kPrimary),
          title: Text(titulo, style: const TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text(detalle),
          trailing: Text(precio, style: const TextStyle(fontWeight: FontWeight.bold, color: kPrimary)),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: kPrimary,
        foregroundColor: Colors.white,
        title: const Text('Aurora Premium'),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const SizedBox(height: 8),
        const Center(
          child: Text('Acompañamiento más profundo',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 4),
        const Center(child: Text('Prueba 7 días gratis', style: TextStyle(color: Colors.grey))),
        const SizedBox(height: 16),
        plan('Free', 'R\$ 0', 'Chat de texto con Aurora'),
        plan('Base', 'R\$ 14,90/mes', 'Todo lo de Free + contenido del día + plan de lectura', destacado: true),
        plan('Add-on Voz', '+R\$ 9,90/mes', 'Respuestas habladas (TTS)'),
        const SizedBox(height: 20),
        FilledButton(
          style: FilledButton.styleFrom(
              backgroundColor: kPrimary, padding: const EdgeInsets.symmetric(vertical: 16)),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('Pago SIMULADO: suscripción activada (prueba 7 días). '
                  'El cobro real se conecta con RevenueCat en tienda.'),
              duration: Duration(seconds: 4),
            ));
          },
          child: const Text('Comenzar prueba gratis (simulado)'),
        ),
        const SizedBox(height: 12),
        const Text(
          'Nota: el cobro real (compras in-app) solo funciona publicado en App Store / '
          'Google Play. Aquí el flujo está simulado para la demo.',
          style: TextStyle(fontSize: 12, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
      ]),
    );
  }
}
