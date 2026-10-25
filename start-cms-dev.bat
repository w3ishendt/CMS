@echo off
setlocal

set "BACKEND_PORT=8082"
set "FRONTEND_PORT=5173"

powershell -NoProfile -Command "$pids = (Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if ($pids) { foreach ($pid in $pids) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } }; Get-NetTCPConnection -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue | Out-Null; "

start "CMS Backend" cmd /k "cd /d C:\Users\Dango\Desktop\cms\cms-backend && .\mvnw.cmd spring-boot:run"

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %FRONTEND_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
	start "CMS Frontend" cmd /k "cd /d C:\Users\Dango\Desktop\cms\cms_frontend && npm run dev"
) else (
	echo Frontend already running on port %FRONTEND_PORT%. Skipping start.
)