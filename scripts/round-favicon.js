/**
 * 为 favicon.png 添加圆角并覆盖原文件
 */
const fs = require('fs')
const path = require('path')

const sharp = require('sharp')

const faviconPath = path.join(__dirname, '..', 'public', 'favicon.png')

;(async () => {
  const size = 512
  const radius = Math.floor(size / 6)
  const svgMask = Buffer.from(
    `<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
  )
  await sharp(faviconPath)
    .resize(size, size)
    .composite([{ input: svgMask, blend: 'dest-in' }])
    .png()
    .toFile(faviconPath)
  console.log('Favicon 圆角已应用')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
