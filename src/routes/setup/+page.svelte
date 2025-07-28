<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase/client';
  import { getCurrentUser } from '$lib/services/auth';
  import Icon from '@iconify/svelte';

  let username = $state('');
  let termsAccepted = $state(false);
  let privacyAccepted = $state(false);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let usernameAvailable = $state<boolean | null>(null);
  let checkingUsername = $state(false);

  // Check if user should be on this page
  onMount(async () => {
    const user = await getCurrentUser();
    if (!user) {
      goto('/auth');
      return;
    }

    // Check if user has already completed setup
    const { data: profile } = await supabase
      .from('profiles')
      .select('setup_completed, username')
      .eq('id', user.id)
      .single();

    if (profile?.setup_completed) {
      goto('/');
      return;
    }

    // Pre-fill username if one was auto-generated
    if (profile?.username) {
      username = profile.username;
      checkUsernameAvailability();
    }
  });

  // Debounced username availability check
  let usernameCheckTimeout: ReturnType<typeof setTimeout>;

  async function checkUsernameAvailability() {
    if (!username.trim()) {
      usernameAvailable = null;
      return;
    }

    checkingUsername = true;

    try {
      const { data, error } = await supabase.rpc('is_username_available', {
        requested_username: username.trim(),
      });

      if (error) {
        console.error('Error checking username availability:', error);
        usernameAvailable = null;
      } else {
        usernameAvailable = data;
      }
    } catch (error) {
      console.error('Error checking username availability:', error);
      usernameAvailable = null;
    } finally {
      checkingUsername = false;
    }
  }

  function onUsernameInput() {
    usernameAvailable = null;
    clearTimeout(usernameCheckTimeout);
    usernameCheckTimeout = setTimeout(checkUsernameAvailability, 500);
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!username.trim()) {
      errorMessage = 'Please enter a username';
      return;
    }

    if (!termsAccepted || !privacyAccepted) {
      errorMessage = 'Please accept the Terms of Use and Privacy Policy';
      return;
    }

    if (usernameAvailable === false) {
      errorMessage = 'Please choose a different username';
      return;
    }

    isLoading = true;
    errorMessage = '';

    try {
      const { data, error } = await supabase.rpc('complete_user_setup', {
        p_username: username.trim(),
        p_terms_accepted: termsAccepted && privacyAccepted,
      });

      if (error) {
        errorMessage = error.message || 'An error occurred';
        return;
      }

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        errorMessage = result.error || 'An error occurred';
        return;
      }

      // Success! Redirect to home page
      goto('/');
    } catch (error: any) {
      errorMessage = error.message || 'An error occurred';
    } finally {
      isLoading = false;
    }
  }

  // Validate username format
  const isValidUsernameFormat = $derived(() => {
    if (!username.trim()) return false;
    const trimmed = username.trim();
    return trimmed.length >= 3 && trimmed.length <= 20 && /^[a-zA-Z0-9_]+$/.test(trimmed);
  });

  const canSubmit = $derived(() => {
    return (
      isValidUsernameFormat() &&
      usernameAvailable === true &&
      termsAccepted &&
      privacyAccepted &&
      !isLoading
    );
  });
</script>

<svelte:head>
  <title>Complete Your Account Setup - People Saying Their Own Names</title>
</svelte:head>

<div class="page-content">
  <div class="form-container">
    <h2 class="section-header">Complete Your Account Setup</h2>
    <p>Welcome! Let's finish setting up your account.</p>

    <form onsubmit={handleSubmit}>
      <!-- Username Input -->
      <div class="form-group">
        <label for="username">Choose a Username</label>
        <div class="input-container">
          <input
            type="text"
            id="username"
            bind:value={username}
            oninput={onUsernameInput}
            disabled={isLoading}
            placeholder="Enter your username"
            required
          />

          <!-- Username validation indicators -->
          <div class="input-icon">
            {#if checkingUsername}
              <Icon icon="material-symbols:progress-activity" class="loading-icon" />
            {:else if username.trim() && isValidUsernameFormat()}
              {#if usernameAvailable === true}
                <Icon icon="material-symbols:check-circle" class="success-icon" />
              {:else if usernameAvailable === false}
                <Icon icon="material-symbols:cancel" class="error-text" />
              {/if}
            {:else if username.trim() && !isValidUsernameFormat()}
              <Icon icon="material-symbols:cancel" class="error-text" />
            {/if}
          </div>
        </div>

        <div class="help-text">3-20 characters, letters, numbers, and underscores only</div>

        <!-- Username status messages -->
        {#if username.trim() && !isValidUsernameFormat()}
          <div class="help-text error-text">
            Username must be 3-20 characters and contain only letters, numbers, and underscores
          </div>
        {:else if usernameAvailable === false}
          <div class="help-text error-text">This username is already taken</div>
        {:else if usernameAvailable === true}
          <div class="help-text success-text">Username is available!</div>
        {/if}
      </div>

      <!-- Terms and Privacy -->
      <div class="form-group">
        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={termsAccepted} disabled={isLoading} />
            I agree to the
            <a href="/terms" target="_blank">Terms of Use</a>
          </label>
        </div>

        <div class="checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={privacyAccepted} disabled={isLoading} />
            I agree to the
            <a href="/privacy" target="_blank">Privacy Policy</a>
          </label>
        </div>
      </div>

      <!-- Error Message -->
      {#if errorMessage}
        <div class="error-message">
          {errorMessage}
        </div>
      {/if}

      <!-- Submit Button -->
      <div class="form-actions">
        <button type="submit" disabled={!canSubmit} class="btn-primary btn-icon">
          {#if isLoading}
            <Icon icon="svg-spinners:90-ring-with-bg" />
            Setting up your account...
          {:else}
            Complete Setup
          {/if}
        </button>
      </div>
    </form>
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

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .form-group label {
    font-weight: 500;
  }

  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  input[type='text'] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
  }

  input[type='text']:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .input-icon {
    position: absolute;
    right: 0.75rem;
    pointer-events: none;
  }

  .loading-icon {
    color: var(--color-borders);
    animation: spin 1s linear infinite;
  }

  .success-icon {
    color: var(--color-success);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .error-text {
    color: var(--color-error);
  }

  .success-text {
    color: var(--color-success);
  }

  .checkbox-group {
    margin-bottom: 0.75rem;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .checkbox-label input[type='checkbox'] {
    margin-top: 0.1rem;
    flex-shrink: 0;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
</style>
