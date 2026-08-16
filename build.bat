@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo [DeepSeek Harness] 检查 pnpm 更新...
call corepack use pnpm@latest
if errorlevel 1 (
    echo.
    echo 警告：pnpm 更新失败（可能是网络问题），继续使用现有版本构建。
    echo.
)

echo [DeepSeek Harness] 开始构建...
call pnpm run build
set "BUILD_EXIT=%errorlevel%"
if not "%BUILD_EXIT%"=="0" (
    echo.
    echo 构建失败，错误代码：%BUILD_EXIT%
    pause
    exit /b %BUILD_EXIT%
)

echo.
echo 构建完成。
pause
exit /b 0
