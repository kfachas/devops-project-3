function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '';
  }
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, src }: { name: string; src?: string }) {
  return (
    <span className="ds-avatar">
      {src ? (
        <img className="ds-avatar__img" src={src} alt={name} />
      ) : (
        <span className="ds-avatar__initials">{initials(name)}</span>
      )}
      {name && <span className="ds-avatar__name">{name}</span>}
    </span>
  );
}
