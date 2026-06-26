@echo off
chcp 65001 > nul
title シフト管理アプリ

cd /d "%~dp0"

if exist "dist\index.html" (
    echo シフト管理アプリを開きます...
    start "" "%~dp0dist\index.html"
    exit /b
)

echo dist\index.html が見つかりません。
echo ビルドを実行してください: npm run build
pause
