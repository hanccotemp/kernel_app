import 'package:flutter_test/flutter_test.dart';
import 'package:aurora_app/main.dart';

void main() {
  testWidgets('Aurora arranca y muestra el saludo', (tester) async {
    await tester.pumpWidget(const AuroraApp());
    expect(find.textContaining('Aurora'), findsWidgets);
  });
}
