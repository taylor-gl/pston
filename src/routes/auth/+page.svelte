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

<div class="auth-container">
  <h1>Welcome!</h1>
  <p>Please sign in to continue:</p>

  {#if errorMessage}
    <div class="error-message">{errorMessage}</div>
  {/if}

  <button onclick={signInWithGoogle} class="btn-secondary btn-icon" disabled={isLoading}>
    {#if isLoading}
      <Icon icon="svg-spinners:90-ring-with-bg" />
    {:else}
      <Icon icon="devicon:google" />
    {/if}
    Sign in with Google
  </button>
</div>

<style>
  .auth-container {
    padding: 2rem 0;
  }

  .auth-container button {
    margin-bottom: 2rem;
  }
</style>
