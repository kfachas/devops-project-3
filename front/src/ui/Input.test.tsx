import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('affiche le label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('affiche l’erreur et la classe invalid', () => {
    render(<Input label="Email" error="Ce champ est requis" />);
    expect(screen.getByText('Ce champ est requis')).toBeInTheDocument();
    expect(screen.getByRole('textbox').className).toContain('ds-input--invalid');
  });

  it('propage la saisie via onValueChange', () => {
    const onValueChange = vi.fn();
    render(<Input label="Email" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a@b.fr' } });
    expect(onValueChange).toHaveBeenCalledWith('a@b.fr');
  });
});
