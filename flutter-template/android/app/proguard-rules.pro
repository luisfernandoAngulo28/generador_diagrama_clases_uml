# Flutter/Dart keep rules
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# flutter_gemma / MediaPipe missing classes
-dontwarn com.google.auto.value.extension.memoized.Memoized
-dontwarn com.google.mediapipe.proto.CalculatorProfileProto$CalculatorProfile
-dontwarn com.google.mediapipe.proto.GraphTemplateProto$CalculatorGraphTemplate

# Google Play Core (SplitInstall / deferred components) - not used in this app
-dontwarn com.google.android.play.core.**
