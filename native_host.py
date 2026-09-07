import sys
import json
import struct
import os
import re
import shutil
import subprocess
import urllib.request
import zipfile
import io

def send_message(message):
    try:
        raw = json.dumps(message).encode('utf-8')
        sys.stdout.buffer.write(struct.pack('<I', len(raw)))
        sys.stdout.buffer.write(raw)
        sys.stdout.buffer.flush()
    except Exception:
        pass

def read_message():
    try:
        raw_len = sys.stdin.buffer.read(4)
        if not raw_len or len(raw_len) < 4:
            return None
        msg_len = struct.unpack('<I', raw_len)[0]
        raw_msg = sys.stdin.buffer.read(msg_len).decode('utf-8')
        return json.loads(raw_msg)
    except Exception:
        return None

def normalize_youtube_url(url):
    if not url or not isinstance(url, str):
        return ""
    url = url.strip()

    # youtu.be/<id>
    m = re.search(r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]{11})', url)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"

    # /shorts/<id>
    m = re.search(r'(?:https?://)?(?:[a-zA-Z0-9.-]+\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})', url)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"

    # watch?v=<id>
    m = re.search(r'(?:https?://)?(?:[a-zA-Z0-9.-]+\.)?youtube\.com/watch\?(?:[^&\s]*&)*v=([a-zA-Z0-9_-]{11})', url)
    if m:
        return f"https://www.youtube.com/watch?v={m.group(1)}"

    # fallback
    return url

def find_ytdlp_folder():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Check saved config file downloader_folder.txt
    config_file = os.path.join(script_dir, "downloader_folder.txt")
    if os.path.isfile(config_file):
        try:
            with open(config_file, "r", encoding="utf-8") as f:
                saved_path = f.read().strip()
                if saved_path and os.path.isdir(saved_path):
                    if os.path.isfile(os.path.join(saved_path, "yt-dlp.exe")):
                        return saved_path
        except Exception:
            pass

    # 2. Candidate directories to check directly
    user_profile = os.environ.get("USERPROFILE", "")
    candidates = [
        script_dir,
        r"D:\Youtube video download",
        r"D:\project\Youtube video download",
        os.path.join(user_profile, "Desktop") if user_profile else "",
        os.path.join(user_profile, "OneDrive", "Desktop") if user_profile else "",
        os.path.join(user_profile, "Downloads") if user_profile else "",
        r"D:\Youtube",
        r"D:\Downloads",
        r"D:\\"
    ]

    for c in candidates:
        if c and os.path.isdir(c):
            if os.path.isfile(os.path.join(c, "yt-dlp.exe")):
                return c

    # 3. Check 1 level deep in D:\ and Desktop
    search_bases = [r"D:\\"]
    if user_profile:
        search_bases.append(os.path.join(user_profile, "Desktop"))

    for base in search_bases:
        if os.path.isdir(base):
            try:
                for entry in os.scandir(base):
                    if entry.is_dir(follow_symlinks=False):
                        if os.path.isfile(os.path.join(entry.path, "yt-dlp.exe")):
                            return entry.path
            except Exception:
                continue

    return None

def handle_launch(msg):
    urls = msg.get("urls", [])
    if not urls and "url" in msg:
        urls = [msg["url"]]

    # Normalize URLs
    normalized_urls = []
    for u in urls:
        norm = normalize_youtube_url(u)
        if norm:
            normalized_urls.append(norm)

    if not normalized_urls:
        return {"status": "error", "error": "No valid URLs provided"}

    # Find yt-dlp folder
    ytdlp_folder = find_ytdlp_folder()
    if not ytdlp_folder:
        return {
            "status": "error",
            "error": "yt-dlp.exe folder not found. Please run Register_Downloader_Button.bat"
        }

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Write links.txt in ytdlp folder
    links_path = os.path.join(ytdlp_folder, "links.txt")
    try:
        with open(links_path, "w", encoding="utf-8") as f:
            for link in normalized_urls:
                f.write(f"{link}\n")
    except Exception as e:
        return {"status": "error", "error": f"Failed to write links.txt: {str(e)}"}

    # Always copy the latest AUTO bat so window-close and other updates apply
    auto_bat_target = os.path.join(ytdlp_folder, "Zabii_Fast_Downloader_AUTO.bat")
    auto_bat_source = os.path.join(script_dir, "Zabii_Fast_Downloader_AUTO.bat")

    if os.path.isfile(auto_bat_source):
        try:
            shutil.copy2(auto_bat_source, auto_bat_target)
        except Exception as e:
            if not os.path.isfile(auto_bat_target):
                return {"status": "error", "error": f"Failed to copy AUTO bat: {str(e)}"}

    target_bat = auto_bat_target if os.path.isfile(auto_bat_target) else auto_bat_source
    if not os.path.isfile(target_bat):
        return {"status": "error", "error": "Zabii_Fast_Downloader_AUTO.bat not found"}

    # Determine mode: single (direct to Desktop) or group (separate folder)
    mode = msg.get("mode", "auto")
    if mode == "auto":
        mode = "single" if len(normalized_urls) == 1 else "group"

    # Minimized console; cmd /c closes the window when the batch finishes.
    try:
        CREATE_NEW_CONSOLE = 0x00000010
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = 7  # SW_SHOWMINNOACTIVE
        subprocess.Popen(
            f'cmd.exe /c "{target_bat}" {mode}',
            cwd=ytdlp_folder,
            startupinfo=si,
            creationflags=CREATE_NEW_CONSOLE
        )
        return {
            "status": "ok",
            "count": len(normalized_urls),
            "path": ytdlp_folder,
            "mode": mode
        }
    except Exception as e:
        return {"status": "error", "error": f"Launch failed: {str(e)}"}

def handle_update_extension(msg):
    zip_url = msg.get("zip_url", "")
    if not zip_url:
        return {"status": "error", "error": "No update zip URL provided"}

    script_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        req = urllib.request.Request(zip_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=45) as resp:
            zip_bytes = resp.read()

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            for member in z.infolist():
                if member.is_dir():
                    continue
                filename = os.path.basename(member.filename)
                # Ignore empty or files starting with _ (e.g. __pycache__) to prevent Chrome load errors
                if not filename or filename.startswith("_"):
                    continue
                target_path = os.path.join(script_dir, filename)
                with z.open(member) as src, open(target_path, "wb") as dst:
                    shutil.copyfileobj(src, dst)

        return {"status": "ok", "message": "Updated successfully"}
    except Exception as e:
        return {"status": "error", "error": f"Update failed: {str(e)}"}

if __name__ == '__main__':
    msg = read_message()
    if not msg:
        sys.exit(0)

    action = msg.get("action", "")
    if action in ("launch", "launch_downloader"):
        result = handle_launch(msg)
        send_message(result)
    elif action == "update_extension":
        result = handle_update_extension(msg)
        send_message(result)
    else:
        send_message({"status": "error", "error": f"Unknown action: {action}"})
