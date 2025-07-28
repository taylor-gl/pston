<script lang="ts">
  import Icon from '@iconify/svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  import { supabase } from '$lib/supabase/client';

  let errorMessage = $state('');
  let isLoading = $state(false);

  // Check for banned parameter in URL query string
  const bannedFromQuery = $derived(browser && $page.url.searchParams.has('banned'));

  // Check for Supabase error hash parameters (user_banned error)
  const bannedFromHash = $derived(
    browser &&
      typeof window !== 'undefined' &&
      window.location.hash.includes('error_code=user_banned')
  );

  // Handle banned user detection and clean up URL
  $effect(() => {
    if (bannedFromQuery || bannedFromHash) {
      errorMessage = 'Your account has been banned.';

      // Clean up the URL if it has hash parameters
      if (bannedFromHash && typeof window !== 'undefined') {
        // Replace the current URL with a clean version
        const cleanUrl = window.location.origin + window.location.pathname + '?banned';
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  });

  async function signInWithGoogle() {
    isLoading = true;
    errorMessage = '';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    isLoading = false;

    if (error) {
      errorMessage = error.message;
    }
  }
</script>

<svelte:head>
  <title>Sign In - People Saying Their Own Names</title>
  <meta
    name="description"
    content="Sign in to People Saying Their Own Names to add new public figures and contribute to our collection of people saying their own names."
  />
</svelte:head>

<div class="page-content">
  <div class="form-container">
    <h2 class="section-header">Welcome!</h2>
    <p>Please sign in to continue:</p>

    {#if errorMessage}
      <div class="error-message">{errorMessage}</div>
    {/if}

    <div class="form-actions">
      <button onclick={signInWithGoogle} class="btn-secondary btn-icon" disabled={isLoading}>
        {#if isLoading}
          <Icon icon="svg-spinners:90-ring-with-bg" />
        {:else}
          <Icon icon="devicon:google" />
        {/if}
        Sign in with Google
      </button>
    </div>
  </div>
</div>

<style>
  .page-content {
    max-width: 72rem;
    margin: 0 auto;
  }

  .section-header {
    padding-top: 1rem;
  }

  .form-container {
    max-width: 40rem;
  }

  h2 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
</style>
