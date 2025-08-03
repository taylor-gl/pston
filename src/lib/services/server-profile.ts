import type { PublicProfile } from '$lib/types';
import type { ServerUserContext } from './server-auth';

export interface ServerUserLinkInfo {
  isClickable: boolean;
  href: string;
  displayName: string;
}

export function getUserLinkInfoServerSide(
  profile: PublicProfile | null,
  currentUserContext: ServerUserContext | null
): ServerUserLinkInfo {
  if (!profile) {
    return {
      isClickable: false,
      href: '',
      displayName: 'Anonymous User',
    };
  }

  const displayName = profile.username || profile.full_name || 'Anonymous User';

  if (currentUserContext && profile.id === currentUserContext.id) {
    return {
      isClickable: true,
      href: '/account',
      displayName,
    };
  }

  if (currentUserContext && currentUserContext.canViewPrivateProfiles) {
    return {
      isClickable: true,
      href: `/account/${profile.id}`,
      displayName,
    };
  }

  return {
    isClickable: false,
    href: '',
    displayName,
  };
}
