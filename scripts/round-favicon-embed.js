/**
 * 生成带圆角裁剪的自包含 SVG favicon（内嵌 base64 图片）
 */
const fs = require('fs')
const path = require('path')

const faviconPath = path.join(__dirname, '..', 'public', 'favicon.png')
const outPath = path.join(__dirname, '..', 'public', 'favicon-rounded.svg')

const buf = fs.readFileSync(faviconPath)
const base64 = buf.toString('base64')
const rx = 85
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">
<defs><clipPath id="r"><rect width="512" height="512" rx="${rx}" ry="${rx}"/></clipPath></defs>
<image href="data:image/png;base64,${base64}" width="512" height="512" clip-path="url(#r)"/>
</svg>`

fs.writeFileSync(outPath, svg)
console.log('favicon-rounded.svg 已生成')
