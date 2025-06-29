<script lang="ts">
  import type { User } from '@supabase/supabase-js';
  import { onMount } from 'svelte';

  import { supabase } from '$lib/supabase/client';
  import { getCurrentUser } from '$lib/services/auth';
  import SearchBar from './SearchBar.svelte';

  let user: User | null = null;
  let showMobileMenu = false;

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

  function toggleMobileMenu() {
    showMobileMenu = !showMobileMenu;
  }

  function handleClickOutside(event: Event) {
    const target = event.target as Element;
    if (!target.closest('.mobile-menu-container')) {
      showMobileMenu = false;
    }
  }

  onMount(() => {
    getCurrentUser().then((currentUser) => {
      user = currentUser;
    });

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });
</script>

<nav>
  <div class="nav-container">
    <div class="nav-header">
      <h1>
        <a href="/" class="nav-title">People Saying Their Own Names</a>
      </h1>

      <div class="nav-search desktop-only">
        <SearchBar />
      </div>

      <div class="nav-actions desktop-only">
        {#if user}
          <a href="/account">
            {getUserDisplayName(user)}
          </a>
          <button on:click={signOut} class="link-button">Sign out</button>
        {:else}
          <a href="/auth">Sign in</a>
        {/if}
      </div>

      <div class="mobile-menu-container mobile-only">
        <button on:click={toggleMobileMenu} class="mobile-menu-button" aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2"></circle>
            <circle cx="12" cy="12" r="2"></circle>
            <circle cx="19" cy="12" r="2"></circle>
          </svg>
        </button>

        {#if showMobileMenu}
          <div class="mobile-menu">
            {#if user}
              <a href="/account" on:click={() => (showMobileMenu = false)}>
                {getUserDisplayName(user)}
              </a>
              <button on:click={signOut} class="link-button">Sign out</button>
            {:else}
              <a href="/auth" on:click={() => (showMobileMenu = false)}>Sign in</a>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="nav-search mobile-only">
      <SearchBar />
    </div>
  </div>
</nav>

<style>
  nav {
    padding: 0.5rem 0;
  }

  .nav-container {
    max-width: 72rem;
    margin: 0 auto;
    border-bottom: 1px solid var(--color-borders);
  }

  .nav-header {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 0.5rem;
  }

  .nav-header h1 {
    margin: 0;
  }

  .nav-title {
    color: var(--color-text);
    text-decoration: none;
    font-size: 1.5rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .nav-title:hover {
    text-decoration: underline;
  }

  .nav-search {
    flex: 1;
    max-width: 400px;
    display: flex;
    align-items: center;
  }

  .nav-search.mobile-only {
    display: none;
  }

  .nav-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .mobile-menu-container {
    position: relative;
  }

  .mobile-menu-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: var(--color-text);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-menu-button:hover {
    background: var(--color-bg-light);
    border-radius: 4px;
  }

  .mobile-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-borders);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 0.25rem 0;
    min-width: 120px;
    z-index: 1000;
  }

  .mobile-menu a,
  .mobile-menu button {
    display: block;
    padding: 0.5rem 0.75rem;
    margin: 0;
    text-align: left;
    width: 100%;
    border: none;
    background: none;
    color: var(--color-link);
    text-decoration: none;
    cursor: pointer;
    font: inherit;
  }

  .mobile-menu a:hover,
  .mobile-menu button:hover {
    text-decoration: underline;
  }

  .desktop-only {
    display: flex;
  }

  .mobile-only {
    display: none;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .nav-header {
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .nav-title {
      font-size: 1.25rem;
      flex: 1;
      min-width: 0;
      line-height: 1.2;
      display: flex;
      align-items: center;
    }

    .desktop-only {
      display: none;
    }

    .mobile-only {
      display: block;
    }

    .nav-search.mobile-only {
      display: block;
      margin-bottom: 0.25rem;
    }

    .mobile-menu-button {
      padding: 0;
      margin: 0;
      height: fit-content;
      align-self: center;
    }
  }

  /* Very small screens */
  @media (max-width: 480px) {
    .nav-title {
      font-size: 1.1rem;
    }
  }
</style>
