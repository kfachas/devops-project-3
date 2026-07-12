import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach } from 'vitest';
import type { AuthResponseDto } from '../api/models';
import { AuthProvider, useAuth } from './auth';

const AUTH: AuthResponseDto = {
  accessToken: 'jwt-token',
  user: { id: '1', email: 'a@b.fr', createdAt: '2026-01-01T00:00:00.000Z' },
};

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider', () => {
  afterEach(() => localStorage.clear());

  it('démarre déconnecté', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('setSession persiste le token + l’utilisateur et connecte (US03)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.setSession(AUTH));
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('a@b.fr');
    expect(localStorage.getItem('datashare_token')).toBe('jwt-token');
  });

  it('logout efface la session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.setSession(AUTH));
    act(() => result.current.logout());
    expect(result.current.isLoggedIn).toBe(false);
    expect(localStorage.getItem('datashare_token')).toBeNull();
  });

  it('réhydrate la session depuis localStorage au démarrage', () => {
    localStorage.setItem('datashare_user', JSON.stringify(AUTH.user));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('a@b.fr');
  });
});
