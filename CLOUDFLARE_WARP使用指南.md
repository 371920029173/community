# Cloudflare WARP 使用指南

## 📋 当前状态检查

### 检查安装状态
```powershell
where.exe warp-cli
```
如果显示路径，说明已安装。

### 检查运行状态
```powershell
warp-cli status
```
状态说明：
- **Connected** - 已连接
- **Disconnected** - 已断开
- **Connecting** - 连接中

## 🚀 快速开始

### 1. 连接 WARP
```powershell
warp-cli connect
```
等待几秒钟，然后检查状态：
```powershell
warp-cli status
```

### 2. 断开 WARP
```powershell
warp-cli disconnect
```

### 3. 切换模式

#### WARP 模式（默认）
- 加密所有流量
- 访问受限网站
- 隐私保护
```powershell
warp-cli set-mode warp
```

#### WARP+ 模式（需要账号）
- 更好的性能
- 更多地区选择
```powershell
warp-cli set-mode warp+
```

#### DNS 模式
- 仅使用 Cloudflare DNS
- 不加密流量
```powershell
warp-cli set-mode dns
```

### 4. 查看当前 IP
```powershell
curl https://cloudflare.com/cdn-cgi/trace
```
或访问：https://www.whatismyipaddress.com/

## ⚙️ 常用命令

### 查看设置
```powershell
warp-cli settings
```

### 查看账户信息（WARP+）
```powershell
warp-cli account
```

### 查看连接信息
```powershell
warp-cli warp-stats
```

### 注册 WARP+ 账号
```powershell
warp-cli register
```

### 查看帮助
```powershell
warp-cli --help
```

## 🔧 高级配置

### 启用/禁用 DNS
```powershell
# 启用 Cloudflare DNS
warp-cli set-dns 1.1.1.1

# 使用自定义 DNS
warp-cli set-dns 8.8.8.8

# 禁用自定义 DNS（使用系统默认）
warp-cli set-dns disabled
```

### 启用/禁用本地代理
```powershell
# 启用本地代理（默认端口：40000）
warp-cli set-proxy-port 40000

# 禁用本地代理
warp-cli set-proxy-port disabled
```

### 查看路由表
```powershell
warp-cli get-virtual-networks
```

### 添加/删除路由
```powershell
# 添加路由（绕过 WARP）
warp-cli add-excluded-route 192.168.1.0/24

# 删除路由
warp-cli remove-excluded-route 192.168.1.0/24

# 查看所有路由
warp-cli get-excluded-routes
```

## 🎯 使用场景

### 场景 1：访问 Google AdSense
1. 启动 WARP：
   ```powershell
   warp-cli connect
   ```
2. 检查连接：
   ```powershell
   warp-cli status
   ```
3. 访问网站，应该可以正常访问

### 场景 2：提高隐私保护
- 默认使用 WARP 模式
- 所有流量都会加密
- 隐藏真实 IP 地址

### 场景 3：仅改善 DNS 解析
```powershell
warp-cli set-mode dns
warp-cli connect
```
这样只会使用 Cloudflare DNS，不会改变 IP。

## ❓ 常见问题

### Q: 连接后无法访问某些网站？
A: 尝试添加路由排除：
```powershell
warp-cli add-excluded-route 网站IP段
```

### Q: 连接速度慢？
A: 尝试：
1. 切换到 WARP+ 模式（需要账号）
2. 使用 DNS 模式而非 WARP 模式
3. 检查网络连接

### Q: 如何查看当前使用的 IP？
A: 访问：
- https://www.whatismyipaddress.com/
- https://ipinfo.io/

### Q: WARP 和 VPN 有什么区别？
A: 
- WARP 是 Cloudflare 的网络优化服务
- 主要目的是提高隐私和访问受限网站
- 不是传统 VPN，但提供类似功能

## 📝 注意事项

1. **防火墙设置**：某些防火墙可能会阻止 WARP，需要添加例外
2. **本地服务**：WARP 可能影响访问本地网络服务
3. **企业网络**：在企业网络中使用可能需要管理员权限

## 🔗 相关资源

- Cloudflare WARP 官网：https://1.1.1.1/
- WARP+ 注册：https://warp.plus/
- 文档：https://developers.cloudflare.com/warp-client/

