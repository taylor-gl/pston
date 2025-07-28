import { getCurrentUser, hasPermission } from './auth';
import type { PublicProfile } from '$lib/types';

export interface UserLinkInfo {
  isClickable: boolean;
  href: string;
  displayName: string;
}

/**
 * Determines if a username should be clickable and what URL it should link to
 */
export async function getUserLinkInfo(creatorProfile: PublicProfile | null): Promise<UserLinkInfo> {
  const displayName = creatorProfile?.username || 'Anonymous User';

  // Default to not clickable
  const result: UserLinkInfo = {
    isClickable: false,
    href: '',
    displayName,
  };

  if (!creatorProfile) {
    return result;
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return result;
  }

  // Check if this is the current user's own content
  if (creatorProfile.id === currentUser.id) {
    result.isClickable = true;
    result.href = '/account';
    return result;
  }

  // Check if current user has permission to view other accounts
  const canViewPrivateProfiles = await hasPermission('can_view_private_profiles');
  if (canViewPrivateProfiles) {
    result.isClickable = true;
    result.href = `/account/${creatorProfile.id}`;
    return result;
  }

  return result;
}

/**
 * Helper function to format display names consistently
 */
export function formatDisplayName(profile: PublicProfile | null): string {
  return profile?.username || 'Anonymous User';
}

/**
 * Helper function to format dates consistently
 */
export function formatSubmissionDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
