<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';

  import { goto } from '$app/navigation';
  import { getCurrentUser } from '$lib/services/auth';

  let user: User | null = null;
  let loading = true;

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
  <title>Account - Pston</title>
</svelte:head>

{#if loading}
  <div>Loading...</div>
{:else if user}
  <div>
    <h1>Account</h1>

    <p>
      <strong>Name:</strong>
      {user.user_metadata?.name || user.user_metadata?.full_name || 'User'}
    </p>
    <p><strong>Email:</strong> {user.email}</p>
    <p><strong>Joined:</strong> {formatDate(user.created_at)}</p>
  </div>
{/if}
