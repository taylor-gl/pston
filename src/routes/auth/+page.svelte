<script lang="ts">
  import Icon from '@iconify/svelte';

  import { supabase } from '$lib/supabase/client';

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      alert(error.message);
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

<div>
  <h1>Welcome!</h1>
  <p>Please sign in to continue:</p>

  <button onclick={signInWithGoogle} class="btn-secondary btn-icon">
    <Icon icon="devicon:google" />
    Sign in with Google
  </button>
</div>
