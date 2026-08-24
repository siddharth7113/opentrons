import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NewIconButton, TimelineScrubber } from '@opentrons/components'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'

import { Controls } from '../'

import type { ComponentProps } from 'react'

vi.mock('@opentrons/components', async () => {
  const actual = await vi.importActual('@opentrons/components')
  return {
    ...actual,
    NewIconButton: vi.fn(),
    TimelineScrubber: vi.fn(),
  }
})

const render = (props: ComponentProps<typeof Controls>) => {
  return renderWithProviders(<Controls {...props} />, {
    i18nInstance: i18n,
  })
}

describe('Controls', () => {
  let props: ComponentProps<typeof Controls>

  beforeEach(() => {
    props = {
      numErrors: 0,
      protocolName: 'Test Protocol',
      numCommandLength: 10,
      currentCommandIndex: 1,
      setSelectedCommand: vi.fn(),
      handlePlayPause: vi.fn(),
      isPlaying: false,
      commands: [],
      groupedCommands: null,
      milliSecondsPerFrame: 1000,
      setMilliSecondsPerFrame: vi.fn(),
      showStepDetails: true,
      onClickStepDetails: vi.fn(),
    }
    vi.mocked(NewIconButton).mockReturnValue(<div>mock NewIconButton</div>)
    vi.mocked(TimelineScrubber).mockReturnValue(
      <div>mock TimelineScrubber</div>
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should render text elements', () => {
    render(props)
    screen.getByText('Test Protocol')
    screen.getByText('No errors')
    screen.getByText('1 s per step')
  })

  it('should render error chip', () => {
    props = {
      ...props,
      numErrors: 1,
    }
    render(props)
    screen.getByText('1 error')
  })

  it('should render mock components(chip, buttons, scrubber)', () => {
    render(props)
    screen.getByText('mock NewIconButton')
    screen.getByText('mock TimelineScrubber')
  })

  it('should toggle step details when clicking the step details button', () => {
    render(props)
    fireEvent.click(screen.getByRole('button', { name: 'Step details' }))
    expect(props.onClickStepDetails).toHaveBeenCalledWith(false)
  })

  it('should not trigger play/pause from spacebar while typing in an input', () => {
    render(props)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    fireEvent.keyDown(input, { key: ' ' })
    expect(props.handlePlayPause).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('should trigger play/pause from spacebar outside editable targets', () => {
    render(props)
    fireEvent.keyDown(document.body, { key: ' ' })
    expect(props.handlePlayPause).toHaveBeenCalled()
  })
})
