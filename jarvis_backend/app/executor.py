import subprocess, os

def execute_script(path: str, target_platform: str):
    if not path or not os.path.exists(path):
        print("Script not found:", path)
        return

    if target_platform == "windows":
        # ✅ Use full path to AutoHotkey executable
        ahk_path = r"D:\AutoHotkey\v2\AutoHotkey64.exe"
        subprocess.Popen([ahk_path, path])
    elif target_platform == "mac":
        subprocess.Popen(["osascript", path])
    else:
        print("Unknown platform, not executing script.")
