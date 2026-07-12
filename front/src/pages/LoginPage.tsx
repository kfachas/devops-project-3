import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { USER_PASSWORD_MIN_LENGTH } from '@datashare/shared';
import { useAuthControllerLogin } from '../api/auth';
import { useAuth } from '../core/auth';
import { Shell } from '../core/Shell';
import { Button, Callout, Card, Input } from '../ui';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function loginErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 429) {
    return 'Trop de tentatives. Réessayez dans quelques instants.';
  }
  if (status === 401) {
    return 'Identifiants invalides';
  }
  return 'Connexion impossible. Réessayez plus tard.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const login = useAuthControllerLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const emailError = !email
    ? 'Ce champ est requis'
    : !EMAIL_RE.test(email)
      ? 'Adresse email invalide'
      : '';
  const passwordError = !password
    ? 'Ce champ est requis'
    : password.length < USER_PASSWORD_MIN_LENGTH
      ? `Minimum ${USER_PASSWORD_MIN_LENGTH} caractères`
      : '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError('');
    if (emailError || passwordError) {
      return;
    }
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          setSession(res);
          navigate('/mon-espace');
        },
        onError: (err: unknown) => setError(loginErrorMessage(err)),
      },
    );
  };

  return (
    <Shell>
      <Card heading="Connexion" className="ds-card-narrow">
        <form className="ds-stack" onSubmit={submit} noValidate>
          {error && <Callout variant="error">{error}</Callout>}
          <Input
            label="Email"
            type="email"
            placeholder="Saisissez votre email…"
            value={email}
            onValueChange={setEmail}
            error={submitted ? emailError : undefined}
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="Saisissez votre mot de passe…"
            value={password}
            onValueChange={setPassword}
            error={submitted ? passwordError : undefined}
          />
          <Link className="ds-link" to="/inscription">
            Créer un compte
          </Link>
          <Button type="submit" variant="light" block disabled={login.isPending}>
            Connexion
          </Button>
        </form>
      </Card>
    </Shell>
  );
}
