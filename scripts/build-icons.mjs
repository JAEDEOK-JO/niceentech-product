import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const buildDir = join(__dirname, '../build')
mkdirSync(buildDir, { recursive: true })

// ─── SVG 정의 ──────────────────────────────────────────────────────────────

const iconSvg = (size) => `
<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 192 192'>
  <rect width='192' height='192' rx='30' fill='#1e3a5f'/>
  <text x='96' y='128' font-family='Arial Black,Arial' font-weight='900' font-size='112'
    fill='white' text-anchor='middle'>N</text>
</svg>`

// 알림 상태 트레이 아이콘 - 빨간 점 추가
const trayNotifySvg = (size) => `
<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 192 192'>
  <rect width='192' height='192' rx='30' fill='#1e3a5f'/>
  <text x='96' y='128' font-family='Arial Black,Arial' font-weight='900' font-size='112'
    fill='white' text-anchor='middle'>N</text>
  <!-- 빨간 알림 뱃지 -->
  <circle cx='155' cy='37' r='34' fill='#ef4444'/>
  <circle cx='155' cy='37' r='28' fill='#ef4444' stroke='white' stroke-width='6'/>
</svg>`

// 작업표시줄 오버레이 배지 - 빨간 원
const badgeSvg = `
<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'>
  <circle cx='8' cy='8' r='8' fill='#ef4444'/>
</svg>`

// ─── PNG 생성 ──────────────────────────────────────────────────────────────

function renderPng(svg, outputPath) {
  const resvg = new Resvg(svg)
  const pngData = resvg.render().asPng()
  writeFileSync(outputPath, pngData)
  console.log(`✓ ${outputPath}`)
}

renderPng(iconSvg(256),       join(buildDir, 'icon.png'))       // 앱 아이콘 (256x256)
renderPng(iconSvg(32),        join(buildDir, 'tray.png'))        // 기본 트레이 (32x32)
renderPng(trayNotifySvg(32),  join(buildDir, 'tray-notify.png')) // 알림 트레이 (32x32)
renderPng(badgeSvg,           join(buildDir, 'badge.png'))       // 배지 (16x16)

console.log('\n아이콘 생성 완료 → build/')
