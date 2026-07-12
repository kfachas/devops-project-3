import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Header } from '../ui';
import { useAuth } from './auth';

export function SiteHeader() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <Header>
      {isLoggedIn ? (
        <>
          <Avatar name={user!.email} />
          <Button variant="dark" size="sm" onClick={() => navigate('/mon-espace')}>
            Mon espace
          </Button>
          <Button variant="ghost" size="sm" icon="logout" aria-label="Déconnexion" onClick={onLogout}>
            <span className="ds-header__logout-label">Déconnexion</span>
          </Button>
        </>
      ) : (
        <Button variant="dark" size="sm" onClick={() => navigate('/connexion')}>
          Se connecter
        </Button>
      )}
    </Header>
  );
}
