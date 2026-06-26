@echo off
chcp 65001 > nul
title シフト管理アプリ - ビルド

cd /d "%~dp0"

echo ビルドを開始します...
call npm run build

if %errorlevel% == 0 (
    echo.
    echo ビルド完了しました。dist\index.html を開きます...
    start "" "%~dp0dist\index.html"
) else (
    echo.
    echo ビルドに失敗しました。
    pause
)
