import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

// Parity tripwire between this app-integrated copy of the protocol
// visualization and the shared @opentrons/protocol-visualization package.
// The two trees deliberately diverge in app-coupled components
// (VisualizerContainer, Controls, DeckView, WellTooltip), but the files
// checked here are byte-identical today. When an upstream sync changes the
// package side of a pair, this test fails to flag that the fix must be
// reviewed and ported into the app copy (or the pair moved to the
// exclusion list with a reason).

const APP_ROOT = path.resolve(__dirname, '..')
const PKG_ROOT = path.resolve(
  __dirname,
  '../../../../../../protocol-visualization/src'
)

// utils that intentionally differ (import paths only)
const UTILS_EXCLUDED = new Set([
  'getNextGroupFirstCommandId.ts',
  'getPreviousGroupFirstCommandId.ts',
])

const EXPLICIT_PAIRS: Array<[string, string]> = [
  [
    'SecondWindow/LabwareSlot/labwareslot.module.css',
    'organisms/SlotSpotlight/LabwareSlot/labwareslot.module.css',
  ],
  [
    'SecondWindow/TipPickupSlot/tippickupslot.module.css',
    'organisms/SlotSpotlight/TipPickupSlot/tippickupslot.module.css',
  ],
  [
    'SecondWindow/TipDisposalSlot/tipdisposalslot.module.css',
    'organisms/SlotSpotlight/TipDisposalSlot/tipdisposalslot.module.css',
  ],
  [
    '../ProtocolDetails/AnnotatedSteps/utils.ts',
    'organisms/AnnotatedSteps/utils.ts',
  ],
  [
    '../ProtocolDetails/AnnotatedSteps/annotatedsteps.module.css',
    'organisms/AnnotatedSteps/annotatedsteps.module.css',
  ],
]

describe('protocol-visualization package parity', () => {
  it('keeps shared utils identical to the package', () => {
    const appUtilsDir = path.join(APP_ROOT, 'utils')
    const pkgUtilsDir = path.join(PKG_ROOT, 'organisms', 'utils')
    const appFiles = fs
      .readdirSync(appUtilsDir)
      .filter(f => f.endsWith('.ts') && !UTILS_EXCLUDED.has(f))
    const shared = appFiles.filter(f =>
      fs.existsSync(path.join(pkgUtilsDir, f))
    )
    // guard against the test passing vacuously
    expect(shared.length).toBeGreaterThanOrEqual(20)

    const diverged = shared.filter(
      f =>
        fs.readFileSync(path.join(appUtilsDir, f), 'utf8') !==
        fs.readFileSync(path.join(pkgUtilsDir, f), 'utf8')
    )
    expect(
      diverged,
      `Files diverged from @opentrons/protocol-visualization — review the upstream change and port it: ${diverged.join(', ')}`
    ).toEqual([])
  })

  it('keeps explicitly paired files identical to the package', () => {
    const diverged = EXPLICIT_PAIRS.filter(
      ([appRel, pkgRel]) =>
        fs.readFileSync(path.join(APP_ROOT, appRel), 'utf8') !==
        fs.readFileSync(path.join(PKG_ROOT, pkgRel), 'utf8')
    ).map(([appRel]) => appRel)
    expect(
      diverged,
      `Files diverged from @opentrons/protocol-visualization — review the upstream change and port it: ${diverged.join(', ')}`
    ).toEqual([])
  })
})
