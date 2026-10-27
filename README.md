# ShortStop Android

A free Android MVP that attempts to interrupt likely YouTube Shorts screens using an AccessibilityService. No login, server, Firebase, analytics, or paid API is required.

## Limitations
- Prototype only: YouTube accessibility labels vary by version, language, and device; updates can break detection.
- Accessibility permission is powerful. Enable it only if you understand and trust the app. This project does not upload accessibility content.
- Targets the official YouTube Android package `com.google.android.youtube`.
- No VPN, root, or device-admin privileges are used.

## Build an APK
1. Open this repository's Actions tab.
2. Run **Build ShortStop APK**, or push a commit to main.
3. Download the **ShortStop-debug-apk** artifact from the completed workflow.
4. Extract `app-debug.apk` and install it on your Android phone.
5. Open ShortStop, enable its Accessibility service in Android Settings, return and refresh status.
6. Test Shorts and ordinary YouTube videos.

## Local build
Requires JDK 17, Android SDK, and Gradle 8.9. Run `gradle assembleDebug`.
APK output: `app/build/outputs/apk/debug/app-debug.apk`.
