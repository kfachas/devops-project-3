import { afterEach } from 'vitest';
import { apiInstance } from './api-client';

function runRequestInterceptor(headers: Record<string, string> = {}) {
  const handler = (apiInstance.interceptors.request as any).handlers[0].fulfilled;
  return handler({ headers });
}

function runResponseRejected(error: unknown) {
  const handlers = (apiInstance.interceptors.response as any).handlers;
  return handlers[handlers.length - 1].rejected(error);
}

describe('api-client (mutateur orval)', () => {
  afterEach(() => localStorage.clear());

  it('ajoute l’en-tête Authorization quand un token est présent', () => {
    localStorage.setItem('datashare_token', 'abc');
    const config = runRequestInterceptor();
    expect(config.headers.Authorization).toBe('Bearer abc');
  });

  it('n’ajoute pas d’en-tête sans token', () => {
    const config = runRequestInterceptor();
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('purge la session sur 401 quand un token est présent', async () => {
    localStorage.setItem('datashare_token', 'x');
    localStorage.setItem('datashare_user', '{}');
    await expect(runResponseRejected({ response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem('datashare_token')).toBeNull();
    expect(localStorage.getItem('datashare_user')).toBeNull();
  });

  it('laisse passer un 401 sans token (erreur de connexion affichée par la page)', async () => {
    await expect(runResponseRejected({ response: { status: 401 } })).rejects.toBeTruthy();
  });
});
