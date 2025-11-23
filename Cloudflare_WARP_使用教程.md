# Cloudflare WARP 使用教程

## 📋 目录
1. [什么是 Cloudflare WARP](#什么是-cloudflare-warp)
2. [安装状态检查](#安装状态检查)
3. [基本使用](#基本使用)
4. [常用命令](#常用命令)
5. [连接模式](#连接模式)
6. [故障排除](#故障排除)

---

## 什么是 Cloudflare WARP

Cloudflare WARP 是一个免费的个人 VPN 服务，可以：
- 🚀 加速互联网连接
- 🔒 加密您的网络流量
- 🌍 访问被限制的网站和服务
- 📱 保护您的隐私

**注意**：WARP 是免费的个人 VPN，不是完全匿名的 VPN，主要用于提升连接速度和安全性。

---

## 安装状态检查

### ✅ 检查是否已安装

```powershell
# 检查安装路径
Test-Path "$env:ProgramFiles\Cloudflare\Cloudflare WARP\warp-cli.exe"

# 检查是否运行中
Get-Process | Where-Object { $_.ProcessName -like "*warp*" }
```

### ✅ 查看当前状态

```powershell
# 查看连接状态
& "$env:ProgramFiles\Cloudflare\Cloudflare WARP\warp-cli.exe" status

# 查看设置
& "$env:ProgramFiles\Cloudflare WARP\warp-cli.exe" settings
```

---

## 基本使用

### 🎯 方式一：图形界面（推荐）

1. **打开 WARP**
   - 按 `Win` 键，搜索 "Cloudflare WARP"
   - 或者点击开始菜单中的 "Cloudflare WARP"

2. **连接/断开**
   - 点击主界面的开关按钮
   - 连接成功后会显示绿色的 "Connected" 状态

3. **切换模式**
   - **WARP**：加密所有流量（推荐）
   - **WARP+**：需要注册账户，速度更快
   - **WARP Proxy**：仅代理部分流量

### 🖥️ 方式二：命令行（CLI）

#### 注册账户（可选，WARP+ 需要）

```powershell
# 打开命令提示符或 PowerShell（需要管理员权限）
cd "$env:ProgramFiles\Cloudflare\Cloudflare WARP"

# 注册账户（会提示输入邮箱，获取验证码）
.\warp-cli.exe register

# 如果你已经有注册码（WARP+ 的许可证密钥）
.\warp-cli.exe set-mode warp+
.\warp-cli.exe set-license YOUR_LICENSE_KEY
```

#### 连接和断开

```powershell
# 连接到 WARP
.\warp-cli.exe connect

# 断开连接
.\warp-cli.exe disconnect

# 查看状态
.\warp-cli.exe status
```

---

## 常用命令

### 📊 查看状态和设置

```powershell
# 查看当前连接状态
warp-cli.exe status

# 查看所有设置
warp-cli.exe settings

# 查看账户信息
warp-cli.exe account
```

### 🔧 配置设置

```powershell
# 设置模式（warp / warp+ / warp-proxy）
warp-cli.exe set-mode warp

# 启用/禁用 DNS 解析
warp-cli.exe set-dns-mode dot

# 查看帮助
warp-cli.exe --help
```

### 🔄 重置和清理

```powershell
# 清除所有设置并重新注册
warp-cli.exe clear-settings

# 重启 WARP 服务
warp-cli.exe restart
```

---

## 连接模式

### 1. **WARP**（默认免费模式）
- ✅ 免费使用
- ✅ 加密流量
- ✅ 提升速度
- 无需注册

```powershell
warp-cli.exe set-mode warp
```

### 2. **WARP+**（高级模式）
- 🚀 更快的速度
- 📊 更多服务器选择
- 需要注册账户和许可证密钥

```powershell
# 先注册账户
warp-cli.exe register

# 设置 WARP+ 模式
warp-cli.exe set-mode warp+

# 如果有许可证密钥
warp-cli.exe set-license YOUR_LICENSE_KEY
```

### 3. **WARP Proxy**（代理模式）
- 仅代理部分应用
- 适合需要混合使用的场景

```powershell
warp-cli.exe set-mode warp-proxy
```

---

## 故障排除

### ❌ 问题：无法连接

**解决方法：**
1. 检查防火墙设置
   ```powershell
   # 允许 WARP 通过防火墙
   New-NetFirewallRule -DisplayName "Cloudflare WARP" -Direction Inbound -Program "$env:ProgramFiles\Cloudflare\Cloudflare WARP\Cloudflare WARP.exe" -Action Allow
   ```

2. 检查服务是否运行
   ```powershell
   Get-Service | Where-Object { $_.DisplayName -like "*Cloudflare*" }
   ```

3. 重启 WARP
   ```powershell
   warp-cli.exe restart
   ```

### ❌ 问题：连接缓慢

**解决方法：**
1. 切换到 WARP+ 模式（需要注册）
2. 检查网络连接
3. 尝试断开后重新连接

### ❌ 问题：某些网站无法访问

**解决方法：**
1. 检查 WARP 是否影响了特定网站
   - 暂时断开 WARP，测试网站是否正常

2. 使用 WARP Proxy 模式
   - 仅代理部分应用，不影响其他流量

3. 检查 DNS 设置
   ```powershell
   warp-cli.exe set-dns-mode dot
   ```

### ❌ 问题：命令行找不到 warp-cli.exe

**解决方法：**
```powershell
# 方法1：使用完整路径
& "$env:ProgramFiles\Cloudflare\Cloudflare WARP\warp-cli.exe" status

# 方法2：添加到系统 PATH
$warpPath = "$env:ProgramFiles\Cloudflare\Cloudflare WARP"
$env:Path += ";$warpPath"
```

---

## 🎯 快速开始（推荐步骤）

1. **启动 WARP**
   - 打开开始菜单，搜索并启动 "Cloudflare WARP"
   - 或使用命令行：`warp-cli.exe connect`

2. **检查连接**
   ```powershell
   warp-cli.exe status
   ```
   看到 "Status update: Connected" 表示连接成功

3. **测试连接**
   - 打开浏览器访问 https://www.cloudflare.com/cdn-cgi/trace
   - 查看 "warp" 字段，如果是 "on" 表示正在使用 WARP

4. **查看 IP 地址**
   - 访问 https://www.whatismyipaddress.com
   - 您的 IP 应该显示为 Cloudflare 的 IP 地址

---

## 📝 注意事项

1. **管理员权限**
   - 某些命令需要以管理员身份运行 PowerShell

2. **防火墙**
   - WARP 需要在防火墙中允许才能正常工作

3. **性能影响**
   - WARP 可能会略微影响某些游戏的延迟
   - 如遇到问题，可以随时断开连接

4. **免费 vs WARP+**
   - 免费版已经足够日常使用
   - WARP+ 提供更快的速度和更多服务器

---

## 🔗 相关链接

- [Cloudflare WARP 官网](https://1.1.1.1/)
- [WARP 文档](https://developers.cloudflare.com/warp-client/)
- [获取 WARP+ 许可证](https://warp.plus/)

---

## 💡 小贴士

- ✅ 首次使用时建议先测试，确认不影响常用网站
- ✅ 可以设置开机自启，这样无需手动连接
- ✅ 如果遇到问题，可以先断开 WARP，确认问题是否由 WARP 引起
- ✅ WARP 是免费的，但 WARP+ 需要许可证密钥


