import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Segmented } from './Segmented';

const SEGMENTS = [
  { value: 'tous', label: 'Tous' },
  { value: 'actifs', label: 'Actifs' },
  { value: 'expire', label: 'Expiré' },
];

describe('Segmented', () => {
  it('marque l’actif et expose first/last (fidélité maquette)', () => {
    render(<Segmented segments={SEGMENTS} value="actifs" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[1].className).toContain('ds-seg__btn--active');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].className).toContain('ds-seg__btn--first');
    expect(tabs[2].className).toContain('ds-seg__btn--last');
  });

  it('émet la valeur au clic', () => {
    const onChange = vi.fn();
    render(<Segmented segments={SEGMENTS} value="tous" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Expiré' }));
    expect(onChange).toHaveBeenCalledWith('expire');
  });
});
