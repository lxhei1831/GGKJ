const assert = require('assert')
const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')
const MAIN_PACKAGE_LIMIT_BYTES = 1.5 * 1024 * 1024
const REQUIRED_IGNORED_FOLDERS = [
  '.codex',
  '.worktrees',
  'cloudfunctions',
  'docs',
  'tests',
  'tmp',
]

function readProjectConfig() {
  return JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'project.config.json'), 'utf8'))
}

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/$/, '')
}

function getIgnoredFolderValues(config) {
  return new Set(
    ((config.packOptions && config.packOptions.ignore) || [])
      .filter((item) => item && item.type === 'folder')
      .map((item) => normalizeSlash(item.value))
      .filter(Boolean)
  )
}

function isIgnoredByPackOptions(relativePath, ignoredFolders) {
  const normalized = normalizeSlash(relativePath)
  return Array.from(ignoredFolders).some((folder) => normalized === folder || normalized.startsWith(`${folder}/`))
}

function getEstimatedMainPackageBytes(directory, ignoredFolders, relativeBase) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  return entries.reduce((total, entry) => {
    if (entry.name === '.git') return total

    const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name
    if (isIgnoredByPackOptions(relativePath, ignoredFolders)) return total

    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return total + getEstimatedMainPackageBytes(fullPath, ignoredFolders, relativePath)
    if (entry.isFile()) return total + fs.statSync(fullPath).size
    return total
  }, 0)
}

const config = readProjectConfig()
const ignoredFolders = getIgnoredFolderValues(config)

REQUIRED_IGNORED_FOLDERS.forEach((folder) => {
  assert(
    ignoredFolders.has(folder),
    `project.config.json packOptions.ignore should exclude development/cloud folder: ${folder}`
  )
})

const estimatedMainPackageBytes = getEstimatedMainPackageBytes(PROJECT_ROOT, ignoredFolders, '')
assert(
  estimatedMainPackageBytes < MAIN_PACKAGE_LIMIT_BYTES,
  `estimated main package should stay below 1.5MB, got ${(estimatedMainPackageBytes / 1024).toFixed(1)}KB`
)
