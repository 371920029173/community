#!/bin/bash

# 文件分享平台 - 部署准备脚本
# 此脚本将准备项目用于GitHub和Vercel部署

echo "🚀 开始准备项目部署..."

# 检查Node.js版本
echo "📋 检查环境..."
node_version=$(node -v)
echo "Node.js 版本: $node_version"

# 清理构建文件
echo "🧹 清理构建文件..."
rm -rf .next
rm -rf out
rm -rf dist

# 安装依赖
echo "📦 安装依赖..."
npm install

# 运行构建测试
echo "🔨 测试构建..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
else
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

# 检查关键文件
echo "📁 检查关键文件..."
required_files=(
    "package.json"
    "next.config.js"
    "tailwind.config.js"
    "tsconfig.json"
    "vercel.json"
    ".gitignore"
    "README.md"
    "LICENSE"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
    fi
done

# 检查环境变量示例
if [ -f "env.example" ]; then
    echo "✅ env.example 存在"
else
    echo "❌ env.example 缺失"
fi

echo ""
echo "🎉 项目准备完成！"
echo ""
echo "📋 下一步操作："
echo "1. 将代码推送到GitHub仓库"
echo "2. 在Vercel中导入项目"
echo "3. 配置环境变量"
echo "4. 部署应用"
echo ""
echo "📖 详细部署指南请查看: VERCEL_DEPLOYMENT_GUIDE.md"

