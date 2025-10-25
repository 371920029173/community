# Next.js 15 模板变量错误修复记录

## 问题描述
Next.js 15.5.2 出现 `Invariant: Expected to replace all template variables, missing VAR_ORIGINAL_PATHNAME in template` 错误

## 解决方案
**临时降级到 Next.js 14.2.15** 可以解决此问题

### 修复步骤：
1. 修改 `package.json` 中的 Next.js 版本：
   ```json
   "next": "14.2.15"
   ```

2. 重新安装依赖：
   ```bash
   npm install --legacy-peer-deps
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

## 注意事项
- 降级后所有功能正常，包括 Supabase 连接
- 部署时可能需要调整 Cloudflare Pages 配置
- 这是 Next.js 15 的已知问题，等待官方修复

## 替代方案
如果必须使用 Next.js 15，可以尝试：
1. 删除 `app/not-found.tsx` 文件
2. 简化 `next.config.js` 配置
3. 清理 `.next` 缓存目录
