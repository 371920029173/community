# -*- coding: utf-8 -*-
"""
Cloudflare WARP 控制面板（保留原样式 + 首次自动安装 + 过程日志）
单文件打包即可分发：
  pyinstaller .\scripts\warp_controller.py -F -w -n WARP控制面板
"""

import os
import sys
import subprocess
import shutil
import urllib.request
import tempfile
import threading
import time
import tkinter as tk
from tkinter import ttk, messagebox

# Windows 注册表访问（不依赖 PowerShell）
try:
    import winreg
    HAS_WINREG = True
except ImportError:
    HAS_WINREG = False

# Windows API 调用（用于管理员权限）
try:
    import ctypes
    from ctypes import wintypes
    HAS_CTYPES = True
except ImportError:
    HAS_CTYPES = False


# ----------------- 子进程辅助 -----------------
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

def run_no_window(cmd, timeout=None):
    try:
        return subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            creationflags=CREATE_NO_WINDOW,
        )
    except Exception as e:
        cp = subprocess.CompletedProcess(cmd, 1, "", str(e))
        return cp


# ----------------- WARP 安装检测 -----------------
def find_warp_cli():
    try:
        p = shutil.which("warp-cli")
        if p:
            return p
    except:  # noqa
        pass

    default_path = r"C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe"
    if os.path.exists(default_path):
        return default_path

    # 使用 Python winreg 模块查找注册表（不依赖 PowerShell）
    if HAS_WINREG:
        reg_paths = [
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Cloudflare\Cloudflare WARP"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Cloudflare\Cloudflare WARP"),
        ]
        for hkey, path in reg_paths:
            try:
                with winreg.OpenKey(hkey, path) as key:
                    install_location = winreg.QueryValueEx(key, "InstallLocation")[0]
                    if install_location:
                        p = os.path.join(install_location, "warp-cli.exe")
                        if os.path.exists(p):
                            return p
            except (OSError, FileNotFoundError, WindowsError):
                continue
    
    # 如果 winreg 不可用，尝试使用 reg.exe（Windows 自带）
    try:
        r = run_no_window(["reg", "query", r"HKLM\SOFTWARE\Cloudflare\Cloudflare WARP", "/v", "InstallLocation"], timeout=5)
        if r.returncode == 0 and r.stdout:
            for line in r.stdout.splitlines():
                if "InstallLocation" in line:
                    parts = line.split()
                    if len(parts) >= 3:
                        install_location = parts[-1]
                        p = os.path.join(install_location, "warp-cli.exe")
                        if os.path.exists(p):
                            return p
    except:  # noqa
        pass
    
    return None


def resolve_latest_warp_msi():
    """解析 WARP MSI 下载地址（使用多个备用源）"""
    # 检测系统架构
    is_64bit = sys.maxsize > 2**32
    arch = "x64" if is_64bit else "x86"
    filename = f"Cloudflare_WARP_Release-{arch}.msi"
    
    # 尝试多个下载源（按优先级）
    urls = [
        f"https://downloads.cloudflareclient.com/v1/download/windows/installers/{filename}",
        f"https://downloads.cloudflareclient.com/windows/{filename}",
        f"https://1.1.1.1/{filename}",
    ]
    
    # 尝试从 1.1.1.1 页面解析最新链接
    try:
        with urllib.request.urlopen("https://1.1.1.1/", timeout=15) as resp:
            html = resp.read().decode("utf-8", "ignore")
        import re
        m = re.search(r'href=["\']([^"\']+\.msi)["\']', html, re.I)
        if m:
            u = m.group(1)
            if not u.startswith("http"):
                u = "https://1.1.1.1" + u
            # 如果解析到的链接包含我们需要的架构，优先使用
            if arch in u.lower():
                urls.insert(0, u)
    except:  # noqa
        pass

    # 尝试每个 URL
    for u in urls:
        try:
            with urllib.request.urlopen(urllib.request.Request(u, method="HEAD"), timeout=10):
                return u
        except:  # noqa
            continue
    return None


