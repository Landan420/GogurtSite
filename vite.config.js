import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

function git(cmd, fallback) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim()
  } catch {
    return fallback
  }
}

function countLinesOfCode() {
  try {
    const files = git('git ls-files', '')
      .split('\n')
      .filter((f) => /\.(jsx?|css)$/.test(f))
    let total = 0
    for (const file of files) {
      if (!fs.existsSync(file)) continue
      total += fs.readFileSync(file, 'utf-8').split('\n').length
    }
    return total
  } catch {
    return 0
  }
}

const firstCommitDate = git('git log --reverse --format=%aI', '').split('\n')[0]
const commitCount = Number(git('git rev-list --count HEAD', '0')) || 0
const linesOfCode = countLinesOfCode()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __SITE_LAUNCH_ISO__: JSON.stringify(firstCommitDate),
    __DEPLOY_COUNT__: JSON.stringify(commitCount),
    __LOC_COUNT__: JSON.stringify(linesOfCode),
  },
})
