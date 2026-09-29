from __future__ import annotations

import importlib.metadata
import re
import shutil
import subprocess
import sys
from pathlib import Path

TARGET = "0.0.8"
PIN_OLD = "gradio_rangeslider==0.0.6"
PIN_NEW = f"gradio_rangeslider=={TARGET}"

extension_dir = Path(__file__).resolve().parent
webui_root = extension_dir.parent.parent
requirements = webui_root / "requirements_versions.txt"
backup = webui_root / "requirements_versions.txt.kitzlabs-rangeslider-20260929.bak"

if requirements.is_file():
    text = requirements.read_text(encoding="utf-8")
    if PIN_OLD in text:
        if not backup.exists():
            shutil.copy2(requirements, backup)
            print(f"[KitzLabs Forge Fix] requirements backup: {backup}")
        patched = re.sub(
            r"(?m)^gradio_rangeslider==0\.0\.6\s*$",
            PIN_NEW,
            text,
            count=1,
        )
        requirements.write_text(patched, encoding="utf-8")
        print(f"[KitzLabs Forge Fix] pin updated: {PIN_OLD} -> {PIN_NEW}")
    elif PIN_NEW in text:
        print(f"[KitzLabs Forge Fix] requirements already pinned to {PIN_NEW}")
    else:
        print("[KitzLabs Forge Fix] rangeslider pin not found; requirements file left unchanged")

try:
    current = importlib.metadata.version("gradio_rangeslider")
except importlib.metadata.PackageNotFoundError:
    current = None

if current != TARGET:
    print(f"[KitzLabs Forge Fix] installing gradio_rangeslider {TARGET} (current={current})")
    subprocess.check_call([
        sys.executable,
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--no-deps",
        "--upgrade",
        f"gradio_rangeslider=={TARGET}",
    ])
else:
    print(f"[KitzLabs Forge Fix] gradio_rangeslider {TARGET} already installed")

installed = importlib.metadata.version("gradio_rangeslider")
if installed != TARGET:
    raise RuntimeError(f"gradio_rangeslider version mismatch after install: {installed}")

print(f"[KitzLabs Forge Fix] OK gradio_rangeslider={installed}")
