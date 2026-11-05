import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SandboxBanner, SANDBOX_BANNER_TEXT } from '../src/SandboxBanner';

describe('SandboxBanner', () => {
  it('renders the warning when the flag is "true"', () => {
    render(<SandboxBanner enabled="true" />);
    expect(screen.getByRole('status')).toHaveTextContent(SANDBOX_BANNER_TEXT);
  });

  it.each([undefined, '', 'false', 'TRUE', '1'])('renders nothing for %j', (v) => {
    const { container } = render(<SandboxBanner enabled={v} />);
    expect(container).toBeEmptyDOMElement();
  });
});
