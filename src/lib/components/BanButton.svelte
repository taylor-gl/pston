<script lang="ts">
  import Icon from '@iconify/svelte';

  let {
    onclick,
    disabled = false,
    isBanned = false,
    title,
  }: {
    onclick: () => void;
    disabled?: boolean;
    isBanned?: boolean;
    title?: string;
  } = $props();

  // Auto-generate title if not provided
  const computedTitle = $derived(title || (isBanned ? 'Unban user' : 'Ban user'));
</script>

<button class="ban-btn" class:banned={isBanned} {onclick} {disabled} title={computedTitle}>
  <Icon
    icon={isBanned ? 'material-symbols:person-check' : 'material-symbols:person-cancel'}
    width="20"
    height="20"
  />
</button>

<style>
  .ban-btn {
    background: none;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: #6b7280;
  }

  .ban-btn:hover {
    background-color: #f3f4f6;
    color: #ef4444;
  }

  .ban-btn.banned:hover {
    background-color: #f3f4f6;
    color: #059669;
  }

  .ban-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
