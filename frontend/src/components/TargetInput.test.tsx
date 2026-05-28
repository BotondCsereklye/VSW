import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { TargetInput } from './TargetInput'


test('TargetInput submits a trimmed target value and shows the authorization warning', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()

  render(<TargetInput isSubmitting={false} onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText(/target/i), '  Example.com  ')
  await user.click(screen.getByRole('button', { name: /start safe scan/i }))

  expect(onSubmit).toHaveBeenCalledWith('Example.com')
  expect(
    screen.getByText(/only scan systems you own or are authorized to assess/i),
  ).toBeInTheDocument()
})


test('TargetInput disables submit while a scan is being created', () => {
  render(<TargetInput isSubmitting onSubmit={vi.fn()} />)

  expect(screen.getByRole('button', { name: /creating scan/i })).toBeDisabled()
})
