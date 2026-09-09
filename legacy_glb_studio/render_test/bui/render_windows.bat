@echo off
REM Blender Python (Instagram Quality) - one-click render (Windows)
setlocal
set "BLENDER="
if defined BLENDER goto :found
where blender >nul 2>nul && (set "BLENDER=blender" & goto :found)
for %%P in ("%ProgramFiles%\Blender Foundation\Blender 4.5\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 4.4\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 4.3\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 4.2\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 4.1\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 4.0\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 3.6\blender.exe" "%ProgramFiles%\Blender Foundation\Blender 3.4\blender.exe") do (
  if exist %%P set "BLENDER=%%~P" & goto :found
)
echo Blender was not found. Install Blender 3.4+ from blender.org, or set
echo the BLENDER environment variable to the full path of blender.exe
pause
exit /b 1
:found
echo Rendering with %BLENDER% ... first run compiles shaders, please wait.
"%BLENDER%" --background --factory-startup --python "%~dp0instagram_render.py"
echo.
echo Done - the output PNG/MP4 is next to this file.
pause
