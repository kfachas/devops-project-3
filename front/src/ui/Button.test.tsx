import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('applique la variante et la taille', () => {
    render(
      <Button variant="dark" size="sm">
        OK
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'OK' });
    expect(btn.className).toContain('ds-btn--dark');
    expect(btn.className).toContain('ds-btn--sm');
  });

  it('déclenche onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('respecte disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
