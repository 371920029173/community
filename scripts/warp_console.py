# -*- coding: utf-8 -*-
# 完整版：首次运行自动检测并静默安装 Cloudflare WARP（需一次UAC提权）
# 之后进入原来的 GUI 控制台逻辑，且所有 CLI 调用隐藏控制台窗口

import os
import sys
import threading
import tempfile
import time
import subprocess
import shutil
import urllib.request
import tkinter as tk
from tkinter import ttk, messagebox

# ========== 无控制台运行辅助 ==========
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

def run_no_window(cmd, timeout=None):
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
        creationflags=CREATE_NO_WINDOW
    )

# ========== WARP 自检与静默安装（仅首次） ==========
def warp_cli_path():
    # 1) PATH
    try:
        p = shutil.which("warp-cli")
        if p:
            return p
    except:
        pass
    # 2) 默认安装目录
    p = r"C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe"
    if os.path.exists(p):
        return p
    # 3) 尝试从注册表查找（通过PowerShell）
    ps = r"""
$paths = @('HKLM:\SOFTWARE\Cloudflare\Cloudflare WARP','HKLM:\SOFTWARE\WOW6432Node\Cloudflare\Cloudflare WARP')
foreach($rp in $paths){
  try{
    $x = Get-ItemProperty -Path $rp -ErrorAction Stop
    if($x.InstallLocation){
      $p = Join-Path $x.InstallLocation 'warp-cli.exe'
      if(Test-Path $p){ Write-Output $p; break }
    }
  }catch{}
}
"""
    r = run_no_window(["powershell", "-NoProfile", "-Command", ps], timeout=5)
    if r.stdout.strip():
        p = r.stdout.strip().splitlines()[0].strip()
        if os.path.exists(p):
            return p
    return None

def resolve_latest_warp_msi():
    # 优先解析 1.1.1.1 页面
    try:
        with urllib.request.urlopen("https://1.1.1.1/", timeout=15) as resp:
            html = resp.read().decode("utf-8", "ignore")
        import re
        m = re.search(r'href=["\\\']([^"\\\']+\\.msi)["\\\']', html, re.I)
        if m:
            u = m.group(1)
            if not u.startswith("http"):
                u = "https://1.1.1.1" + u
            return u
    except:
        pass
    # 备用地址
    for u in [
        "https://1.1.1.1/Cloudflare_WARP_Release-x64.msi",
        "https://downloads.cloudflareclient.com/windows/Cloudflare_WARP_Release-x64.msi",
    ]:
        try:
            with urllib.request.urlopen(urllib.request.Request(u, method="HEAD"), timeout=10):
                return u
        except:
            pass
    return None

def ensure_admin_and_install(msi_path):
    # 静默安装并自动UAC提权
    ps = f'''Start-Process msiexec.exe -ArgumentList '/i "{msi_path}" /quiet /qn /norestart' -Verb runas -WindowStyle Hidden -Wait'''
    r = run_no_window(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], timeout=900)
    return r.returncode == 0

def ensure_warp_installed():
    if warp_cli_path():
        return True, None
    url = resolve_latest_warp_msi()
    if not url:
        return False, "无法解析 WARP 安装包地址，请联网后重试。"
    tmp = os.path.join(tempfile.gettempdir(), "warp-installer.msi")
    try:
        urllib.request.urlretrieve(url, tmp)
    except Exception as e:
        return False, f"下载失败：{e}"
    ok = ensure_admin_and_install(tmp)
    try:
        os.remove(tmp)
    except:
        pass
    time.sleep(2)  # 等待PATH/服务刷新
    if ok and warp_cli_path():
        return True, None
    return False, "安装过程中出现问题，请手动安装后重试。"

# ========== GUI 控制台（保留核心功能） ==========

class WarpConsoleApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Cloudflare WARP 控制台")
        self.root.geometry("980x640")
        self.root.configure(bg="white")

        # 顶部栏
        top = tk.Frame(self.root, bg="white")
        top.pack(side="top", fill="x")
        ttk.Button(top, text="连接", command=self.connect).pack(side="left", padx=6, pady=6)
        ttk.Button(top, text="断开", command=self.disconnect).pack(side="left", padx=6, pady=6)
        ttk.Button(top, text="登录/注册", command=self.show_login_dialog).pack(side="left", padx=6, pady=6)

        # 日志区
        self.text = tk.Text(self.root, bg="#0b1020", fg="#d1e7ff", insertbackground="#d1e7ff")
        self.text.pack(side="top", fill="both", expand=True)
        self.log("初始化完成。", "info")

        # 先检测并安装 WARP（后台线程，界面不阻塞）
        threading.Thread(target=self.bootstrap_warp, daemon=True).start()

        # warp-cli 路径
        self.warp_cli = None

    def log(self, msg, level="info"):
        tag = {"info": "#9cdcfe", "ok": "#22c55e", "err": "#ef4444", "command": "#f59e0b"}.get(level, "#9cdcfe")
        self.text.insert("end", msg + "\n", level)
        self.text.tag_config(level, foreground=tag)
        self.text.see("end")

    def bootstrap_warp(self):
        self.log("检查 Cloudflare WARP 是否已安装...", "command")
        ok, err = ensure_warp_installed()
        if ok:
            self.warp_cli = warp_cli_path()
            self.log(f"WARP 就绪: {self.warp_cli}", "ok")
        else:
            self.log(f"WARP 安装失败：{err or '未知错误'}", "err")

    # —— 基础命令 ——
    def _run_cli(self, args, timeout=30):
        if not self.warp_cli:
            self.warp_cli = warp_cli_path()
            if not self.warp_cli:
                self.log("未检测到 warp-cli，请稍后或重新运行。", "err")
                return None
        self.log("执行: " + " ".join([self.warp_cli] + args), "command")
        try:
            r = subprocess.run([self.warp_cli] + args, capture_output=True, text=True, timeout=timeout, creationflags=CREATE_NO_WINDOW)
            if r.stdout:
                self.log(r.stdout.strip(), "info")
            if r.stderr:
                self.log(r.stderr.strip(), "err")
            return r
        except Exception as e:
            self.log(f"执行失败: {e}", "err")
            return None

    def connect(self):
        threading.Thread(target=lambda: self._run_cli(["connect"], timeout=20), daemon=True).start()

    def disconnect(self):
        threading.Thread(target=lambda: self._run_cli(["disconnect"], timeout=20), daemon=True).start()

    # —— 登录/注册（可按需补充你之前的交互） ——
    def show_login_dialog(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("登录 / 注册 WARP+")
        dlg.geometry("520x460")
        dlg.configure(bg="white")
        tk.Label(dlg, text="此处保留你的登录/注册逻辑，可按需完善", bg="white").pack(pady=20)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    # 启动 GUI（ensure_warp_installed 会在后台线程自动执行）
    app = WarpConsoleApp()
    app.run()




