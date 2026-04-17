/**
 * .env 파일에서 Electron 메인 프로세스용 설정 파일 생성
 * 빌드 전 실행: node scripts/gen-electron-env.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '../.env')
const outPath = join(__dirname, '../electron/env.generated.cjs')

if (!existsSync(envPath)) {
  console.error('❌ .env 파일이 없습니다.')
  process.exit(1)
}

// .env 파싱
const lines = readFileSync(envPath, 'utf8').split('\n')
const env = {}
for (const line of lines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx < 0) continue
  const key = trimmed.slice(0, idx).trim()
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  env[key] = val
}

const url = env.VITE_SUPABASE_URL || ''
const key = env.VITE_SUPABASE_ANON_KEY || ''

if (!url || !key) {
  console.warn('⚠️  VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 없음 → 백그라운드 알림 비활성화됩니다.')
}

const content = `'use strict'
// 자동 생성 파일 - 수동으로 편집하지 마세요 (scripts/gen-electron-env.mjs 에서 생성)
module.exports = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(key)},
}
`

writeFileSync(outPath, content)
console.log(`✓ electron/env.generated.cjs 생성 완료`)
