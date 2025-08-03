<script lang="ts">
  import type { PublicProfile } from '$lib/types';
  import type { ServerUserContext } from '$lib/services/server-auth';
  import { banUser } from '$lib/services/auth';
  import BanButton from '$lib/components/BanButton.svelte';

  interface PageData {
    userContext: ServerUserContext;
    targetProfile: PublicProfile;
    userBanned: boolean;
  }

  let { data }: { data: PageData } = $props();

  // Computed value that needs $derived
  let canBanUsers = $derived(data.userContext.permissions.includes('can_ban_users'));

  let userBanned = $state(data.userBanned);
  let banLoading = $state(false);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async function handleBanToggle() {
    if (!data.targetProfile || banLoading) return;

    banLoading = true;
    const shouldBan = !userBanned;

    const result = await banUser(data.targetProfile.id, shouldBan);

    if (result.success) {
      userBanned = shouldBan;
    } else {
      alert(`Failed to ${shouldBan ? 'ban' : 'unban'} user: ${result.message}`);
    }

    banLoading = false;
  }
</script>

<svelte:head>
  <title>User Account - People Saying Their Own Names</title>
  <meta
    name="description"
    content="View user account information on People Saying Their Own Names."
  />
</svelte:head>

<div>
  <div>
    <div class="header-section">
      <h1>
        @{data.targetProfile?.username || 'User'}
        {#if userBanned}
          <span class="banned-indicator">(Banned)</span>
        {/if}
      </h1>

      {#if canBanUsers}
        <div class="admin-controls">
          <BanButton onclick={handleBanToggle} disabled={banLoading} isBanned={userBanned} />
        </div>
      {/if}
    </div>

    <p>
      <strong>Joined:</strong>
      {formatDate(data.targetProfile?.created_at || new Date().toISOString())}
    </p>
  </div>
</div>

<style>
  .header-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .banned-indicator {
    color: #ef4444;
    font-weight: normal;
    font-size: 0.9em;
  }

  .admin-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
