import path from 'path'
import fse from 'fs-extra'

import type { LabwareDefinition2 } from '@opentrons/shared-data'

export interface ConvertPdProtocolResult {
  converted: string
  customLabwareDefs: LabwareDefinition2[]
  didConvert: boolean
}

const CUSTOM_LABWARE_BLOCK_RE =
  /^CUSTOM_LABWARE = json\.loads\("""([\s\S]*?)"""\)$\n?/m
const DESIGNER_APPLICATION_BLOCK_RE =
  /^DESIGNER_APPLICATION = """[\s\S]*?"""$\n?/m
const LOAD_FROM_DEFINITION_RE =
  /(\w+)\.load_(labware|adapter)_from_definition\(\s*CUSTOM_LABWARE\[(["'])([^"'\]]+)\3\]\s*,([\s\S]*?)(\n[ \t]*\))/g

// Rewrites a Protocol Designer python export so custom labware is loaded by
// name (resolved from the app's custom labware folder at analysis/run time)
// instead of from a definition embedded in the file.
export function convertPdProtocolToAppLabware(
  source: string
): ConvertPdProtocolResult {
  const blockMatch = source.match(CUSTOM_LABWARE_BLOCK_RE)
  if (blockMatch == null) {
    return { converted: source, customLabwareDefs: [], didConvert: false }
  }

  const defsByUri: Record<string, LabwareDefinition2> = JSON.parse(
    blockMatch[1]
  )

  let converted = source.replace(
    LOAD_FROM_DEFINITION_RE,
    (match, receiver, kind, _quote, uri, restArgs, closing) => {
      const def = defsByUri[uri]
      // URI format is "<namespace>/<loadName>/<version>"
      const [namespace, loadName, version] = uri.split('/')
      if (def == null || namespace == null || loadName == null) {
        return match
      }
      const argIndent =
        restArgs.match(/\n([ \t]+)/)?.[1] ??
        `${closing.match(/\n([ \t]*)/)?.[1] ?? ''}    `
      const trailingArgs = restArgs.trimEnd()
      return (
        `${receiver}.load_${kind}(` +
        `\n${argIndent}"${loadName}",` +
        `${trailingArgs}` +
        `\n${argIndent}namespace="${namespace}",` +
        `\n${argIndent}version=${Number(version)},` +
        `${closing}`
      )
    }
  )

  converted = converted
    .replace(CUSTOM_LABWARE_BLOCK_RE, '')
    .replace(DESIGNER_APPLICATION_BLOCK_RE, '')

  // drop `import json` if nothing else in the file uses the json module
  const withoutImportLine = converted.replace(/^import json$\n?/m, '')
  if (!/\bjson\./.test(withoutImportLine)) {
    converted = withoutImportLine
  }

  // collapse any triple blank lines left behind by removed blocks
  converted = converted.replace(/\n{3,}$/g, '\n').replace(/\n{4,}/g, '\n\n\n')

  return {
    converted,
    customLabwareDefs: Object.values(defsByUri),
    didConvert: true,
  }
}

const sameIdentity = (
  a: LabwareDefinition2,
  b: LabwareDefinition2
): boolean =>
  a.namespace === b.namespace &&
  a.version === b.version &&
  a.parameters?.loadName === b.parameters?.loadName

// Writes any defs not already present (by namespace/loadName/version) into the
// app's custom labware directory so by-name loads keep resolving. Returns the
// paths of the files written.
export async function installMissingLabwareDefs(
  defs: LabwareDefinition2[],
  labwareDir: string
): Promise<string[]> {
  await fse.ensureDir(labwareDir)
  const fileNames: string[] = await fse.readdir(labwareDir)
  const existing: LabwareDefinition2[] = []
  for (const fileName of fileNames) {
    if (path.extname(fileName).toLowerCase() !== '.json') continue
    try {
      existing.push(await fse.readJson(path.join(labwareDir, fileName)))
    } catch {
      // unparseable files cannot collide by identity; skip them
    }
  }

  const written: string[] = []
  for (const def of defs) {
    if (existing.some(e => sameIdentity(e, def))) continue
    const base = `${def.parameters?.loadName ?? 'custom_labware'}_v${def.version}`
    let destPath = path.join(labwareDir, `${base}.json`)
    let suffix = 1
    while (await fse.pathExists(destPath)) {
      destPath = path.join(labwareDir, `${base}_${suffix}.json`)
      suffix += 1
    }
    await fse.writeJson(destPath, def, { spaces: 2 })
    written.push(destPath)
  }
  return written
}