def ensure_admin_install(msi_path):
    """使用 ShellExecuteEx 请求管理员权限安装（不依赖 PowerShell）"""
    if HAS_CTYPES:
        try:
            # 使用 ShellExecuteEx 请求管理员权限（会弹出 UAC 对话框）
            shell32 = ctypes.windll.shell32
            
            # ShellExecuteEx 结构体
            class SHELLEXECUTEINFO(ctypes.Structure):
                _fields_ = [
                    ("cbSize", ctypes.c_uint),
                    ("fMask", ctypes.c_ulong),
                    ("hwnd", ctypes.c_void_p),
                    ("lpVerb", ctypes.c_wchar_p),
                    ("lpFile", ctypes.c_wchar_p),
                    ("lpParameters", ctypes.c_wchar_p),
                    ("lpDirectory", ctypes.c_wchar_p),
                    ("nShow", ctypes.c_int),
                    ("hInstApp", ctypes.c_void_p),
                    ("lpIDList", ctypes.c_void_p),
                    ("lpClass", ctypes.c_wchar_p),
                    ("hKeyClass", ctypes.c_void_p),
                    ("dwHotKey", ctypes.c_ulong),
                    ("hIcon", ctypes.c_void_p),
                    ("hProcess", ctypes.c_void_p),
                ]
            
            sei = SHELLEXECUTEINFO()
            sei.cbSize = ctypes.sizeof(SHELLEXECUTEINFO)
            sei.fMask = 0x00000040  # SEE_MASK_NOCLOSEPROCESS
            sei.lpVerb = "runas"  # 请求管理员权限
            sei.lpFile = "msiexec.exe"
            sei.lpParameters = f'/i "{msi_path}" /quiet /qn /norestart'
            sei.nShow = 0  # SW_HIDE
            
            result = shell32.ShellExecuteExW(ctypes.byref(sei))
            if result:
                # 等待安装完成
                if sei.hProcess:
                    ctypes.windll.kernel32.WaitForSingleObject(sei.hProcess, 900000)  # 15分钟超时
                    ctypes.windll.kernel32.CloseHandle(sei.hProcess)
                time.sleep(2)  # 额外等待
                return find_warp_cli() is not None
        except Exception as e:
            # 如果 ShellExecuteEx 失败，回退到其他方法
            pass
    
    # 回退方法：创建批处理文件，提示用户以管理员身份运行
    # 或者直接尝试调用 msiexec（如果当前已有管理员权限）
    try:
        r = run_no_window(["msiexec.exe", "/i", msi_path, "/quiet", "/qn", "/norestart"], timeout=900)
        if r.returncode == 0:
            time.sleep(2)
            return find_warp_cli() is not None
    except:  # noqa
        pass
    
    # 如果都失败了，等待一下再检查（可能用户手动确认了 UAC）
    time.sleep(3)
    return find_warp_cli() is not None


def ensure_warp_installed(log):
    p = find_warp_cli()
    if p:
        log(f"[OK] 检测到 warp-cli: {p}")
        return True

    log("[INFO] 未检测到 WARP，开始下载安装…")
    url = resolve_latest_warp_msi()
    if not url:
        log("[FAIL] 无法解析安装包地址（请联网后重试）")
        return False

    msi = os.path.join(tempfile.gettempdir(), "warp-installer.msi")
    try:
        urllib.request.urlretrieve(url, msi)
        log(f"[OK] 安装包已下载：{msi}")
    except Exception as e:
        log(f"[FAIL] 下载失败：{e}")
        return False

    if not ensure_admin_install(msi):
        log("[FAIL] 安装失败或被取消（需要管理员权限）")
        return False

    try:
        os.remove(msi)
    except:  # noqa
        pass

    time.sleep(2)
    if find_warp_cli():
        log("[OK] WARP 安装完成")
        return True
    log("[FAIL] 安装完成但未检测到 warp-cli")
    return False


