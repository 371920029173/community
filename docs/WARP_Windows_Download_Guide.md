# Cloudflare WARP Windows 安装下载指南

> 适用范围：Windows 7 / 8 / 8.1 / 10 / 11（32/64 位）

本指南整理了在 Windows 环境下使用 Cloudflare WARP（俗称“WARP 梯子”）的下载与安装方式，提供多个可靠渠道及离线安装方案，确保在无法在线下载时也能顺利部署。

## 1. 官方下载渠道（推荐）

| 平台 | 文件 | 下载地址 |
| --- | --- | --- |
| Windows（64 位） | Cloudflare_WARP_Release-x64.msi | https://downloads.cloudflareclient.com/v1/download/windows/installers/Cloudflare_WARP_Release-x64.msi |
| Windows（32 位） | Cloudflare_WARP_Release-x86.msi | https://downloads.cloudflareclient.com/v1/download/windows/installers/Cloudflare_WARP_Release-x86.msi |

> 说明：上述链接为 Cloudflare 官方 CDN，若下载卡住，可稍等或切换网络（例如移动数据热点）。

### 校验下载文件

```powershell
# 64 位安装包
certutil -hashfile .\Cloudflare_WARP_Release-x64.msi SHA256

# 32 位安装包
certutil -hashfile .\Cloudflare_WARP_Release-x86.msi SHA256
```

Cloudflare 官方发布的 SHA256 通常位于下载页面底部，若无法获取，可通过再次下载比对或使用脚本（见下文）自动校验。

### 静默安装（管理员）

```powershell
Start-Process msiexec.exe -ArgumentList '/i "C:\路径\Cloudflare_WARP_Release-x64.msi" /quiet /qn /norestart' -Verb runas -Wait
```

## 2. 备用下载源

若官方 CDN 无法访问，可尝试以下截图中的镜像。请注意：

- 这些链接来自 Cloudflare 官方提供的旧版或备用域名，若失效可手动更换 `v1` 为其他版本号；
- 建议下载后执行 `certutil` 校验，确保文件未受篡改。

| 说明 | 下载地址 |
| --- | --- |
| 备用 1（旧版） | https://downloads.cloudflareclient.com/windows/Cloudflare_WARP_Release-x64.msi |
| 备用 2（Beta 测试） | https://downloads.cloudflareclient.com/v1/download/windows/beta/Cloudflare_WARP_Beta-x64.msi |

## 3. 自动化安装脚本

仓库中提供了自动检测并安装 WARP 的脚本，可在任意纯净的 Windows 下运行：

```
scripts/warp-install.ps1  # PowerShell 版（默认静默安装）
scripts/warp-install.bat  # 批处理版（内部调用 warp-install.ps1）
```

使用方式：

```powershell
cd C:\Users\Lenovo\Desktop\web
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\warp-install.ps1
```

脚本特性：

- 自动检测 `warp-cli.exe`
- 若缺失则从官方 CDN 下载最新版 MSI
- 静默安装并自动请求 UAC 提权
- 适用于 Windows 7 及以上（需安装 PowerShell 5.1 或更新）

## 4. 集成版控制面板 EXE

我们打包的 `WARP控制面板.exe`（位于 `dist/` 目录）在首次运行时会自动调用与上文相同的安装逻辑：

1. 自检本地是否存在 `warp-cli`
2. 如果没有，自动下载并静默安装（需要管理员权限）
3. 安装完成后进入 GUI 控制面板

> 若运行时提示下载失败，可手动安装上文链接的 MSI，再重新打开 EXE。

## 5. 常见下载问题排查

| 问题 | 原因 | 解决方法 |
| --- | --- | --- |
| 下载速度慢或失败 | 网络被墙 / CDN 节点不稳定 | 换网络、使用移动热点或 VPN；尝试备用链接 |
| 提示“无法打开文件” | 下载未完成或文件损坏 | 删除旧文件，重新下载并核对 SHA256 |
| 安装报错 2503/2502 | 权限不足 | 右键“以管理员身份运行”安装命令 |
| 脚本执行被阻止 | PowerShell 执行策略受限 | 在管理员 PowerShell 中运行 `Set-ExecutionPolicy RemoteSigned`（或使用 `-ExecutionPolicy Bypass`） |

## 6. Win7 特殊说明

- 需要安装 Microsoft .NET Framework 4.6+ 与 Visual C++ 2015-2019 运行库
- 若系统未更新 PowerShell 5.1，请安装 [Windows Management Framework 5.1](https://www.microsoft.com/download/details.aspx?id=54616)
- 下载链接相同，但建议优先使用 32 位安装包以兼容旧设备

## 7. 卸载与重装

### 卸载

```powershell
Start-Process msiexec.exe -ArgumentList '/x "Cloudflare WARP" /quiet /qn /norestart' -Verb runas -Wait
```

或通过“控制面板 → 程序和功能”找到 “Cloudflare WARP” 卸载。

### 重装

若安装异常，可：

1. 卸载现有客户端（如上）
2. 删除 `C:\Program Files\Cloudflare\Cloudflare WARP` 目录（若存在）
3. 重新安装 MSI 或运行自动化脚本

---

如需一键自动化部署，请使用仓库内的 `WARP控制面板.exe` 或 `warp-install.ps1`。若脚本下载仍有问题，可将 MSI 文件离线传输到目标主机，再执行静默安装命令即可。




