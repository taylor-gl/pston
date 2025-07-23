<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  onMount(() => {
    if (browser && window.location.hash) {
      // Check if the hash contains error parameters
      const hash = window.location.hash.substring(1); // Remove the #
      const params = new URLSearchParams(hash);

      const error = params.get('error');
      const errorCode = params.get('error_code');

      // If user is banned, redirect to auth page with banned parameter
      if (error === 'access_denied' && errorCode === 'user_banned') {
        goto('/auth?banned', { replaceState: true });
        return;
      }

      // If there's any other error, redirect to auth page
      if (error) {
        goto('/auth', { replaceState: true });
        return;
      }
    }
  });
</script>

<div>
  <p>Authenticating...</p>
</div>
