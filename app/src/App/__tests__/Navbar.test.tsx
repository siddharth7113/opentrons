import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { protocolDesignerOpenAction } from '/app/redux/shell'

import { Navbar } from '../Navbar'

import type { RouteProps } from '../types'

const ROUTE_PROPS: RouteProps[] = [
  { name: 'foo', navLinkTo: '/foo', path: '/foo', Component: () => null },
  { name: 'bar', navLinkTo: '/bar', path: '/bar', Component: () => null },
  { name: 'baz', navLinkTo: '/baz', path: '/baz', Component: () => null },
]

describe('Navbar', () => {
  it('should render a NavbarLink for every nav location', () => {
    renderWithProviders(
      <MemoryRouter>
        <Navbar routes={ROUTE_PROPS} />
      </MemoryRouter>,
      { i18nInstance: i18n }
    )
    screen.getByRole('link', { name: 'foo' })
    screen.getByRole('link', { name: 'bar' })
    screen.getByRole('link', { name: 'baz' })
  })

  it('should render a Designer entry that opens Protocol Designer', () => {
    const [, store] = renderWithProviders(
      <MemoryRouter>
        <Navbar routes={ROUTE_PROPS} />
      </MemoryRouter>,
      { i18nInstance: i18n }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Designer' }))
    expect(store.dispatch).toHaveBeenCalledWith(protocolDesignerOpenAction())
  })

  it('should render logo, settings, and help', () => {
    renderWithProviders(
      <MemoryRouter>
        <Navbar routes={ROUTE_PROPS} />
      </MemoryRouter>,
      { i18nInstance: i18n }
    )

    screen.getByRole('img', { name: 'opentrons logo' })

    screen.getByRole('button', { name: 'App Settings' })
    screen.getByRole('link', { name: 'Help' })

    screen.getByLabelText('Settings icon')
    screen.getByLabelText('Help icon')
  })
})
