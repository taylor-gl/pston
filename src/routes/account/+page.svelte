<script lang="ts">
  import type { ServerUserContext } from '$lib/services/server-auth';

  interface PageData {
    userContext: ServerUserContext;
  }

  let { data }: { data: PageData } = $props();

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>Account - People Saying Their Own Names</title>
  <meta
    name="description"
    content="Manage your People Saying Their Own Names account settings and view your profile information."
  />
</svelte:head>

<div>
  <h1>@{data.userContext.profile.username || 'User'}</h1>

  <p><strong>Email:</strong> {data.userContext.email}</p>
  <p><strong>Joined:</strong> {formatDate(data.userContext.profile.created_at)}</p>
</div>
