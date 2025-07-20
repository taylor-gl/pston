<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';

  import { goto } from '$app/navigation';
  import { getCurrentUser } from '$lib/services/auth';

  let user: User | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);

  onMount(() => {
    getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        goto('/');
        return;
      }
      user = currentUser;
      loading = false;
    });
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
{:else if user}
  <div>
    <h1>{user.user_metadata?.name || user.user_metadata?.full_name || 'User'}</h1>

    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Joined:</strong> {formatDate(user.created_at)}</p>
  </div>
{/if}
