<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  import { goto } from '$app/navigation';
  import { getCurrentUser, hasPermission, banUser, getUserBanStatus } from '$lib/services/auth';
  import { supabase } from '$lib/supabase/client';
  import BanButton from '$lib/components/BanButton.svelte';

  let user: User | null = $state(null);
  let targetUser: User | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);
  let canBanUsers = $state(false);
  let userBanned = $state(false);
  let banLoading = $state(false);

  onMount(async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      goto('/');
      return;
    }

    user = currentUser;
    const userId = $page.params.userId;

    // Check if user is viewing their own account
    if (userId === currentUser.id) {
      // Redirect to the main account page for their own account
      goto('/account');
      return;
    }

    // Check if user has permission to view other accounts
    const canViewPrivateProfiles = await hasPermission('can_view_private_profiles');
    if (!canViewPrivateProfiles) {
      error = 'You do not have permission to view other user accounts.';
      loading = false;
      return;
    }

    // Check if user can ban others
    canBanUsers = await hasPermission('can_ban_users');

    // Fetch the target user's profile information
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (!profileData) {
        error = 'User not found';
        loading = false;
        return;
      }

      // Get ban status from profiles table
      userBanned = profileData.banned || false;

      // Create a user-like object from the profile data
      // Note: We can't access email or other private auth info from client-side
      // This is a simplified version showing public profile info
      targetUser = {
        id: profileData.id,
        user_metadata: {
          full_name: profileData.full_name,
          name: profileData.full_name,
        },
        email: 'Protected', // Can't access email from client-side
        created_at: profileData.created_at,
        app_metadata: {},
        aud: 'authenticated',
      } as unknown as User;

      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load user account';
      loading = false;
    }
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async function handleBanToggle() {
    if (!targetUser || banLoading) return;

    banLoading = true;
    const shouldBan = !userBanned;

    const result = await banUser(targetUser.id, shouldBan);

    if (result.success) {
      userBanned = shouldBan;
    } else {
      alert(`Failed to ${shouldBan ? 'ban' : 'unban'} user: ${result.message}`);
    }

    banLoading = false;
  }
</script>

<svelte:head>
  <title>User Account - People Saying Their Own Names</title>
  <meta
    name="description"
    content="View user account information on People Saying Their Own Names."
  />
</svelte:head>

{#if loading}
  <div>Loading...</div>
{:else if error}
  <div class="error-message">{error}</div>
{:else if targetUser}
  <div>
    <div class="header-section">
      <h1>
        {targetUser.user_metadata?.name || targetUser.user_metadata?.full_name || 'User'}
        {#if userBanned}
          <span class="banned-indicator">(Banned)</span>
        {/if}
      </h1>

      {#if canBanUsers}
        <div class="admin-controls">
          <BanButton onclick={handleBanToggle} disabled={banLoading} isBanned={userBanned} />
        </div>
      {/if}
    </div>

    <p><strong>Email:</strong> {targetUser.email}</p>
    <p><strong>Joined:</strong> {formatDate(targetUser.created_at || new Date().toISOString())}</p>
  </div>
{/if}

<style>
  .error-message {
    color: var(--color-error);
    padding: 1rem;
    background: var(--color-bg-light);
    border: 1px solid var(--color-error);
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .header-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .banned-indicator {
    color: #ef4444;
    font-weight: normal;
    font-size: 0.9em;
  }

  .admin-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
