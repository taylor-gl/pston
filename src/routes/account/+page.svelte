<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import type { PublicProfile } from '$lib/types';
  import { onMount } from 'svelte';

  import { goto } from '$app/navigation';
  import { getCurrentUserWithProfile } from '$lib/services/auth';

  let user: User | null = $state(null);
  let profile: PublicProfile | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  onMount(async () => {
    const userWithProfile = await getCurrentUserWithProfile();
    if (!userWithProfile) {
      goto('/');
      return;
    }

    user = userWithProfile.user;
    profile = userWithProfile.profile;
    loading = false;
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
  <title>Account - People Saying Their Own Names</title>
  <meta
    name="description"
    content="Manage your People Saying Their Own Names account settings and view your profile information."
  />
</svelte:head>

{#if loading}
  <div>Loading...</div>
{:else if error}
  <div class="error-message">{error}</div>
{:else if user && profile}
  <div>
    <h1>@{profile.username || 'User'}</h1>

    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Joined:</strong> {formatDate(user.created_at)}</p>
  </div>
{/if}
