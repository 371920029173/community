# 文件分享平台

一个基于 Next.js 和 Supabase 构建的现代化资源分享与社区交流平台，具有文件管理、论坛系统、私信系统、沙币货币系统和管理后台等功能。

## ✨ 功能特性

### 🔐 用户系统
- 用户注册/登录
- 个人资料管理
- 角色权限控制（用户/管理员/超级管理员）
- 存储配额管理

### 📁 文件管理
- 文件上传/下载
- 文件预览（图片、视频、音频）
- 文件分享（公开/私有）
- 批量操作
- 文件搜索

### 💬 私信系统
- 实时消息发送
- 文件传输
- 会话管理
- 用户搜索

### 🎨 界面设计
- 响应式设计
- 现代化UI组件
- 动态粒子背景效果
- 鼠标交互特效
- 渐变色彩主题

### 🛡️ 管理功能
- 用户管理
- 存储配额管理
- 公告发布
- 系统配置
- 权限审核

## 🚀 技术栈

- **前端**: Next.js 14, React, TypeScript
- **样式**: Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **存储**: Supabase Storage
- **认证**: Supabase Auth
- **部署**: Vercel

## 📦 安装和运行

### 环境要求
- Node.js 18+
- npm 或 yarn

### 本地开发

1. **克隆仓库**
```bash
git clone https://github.com/你的用户名/仓库名.git
cd 仓库名
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
复制 `env.example` 为 `.env.local` 并填入你的配置：
```bash
cp env.example .env.local
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **访问应用**
打开 [http://localhost:3000](http://localhost:3000)

### 环境变量配置

在 `.env.local` 中配置以下变量：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的Supabase服务角色密钥

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 安全配置
JWT_SECRET=你的JWT密钥
ENCRYPTION_KEY=你的加密密钥
SESSION_SECRET=你的会话密钥
CSRF_SECRET=你的CSRF密钥
```

## 🗄️ 数据库设置

### 1. 创建 Supabase 项目
- 访问 [supabase.com](https://supabase.com)
- 创建新项目
- 获取项目URL和API密钥

### 2. 运行数据库脚本
在 Supabase SQL Editor 中按顺序运行以下脚本：

1. `create-files-table.sql` - 创建文件表
2. `create-messages-tables.sql` - 创建消息相关表
3. `create-storage-approval-simple.sql` - 创建存储审批表
4. `create-admin-user.sql` - 创建管理员用户

### 3. 配置存储桶
- 在 Supabase Storage 中创建 `files` 存储桶
- 设置适当的权限策略

## 🚀 部署到 Vercel

### 1. 准备部署
确保你的代码已推送到 GitHub 仓库。

### 2. 连接 Vercel
- 访问 [vercel.com](https://vercel.com)
- 导入你的 GitHub 仓库
- 配置环境变量（参考上面的环境变量配置）

### 3. 部署设置
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 4. 部署
点击 "Deploy" 按钮，等待部署完成。

## 📱 使用指南

### 用户功能
1. **注册/登录**: 使用用户名和密码创建账户
2. **文件上传**: 支持多种文件格式，最大30GB存储空间
3. **文件管理**: 查看、下载、删除你的文件
4. **私信**: 与其他用户发送消息和文件

### 管理员功能
1. **用户管理**: 查看所有用户，修改用户角色
2. **存储管理**: 调整用户存储配额
3. **公告管理**: 发布系统公告
4. **系统配置**: 查看和修改系统设置

### 超级管理员
- 拥有所有权限
- 可以修改任何用户的存储配额
- 审核其他管理员的存储修改请求

## 🔧 开发指南

### 项目结构
```
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── admin/             # 管理后台页面
│   ├── messages/          # 私信页面
│   └── ...
├── components/            # React 组件
│   ├── layout/           # 布局组件
│   ├── files/            # 文件相关组件
│   └── ...
├── lib/                  # 工具库
│   ├── supabase.ts       # Supabase 客户端
│   └── ...
└── public/               # 静态资源
```

### 代码规范
- 使用 TypeScript
- 遵循 ESLint 规则
- 组件使用函数式组件和 Hooks
- API 路由使用 Next.js API Routes

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果你遇到问题或有建议，请：

1. 查看 [Issues](https://github.com/你的用户名/仓库名/issues)
2. 创建新的 Issue
3. 联系维护者

## 🙏 致谢

感谢以下开源项目：
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
- 支持最大 3GB 文件上传
- 文件类型验证
- 存储配额管理
- 批量操作（删除、重命名）

### 私信系统

- 实时对话
- 用户搜索
- 消息历史
- 类似 luogu.com 的界面设计

### 权限系统

- 普通用户：基本文件管理
- 审核员：文件审核、公告管理
- 管理员：完全控制权限

## 开发指南

### 添加新功能

1. 在 `app/api/` 下创建新的 API 端点
2. 在 `app/` 下创建对应的页面
3. 更新数据库模式（如需要）
4. 添加相应的类型定义

### 数据库修改

1. 修改 `database-setup.sql`
2. 在 Supabase 中运行修改的 SQL
3. 更新相关的 TypeScript 接口

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License 