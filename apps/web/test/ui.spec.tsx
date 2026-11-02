import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MetricCell } from '@ea/contracts';
import { Busy, Cell, cellUsers, ErrorBox, fmt, Notice } from '../src/ui';

describe('Cell', () => {
  it('renders a thousands-formatted event count for a visible cell', () => {
    const cell: MetricCell = { suppressed: false, events: 12345, uniqueUsers: 40 };
    render(<Cell cell={cell} />);
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('renders the suppression marker (—) for a suppressed cell', () => {
    const { container } = render(<Cell cell={{ suppressed: true }} />);
    expect(container.querySelector('.supp')).not.toBeNull();
    expect(container.textContent).toContain('\u2014'); // em dash
  });

  it('gives the suppressed marker an explanatory title', () => {
    const { container } = render(<Cell cell={{ suppressed: true }} />);
    expect(container.querySelector('.supp')?.getAttribute('title')).toMatch(/fewer than 5/i);
  });
});

describe('cellUsers', () => {
  it('formats unique users for a visible cell', () => {
    expect(cellUsers({ suppressed: false, events: 10, uniqueUsers: 1234 })).toBe('1,234');
  });

  it('returns the dash for a suppressed cell', () => {
    expect(cellUsers({ suppressed: true })).toBe('\u2014');
  });
});

describe('fmt', () => {
  it('formats numbers with grouping', () => {
    expect(fmt(1000000)).toBe('1,000,000');
    expect(fmt(0)).toBe('0');
  });
});

describe('Busy', () => {
  it('renders an accessible busy status with a default label', () => {
    render(<Busy />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading');
  });

  it('renders a custom label', () => {
    render(<Busy label="Loading session" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading session');
  });
});

describe('Notice', () => {
  it('renders its children with the kind class', () => {
    const { container } = render(<Notice kind="success">Saved</Notice>);
    expect(container.querySelector('.notice.success')).not.toBeNull();
    expect(container.textContent).toContain('Saved');
  });
});

describe('ErrorBox', () => {
  it('renders an alert with the given text', () => {
    render(<ErrorBox text="Could not load" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
  });

  it('shows a Retry button that invokes the callback when provided', () => {
    let retried = false;
    render(<ErrorBox text="Failed" onRetry={() => { retried = true; }} />);
    screen.getByRole('button', { name: /retry/i }).click();
    expect(retried).toBe(true);
  });

  it('omits the Retry button when no callback is provided', () => {
    render(<ErrorBox text="Failed" />);
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });
});
