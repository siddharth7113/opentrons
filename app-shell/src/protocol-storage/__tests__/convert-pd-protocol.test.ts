import path from 'path'
import fs from 'fs-extra'
import tempy from 'tempy'
import { describe, expect, it } from 'vitest'

import {
  convertPdProtocolToAppLabware,
  installMissingLabwareDefs,
} from '../convert-pd-protocol'

const CUSTOM_DEF = {
  namespace: 'custom_beta',
  version: 1,
  parameters: { loadName: 'linxens_halter_v5' },
  metadata: { displayName: 'Linxens Halter v5' },
}

const PD_PROTOCOL = `import json
from opentrons import protocol_api, types

metadata = {
    "protocolName": "Demo",
}

requirements = {"robotType": "Flex", "apiLevel": "2.23"}

def run(protocol: protocol_api.ProtocolContext) -> None:
    # Load Labware:
    well_plate_1 = protocol.load_labware_from_definition(
        CUSTOM_LABWARE["custom_beta/linxens_halter_v5/1"],
        location="C2",
        label="Linxens Halter",
    )
    tip_rack_1 = protocol.load_labware(
        "opentrons_flex_96_tiprack_200ul",
        location="D1",
        namespace="opentrons",
        version=1,
    )

CUSTOM_LABWARE = json.loads("""${JSON.stringify({
  'custom_beta/linxens_halter_v5/1': CUSTOM_DEF,
})}""")

DESIGNER_APPLICATION = """{"name": "opentrons/protocol-designer", "version": "9.0.1", "data": {}}"""
`

describe('convertPdProtocolToAppLabware', () => {
  it('rewrites load_labware_from_definition to a by-name load_labware call', () => {
    const result = convertPdProtocolToAppLabware(PD_PROTOCOL)
    expect(result.didConvert).toBe(true)
    expect(result.converted).toContain(
      `well_plate_1 = protocol.load_labware(
        "linxens_halter_v5",
        location="C2",
        label="Linxens Halter",
        namespace="custom_beta",
        version=1,
    )`
    )
    expect(result.converted).not.toContain('load_labware_from_definition')
  })

  it('removes the CUSTOM_LABWARE and DESIGNER_APPLICATION blocks', () => {
    const result = convertPdProtocolToAppLabware(PD_PROTOCOL)
    expect(result.converted).not.toContain('CUSTOM_LABWARE')
    expect(result.converted).not.toContain('DESIGNER_APPLICATION')
  })

  it('removes import json when json is no longer used', () => {
    const result = convertPdProtocolToAppLabware(PD_PROTOCOL)
    expect(result.converted).not.toContain('import json')
    expect(result.converted).toContain('from opentrons import protocol_api')
  })

  it('keeps import json when the protocol body still uses json elsewhere', () => {
    const withJsonUse = PD_PROTOCOL.replace(
      '# Load Labware:',
      '# Load Labware:\n    x = json.dumps({})'
    )
    const result = convertPdProtocolToAppLabware(withJsonUse)
    expect(result.converted).toContain('import json')
  })

  it('returns the embedded custom labware definitions', () => {
    const result = convertPdProtocolToAppLabware(PD_PROTOCOL)
    expect(result.customLabwareDefs).toEqual([CUSTOM_DEF])
  })

  it('converts load_adapter_from_definition calls too', () => {
    const withAdapter = PD_PROTOCOL.replace(
      '    tip_rack_1 = protocol.load_labware(',
      `    adapter_1 = protocol.load_adapter_from_definition(
        CUSTOM_LABWARE["custom_beta/linxens_halter_v5/1"],
        location="D3",
    )
    tip_rack_1 = protocol.load_labware(`
    )
    const result = convertPdProtocolToAppLabware(withAdapter)
    expect(result.converted).toContain(
      `adapter_1 = protocol.load_adapter(
        "linxens_halter_v5",
        location="D3",
        namespace="custom_beta",
        version=1,
    )`
    )
  })

  it('leaves protocols without embedded labware untouched', () => {
    const plain = 'from opentrons import protocol_api\n\ndef run(ctx): pass\n'
    const result = convertPdProtocolToAppLabware(plain)
    expect(result.didConvert).toBe(false)
    expect(result.converted).toBe(plain)
    expect(result.customLabwareDefs).toEqual([])
  })
})

describe('installMissingLabwareDefs', () => {
  it('writes defs that are not yet in the labware directory', async () => {
    const labwareDir = tempy.directory()
    const written = await installMissingLabwareDefs(
      [CUSTOM_DEF as any],
      labwareDir
    )
    expect(written).toHaveLength(1)
    const onDisk = await fs.readJson(written[0])
    expect(onDisk).toEqual(CUSTOM_DEF)
    await fs.rm(labwareDir, { recursive: true, force: true })
  })

  it('skips defs whose namespace/loadName/version already exist', async () => {
    const labwareDir = tempy.directory()
    await fs.writeJson(path.join(labwareDir, 'existing.json'), CUSTOM_DEF)
    const written = await installMissingLabwareDefs(
      [CUSTOM_DEF as any],
      labwareDir
    )
    expect(written).toHaveLength(0)
    await fs.rm(labwareDir, { recursive: true, force: true })
  })
})
