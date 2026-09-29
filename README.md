# KitzLabs Forge Gradio Compatibility Fix

Purpose: repair Forge/Gradio 4.40 UI startup on the local Mac where the custom RangeSlider component blocks layout initialization.

Actions performed by `install.py`:
- backs up `requirements_versions.txt` once;
- changes only the Forge pin `gradio_rangeslider==0.0.6` to `0.0.8`;
- installs `gradio_rangeslider==0.0.8` with `--no-deps` so Gradio and the rest of Forge are not upgraded.

Rollback:
- run `rollback.py` with the same Python environment and restart Forge.

No model, prompt, VAE, checkpoint, safety, or Telegram configuration is modified.
