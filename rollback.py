from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

extension_dir = Path(__file__).resolve().parent
webui_root = extension_dir.parent.parent
requirements = webui_root / "requirements_versions.txt"
backup = webui_root / "requirements_versions.txt.kitzlabs-rangeslider-20260929.bak"

if backup.is_file():
    shutil.copy2(backup, requirements)
    print(f"[KitzLabs Forge Fix] restored {requirements} from backup")
else:
    print("[KitzLabs Forge Fix] no requirements backup found")

subprocess.check_call([
    sys.executable,
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "--no-deps",
    "--upgrade",
    "gradio_rangeslider==0.0.6",
])
print("[KitzLabs Forge Fix] rollback complete: gradio_rangeslider=0.0.6")
