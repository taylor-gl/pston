<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  import { goto } from '$app/navigation';
  import { getCurrentUser, hasPermission } from '$lib/services/auth';
  import { supabase } from '$lib/supabase/client';

  let user: User | null = $state(null);
  let targetUser: User | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

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
    <h1>{targetUser.user_metadata?.name || targetUser.user_metadata?.full_name || 'User'}</h1>

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
</style>
