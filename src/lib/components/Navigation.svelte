<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';

  import { supabase } from '$lib/supabase/client';

  let user: User | null = null;

  onMount(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user: initialUser } }) => {
      user = initialUser;
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });

    return () => subscription.unsubscribe();
  });

  async function signOut() {
    await supabase.auth.signOut();
    user = null;
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
      <a href="/" class="no-underline"> People Saying Their Own Names </a>
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
</style>
