<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';

  import { supabase } from '$lib/supabase/client';
  import { getCurrentUser } from '$lib/services/auth';

  let user: User | null = null;

  onMount(() => {
    getCurrentUser().then((currentUser) => {
      user = currentUser;
    });
  });

  async function signOut() {
    await supabase.auth.signOut();
    user = null;
    location.reload();
  }

  function getUserDisplayName(user: User | null): string {
    if (!user) return '';
    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User'
    );
  }
</script>

<nav>
  <div class="nav-container">
    <h1>
      <a href="/" class="nav-title"> People Saying Their Own Names </a>
    </h1>

    <div class="nav-actions">
      {#if user}
        <a href="/account">
          {getUserDisplayName(user)}
        </a>
        <button on:click={signOut} class="link-button"> Sign out </button>
      {:else}
        <a href="/auth"> Sign in </a>
      {/if}
    </div>
  </div>
</nav>

<style>
  nav {
    padding: 0.25rem 0;
  }

  .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: end;
    max-width: 72rem;
    margin: 0 auto;
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
  }

  .nav-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .nav-title {
    color: var(--color-text);
    text-decoration: none;
  }

  .nav-title:hover {
    text-decoration: underline;
  }
</style>
