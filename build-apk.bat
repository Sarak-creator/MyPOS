@echo off
echo ========================================================
echo   Anachak POS (អាណាចក្រPOS) - Android APK Builder
echo ========================================================
echo.

set JAVA_HOME=C:\Users\user\.jdks\jdk-17.0.12+7
set ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/3] Syncing Capacitor Android assets...
call npx @capacitor/cli copy android

echo.
echo [2/3] Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleDebug
cd ..

if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo [3/3] Copying APK to root...
    copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "AnachakPOS-v1.0.0.apk"
    if not exist "public\downloads" mkdir "public\downloads"
    copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "public\downloads\AnachakPOS.apk"
    echo.
    echo ========================================================
    echo   BUILD SUCCESS! APK ready at: AnachakPOS-v1.0.0.apk
    echo ========================================================
) else (
    echo.
    echo [ERROR] Build failed! Check Gradle output above.
)
pause
