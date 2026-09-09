#!/usr/bin/env bash
# Blender Python (Instagram Quality) - one-click render (macOS / Linux)
set -e
cd "$(dirname "$0")"
BIN="${BLENDER:-}"
if [ -z "$BIN" ]; then
  if command -v blender >/dev/null 2>&1; then
    BIN="blender"
  elif [ -x "/Applications/Blender.app/Contents/MacOS/Blender" ]; then
    BIN="/Applications/Blender.app/Contents/MacOS/Blender"
  fi
fi
if [ -z "$BIN" ]; then
  echo "Blender not found. Install Blender 3.4+ from blender.org or set:"
  echo "  export BLENDER=/path/to/blender"
  exit 1
fi
echo "Rendering with: $BIN   (first run compiles shaders, please wait)"
"$BIN" --background --factory-startup --python "$(pwd)/instagram_render.py"
echo "Done - the output PNG/MP4 is next to this file."
