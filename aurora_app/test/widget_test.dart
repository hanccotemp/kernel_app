import 'package:flutter_test/flutter_test.dart';
import 'package:aurora_app/main.dart';

void main() {
  testWidgets('La app arranca (muestra el splash de carga de config)', (tester) async {
    await tester.pumpWidget(const Root());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
