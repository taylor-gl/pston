<script lang="ts">
  import { supabase } from '$lib/supabase/client'
  import Icon from '@iconify/svelte'

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })
    if (error) {
      alert(error.message)
    }
  }
</script>

<div>
  <h1>Welcome!</h1>
  <p>Please sign in to continue:</p>
  
  <button on:click={signInWithGoogle} class="google-btn">
    <Icon icon="devicon:google" width="20" height="20" />
    Sign in with Google
  </button>
</div>

<style>
  .google-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-borders);
    cursor: pointer;
    font: inherit;
  }

  .google-btn:hover:not(:disabled) {
    background: #f8f9fa;
  }


</style> 