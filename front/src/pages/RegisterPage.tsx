import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { USER_PASSWORD_MIN_LENGTH } from '@datashare/shared';
import { useAuthControllerRegister } from '../api/auth';
import { useAuth } from '../core/auth';
import { Shell } from '../core/Shell';
import { Button, Callout, Card, Input } from '../ui';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function RegisterPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const register = useAuthControllerRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
  const confirmError = !confirm ? 'Ce champ est requis' : '';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError('');
    if (emailError || passwordError || confirmError) {
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    register.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          setSession(res);
          navigate('/mon-espace');
        },
        onError: (err: unknown) => {
          const status = (err as { response?: { status?: number } })?.response?.status;
          setError(
            status === 409
              ? 'Cet email est déjà utilisé'
              : status === 429
                ? 'Trop de tentatives. Réessayez dans quelques instants.'
                : 'Inscription impossible. Réessayez plus tard.',
          );
        },
      },
    );
  };

  return (
    <Shell>
      <Card heading="Créer un compte" className="ds-card-narrow">
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
          <Input
            label="Vérification du mot de passe"
            type="password"
            placeholder="Saisissez le à nouveau…"
            value={confirm}
            onValueChange={setConfirm}
            error={submitted ? confirmError : undefined}
          />
          <Link className="ds-link" to="/connexion">
            J'ai déjà un compte
          </Link>
          <Button type="submit" variant="light" block disabled={register.isPending}>
            Créer mon compte
          </Button>
        </form>
      </Card>
    </Shell>
  );
}
