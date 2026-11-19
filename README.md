# Instando 📥
> React Native & Native Android Instagram Media Downloader

**Instando** is a personal-use Android application designed to download Instagram Reels, Posts, and direct media directly to your phone's Gallery with zero extra clicks.

---

## 🌟 Key Highlights & User Flows

### 1. Primary User Flow: Share-to-Download (Zero Click)
1. Open Instagram on your Android device.
2. Select any public Reel or Post.
3. Tap **Share** and select **Instando** from the Android share sheet.
4. Instando receives the shared Instagram URL via an invisible native `ShareReceiverActivity`.
5. Background download begins immediately via **Android WorkManager**.
6. The React Native UI does **not** open, keeping you right where you were in Instagram.
7. An ongoing Android progress notification displays live percentage.
8. The file is saved directly into Android **MediaStore** (`Movies/Instando/` or `Pictures/Instando/`).
9. The notification is dismissed, and an Android Toast appears: **"Downloaded successfully!"**

### 2. Secondary User Flow: Manual Download
1. Open Instando from the app launcher.
2. Paste an Instagram link (or tap the **Paste** button to read from clipboard).
3. Tap **Download Now**.
4. View real-time status and progress inside the UI.
5. Manage recent downloads: **Open** in video player, **Share** to other apps, or **Delete** with confirmation.

---

## 🏗️ Technology Stack & Architecture

| Component | Technology / Implementation |
|---|---|
| **Framework** | React Native CLI (v0.88.1, React 19) |
| **Language** | JavaScript (ES6+) |
| **Android Native Code** | Java (Android 14/15+ targetSdk 36, minSdk 24) |
| **UI** | React Native StyleSheet (Minimal dark theme) |
| **Background Processing** | Android WorkManager (`androidx.work:work-runtime:2.9.1`) |
| **Share Sheet Receiver** | Native Android `ACTION_SEND` (`ShareReceiverActivity`) |
| **HTTP Engine** | OkHttp 4 (`com.squareup.okhttp3:okhttp:4.12.0`) |
| **Storage & Gallery** | Android MediaStore with Scoped Storage (`IS_PENDING`) |
| **Local Persistence** | AsyncStorage + SharedPreferences native sync |

### Directory Structure

```
Instando/
|-- src/
|   |-- components/
|   |   |-- Header.js             # Brand logo, title, settings button
|   |   |-- UrlInput.js           # Rounded input with Paste & Clear buttons
|   |   |-- DownloadButton.js     # Primary action button with loading states
|   |   |-- DownloadProgress.js   # Active card with thumbnail & progress bar
|   |   |-- DownloadItem.js       # Recent item with Open, Share, Delete actions
|   |   |-- SettingsModal.js      # Storage paths, permissions, background info
|   |
|   |-- screens/
|   |   |-- HomeScreen.js         # Single-page interface & tab switcher
|   |
|   |-- services/
|   |   |-- DownloadService.js    # Bridges NativeEventEmitter & JS DB
|   |   |-- MediaResolver.js      # JS side modular resolution engine
|   |   |-- StorageService.js     # Native file viewer, share intent, and delete
|   |
|   |-- database/
|   |   |-- DownloadDatabase.js   # AsyncStorage cache with native sync
|   |
|   |-- utils/
|   |   |-- urlValidator.js       # Regex extraction & query param normalization
|   |   |-- formatters.js         # Byte, date, and status formatters
|   |
|   |-- theme/
|       |-- colors.js             # Charcoal dark theme & accents
|       |-- spacing.js            # Radii, margins, padding standards
|
|-- android/
|   |-- app/src/main/
|       |-- AndroidManifest.xml   # ACTION_SEND, Foreground service, Scoped Storage
|       |-- res/xml/file_paths.xml# FileProvider paths for sharing
|       |-- java/com/instando/
|           |-- ShareReceiverActivity.java  # Invisible share sheet entrypoint
|           |-- DownloadWorker.java         # WorkManager background downloader
|           |-- DownloadManagerModule.java  # React Native Turbo/NativeModule
|           |-- DownloadManagerPackage.java # ReactPackage registration
|           |-- MediaResolver.java          # Native HTTP resolution engine
|           |-- NotificationHelper.java     # Android 13+ notification channel
|           |-- MediaStoreHelper.java       # Scoped Storage MediaStore publisher
|           |-- MainActivity.kt             # React Native main activity
|           |-- MainApplication.kt          # Application bootstrap
|
|-- .github/workflows/
|   |-- build-apk.yml             # Cloud CI/CD to build Release APK automatically
|-- App.js                        # Root React component
|-- package.json
|-- README.md
```

---

## 🛠️ Development Environment & Prerequisites

The application was built and verified in the following environment:
- **Operating System**: Windows 10
- **Node.js**: `v26.13.0`
- **npm**: `12.2.2`
- **Java JDK**: `Microsoft OpenJDK 17.0.21.1` (`JAVA_HOME`)
- **Gradle**: `Gradle 9.4.1` (via `android/gradlew`)
- **Android Platform Tools**: `ADB 37.0.1` (`C:\Program Files\platform-tools\adb.exe`)

---

## 📦 How to Build and Run

### Option A: Cloud Build (Recommended & 100% Free)
Because Android SDK components (platforms and build-tools) occupy several gigabytes and vary by machine, a automated **GitHub Actions workflow** is included at `.github/workflows/build-apk.yml`.

1. Push this repository to GitHub:
   ```bash
   git add .
   git commit -m "Build Instando"
   git push origin main
   ```
2. Navigate to your repository's **Actions** tab on GitHub.
3. The `Build Instando Android APK` workflow will run automatically.
4. Download the signed `app-release.apk` artifact and transfer it to your Android phone!

---

### Option B: Local Android Build

#### 1. Configure Android SDK
Ensure you have the Android SDK installed (either via Android Studio or command-line tools). Create `android/local.properties`:

```properties
sdk.dir=C:\\Users\\YOUR_USER\\AppData\\Local\\Android\\Sdk
```

#### 2. Connect Your Physical Android Phone
1. Enable **Developer Options** and **USB Debugging** on your phone.
2. Connect your phone via USB and verify:
   ```bash
   adb devices
   ```

#### 3. Build & Install Debug APK
From the project root:
```bash
npm run android
```

#### 4. Generate Release APK Locally
```bash
# 1. Bundle JavaScript
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

# 2. Build Release APK via Gradle
cd android
.\gradlew assembleRelease
```
The APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🔒 Privacy & Compliance
- **Zero Credentials**: Does not ask for, store, or transmit Instagram passwords, cookies, or session data.
- **Zero Trackers**: No analytics, telemetry, remote servers, or advertisements.
- **Scoped Storage**: Strictly saves files to standard media directories (`Movies/Instando` and `Pictures/Instando`) without requiring invasive `READ_EXTERNAL_STORAGE` permissions on modern Android versions.
- **Personal Use**: Intended solely for personal archiving of authorized public media.
