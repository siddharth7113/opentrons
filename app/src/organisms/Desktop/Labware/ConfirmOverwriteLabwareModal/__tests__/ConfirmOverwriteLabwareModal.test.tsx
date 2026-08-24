import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockDuplicateLabware } from '/app/redux/custom-labware/__fixtures__'

import { ConfirmOverwriteLabwareModal } from '..'

const mockOnCancel = vi.fn()
const mockOnConfirmOverwrite = vi.fn()

const render = () => {
  return renderWithProviders(
    <ConfirmOverwriteLabwareModal
      duplicateFile={mockDuplicateLabware}
      onCancel={mockOnCancel}
      onConfirmOverwrite={mockOnConfirmOverwrite}
    />,
    { i18nInstance: i18n }
  )
}

describe('ConfirmOverwriteLabwareModal', () => {
  it('renders title, body with filename, and buttons', () => {
    render()
    screen.getByText('Labware definition already exists')
    screen.getByText(
      'Importing d.json will replace the existing custom labware definition with the same API name and version. Reanalyze affected protocols to pick up the updated definition.'
    )
    screen.getByRole('button', { name: 'Cancel' })
    screen.getByRole('button', { name: 'Replace definition' })
  })

  it('calls onConfirmOverwrite when clicking Replace definition', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Replace definition' }))
    expect(mockOnConfirmOverwrite).toHaveBeenCalled()
  })

  it('calls onCancel when clicking Cancel', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockOnCancel).toHaveBeenCalled()
  })
})
