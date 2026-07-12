import { render, screen } from '@testing-library/react';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('calcule les initiales prénom + nom', () => {
    render(<Avatar name="Claire Marie" />);
    expect(screen.getByText('CM')).toBeInTheDocument();
    expect(screen.getByText('Claire Marie')).toBeInTheDocument();
  });

  it('gère un nom simple', () => {
    render(<Avatar name="claire@datashare.app" />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
