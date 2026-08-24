import fse from 'fs-extra'
import path from 'path'
import { app, BrowserWindow, shell } from 'electron'

import type { Logger } from 'winston'
import type { SecondaryWindowDetails } from '../types'

interface ProtocolDesignerDetails extends SecondaryWindowDetails {
  type: 'protocol-designer'
}

const PROTOCOL_DESIGNER_FALLBACK_URL = 'https://designer.opentrons.com'

// In a packaged app the PD static build ships in resources/protocol-designer;
// in dev it is the sibling package's vite build output.
export function getBundledProtocolDesignerPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'protocol-designer')
    : path.join(app.getAppPath(), '..', 'protocol-designer', 'dist')
}

export function isBundledProtocolDesignerAvailable(): boolean {
  return fse.pathExistsSync(
    path.join(getBundledProtocolDesignerPath(), 'index.html')
  )
}

interface OpenProtocolDesignerParams {
  log: Logger
}

export function openProtocolDesigner(
  params: OpenProtocolDesignerParams
): ProtocolDesignerDetails | null {
  const { log } = params
  if (!isBundledProtocolDesignerAvailable()) {
    log.info(
      'No bundled Protocol Designer found, opening web version externally'
    )
    void shell.openExternal(PROTOCOL_DESIGNER_FALLBACK_URL)
    return null
  }
  const createUi = (): BrowserWindow => createProtocolDesignerUi(log)
  return { createUi, key: 'protocol-designer', type: 'protocol-designer' }
}

function createProtocolDesignerUi(log: Logger): BrowserWindow {
  const pdWindow = new BrowserWindow({
    show: false,
    useContentSize: true,
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  pdWindow.once('ready-to-show', () => {
    pdWindow.setTitle('Opentrons Protocol Designer')
    pdWindow.show()
  })

  const indexPath = path.join(getBundledProtocolDesignerPath(), 'index.html')
  log.info(`Loading bundled Protocol Designer from ${indexPath}`)
  void pdWindow.loadFile(indexPath)

  pdWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  return pdWindow
}