# ----------------- 主界面 -----------------
class WARPController:
    def __init__(self, root):
        self.root = root
        self.root.title("Cloudflare WARP 控制面板")
        self.root.geometry("560x520")
        self.root.resizable(False, False)
        self.root.configure(bg="#f8f9fa")

        self.warp_cli = None

        self._build_ui()

        # 启动自检与安装（后台线程）
        threading.Thread(target=self._bootstrap, daemon=True).start()

    # ---- UI ----
    def _build_ui(self):
        # 顶部标题
        title = tk.Frame(self.root, bg="#667eea", height=60)
        title.pack(fill="x")
        tk.Label(title, text="Cloudflare WARP 控制面板", font=("Microsoft YaHei", 16, "bold"), bg="#667eea", fg="white").pack(pady=15)

        # 状态卡片
        card = tk.Frame(self.root, bg="white", relief="solid", bd=1)
        card.pack(fill="x", padx=20, pady=16)

        tk.Label(card, text="当前状态：", font=("Microsoft YaHei", 10), bg="white", anchor="w").pack(fill="x", padx=20, pady=(20, 5))

        self.status_label = tk.Label(card, text="检测中…", font=("Microsoft YaHei", 14, "bold"), bg="white", fg="#666", anchor="w")
        self.status_label.pack(fill="x", padx=20, pady=5)

        self.info_label = tk.Label(card, text="", font=("Microsoft YaHei", 9), bg="white", fg="#999", anchor="w")
        self.info_label.pack(fill="x", padx=20, pady=(0, 16))

        # 按钮区
        btns = tk.Frame(self.root, bg="#f8f9fa")
        btns.pack(fill="x", padx=20)
        self.btn_connect = tk.Button(btns, text="连接", font=("Microsoft YaHei", 12, "bold"), bg="#28a745", fg="white", width=12, height=2, relief="flat", cursor="hand2", command=self.connect_warp)
        self.btn_connect.pack(side="left", padx=5)
        self.btn_disconnect = tk.Button(btns, text="断开", font=("Microsoft YaHei", 12, "bold"), bg="#dc3545", fg="white", width=12, height=2, relief="flat", cursor="hand2", command=self.disconnect_warp)
        self.btn_disconnect.pack(side="left", padx=5)
        tk.Button(btns, text="刷新", font=("Microsoft YaHei", 10), bg="#17a2b8", fg="white", width=12, height=2, relief="flat", cursor="hand2", command=self.update_status).pack(side="left", padx=5)

        # 过程日志区（仿 bat 输出）
        log_frame = tk.Frame(self.root, bg="#f8f9fa")
        log_frame.pack(fill="both", expand=True, padx=20, pady=10)
        self.log_text = tk.Text(log_frame, bg="#0b1020", fg="#d1e7ff", insertbackground="#d1e7ff", height=12)
        self.log_text.pack(side="left", fill="both", expand=True)
        sb = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        sb.pack(side="right", fill="y")
        self.log_text.configure(yscrollcommand=sb.set)

        tk.Label(self.root, text="每3秒自动刷新状态 | 操作过程输出如下", font=("Microsoft YaHei", 8), bg="#f8f9fa", fg="#999").pack(pady=(0, 10))

    # ---- 日志 ----
    def log(self, line: str):
        self.log_text.insert("end", line + "\n")
        self.log_text.see("end")

    # ---- 自检 ----
    def _bootstrap(self):
        self._set_buttons_state(False)
        self.log("[INFO] 正在检测 WARP 安装…")
        ok = ensure_warp_installed(self.log)
        if ok:
            self.warp_cli = find_warp_cli()
            self.log(f"[OK] warp-cli: {self.warp_cli}")
            self.root.after(0, self.update_status)
            self._set_buttons_state(True)
        else:
            self.log("[FAIL] 无法安装 WARP，请稍后重试或手动安装。")
            self.status_label.config(text="未安装", fg="#dc3545")
            self.info_label.config(text="请先安装 Cloudflare WARP：1.1.1.1")
            self._set_buttons_state(False)

        # 启动自动刷新
        self.root.after(3000, self.auto_refresh)

    def _set_buttons_state(self, enabled: bool):
        state = ("normal" if enabled else "disabled")
        for b in (self.btn_connect, self.btn_disconnect):
            b.config(state=state)

    # ---- 状态获取 ----
    def get_status(self):
        if not self.warp_cli:
            self.warp_cli = find_warp_cli()
            if not self.warp_cli:
                return {"status": "not_installed", "text": "未安装", "color": "#dc3545", "info": "请安装 WARP"}

        r = run_no_window([self.warp_cli, "status"], timeout=6)
        out = (r.stdout or "").strip()
        if "Status update: Connected" in out:
            # 读取模式
            mode = "WARP"
            r2 = run_no_window([self.warp_cli, "settings"], timeout=6)
            if "Mode: Warp+" in (r2.stdout or ""):
                mode = "WARP+"
            return {"status": "connected", "text": f"已连接 ({mode})", "color": "#28a745", "info": "WARP 正在运行中"}
        if "Status update: Disconnected" in out:
            return {"status": "disconnected", "text": "未连接", "color": "#dc3545", "info": "点击连接按钮开始使用 WARP"}
        return {"status": "unknown", "text": "状态未知", "color": "#666666", "info": "无法获取状态信息"}

    def update_status(self):
        s = self.get_status()
        self.status_label.config(text=s["text"], fg=s["color"])
        self.info_label.config(text=s["info"])
        if s["status"] == "connected":
            self.btn_connect.config(state="disabled")
            self.btn_disconnect.config(state="normal")
        elif s["status"] == "disconnected":
            self.btn_connect.config(state="normal")
            self.btn_disconnect.config(state="disabled")
        else:
            self.btn_connect.config(state="normal")
            self.btn_disconnect.config(state="normal")

    # ---- 操作 ----
    def connect_warp(self):
        if not messagebox.askyesno("确认连接", "确定要连接到 Cloudflare WARP 吗？"):
            return
        self.status_label.config(text="连接中…", fg="#ffc107")
        self.info_label.config(text="正在连接…")
        self.btn_connect.config(state="disabled")
        self.root.update()

        def task():
            self.log("[CMD] warp-cli connect")
            r = run_no_window([self.warp_cli, "connect"], timeout=20)
            if r.stdout:
                self.log(r.stdout.strip())
            if r.stderr:
                self.log(r.stderr.strip())
            time.sleep(2)
            self.root.after(0, self.update_status)
        threading.Thread(target=task, daemon=True).start()

    def disconnect_warp(self):
        if not messagebox.askyesno("确认断开", "确定要断开 Cloudflare WARP 吗？"):
            return
        self.status_label.config(text="断开中…", fg="#ffc107")
        self.info_label.config(text="正在断开…")
        self.btn_disconnect.config(state="disabled")
        self.root.update()

        def task():
            self.log("[CMD] warp-cli disconnect")
            r = run_no_window([self.warp_cli, "disconnect"], timeout=20)
            if r.stdout:
                self.log(r.stdout.strip())
            if r.stderr:
                self.log(r.stderr.strip())
            time.sleep(2)
            self.root.after(0, self.update_status)
        threading.Thread(target=task, daemon=True).start()

    # ---- 自动刷新 ----
    def auto_refresh(self):
        self.update_status()
        self.root.after(3000, self.auto_refresh)


def main():
    root = tk.Tk()
    app = WARPController(root)
    root.mainloop()


if __name__ == "__main__":
    main()


