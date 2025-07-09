<script lang="ts">
  import Icon from '@iconify/svelte';

  let {
    onclick,
    disabled = false,
    title = 'Delete',
  }: {
    onclick: () => void;
    disabled?: boolean;
    title?: string;
  } = $props();
</script>

<button class="delete-btn" {onclick} {disabled} {title}>
  <Icon icon="material-symbols:delete" width="20" height="20" />
</button>

<style>
  .delete-btn {
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

  .delete-btn:hover {
    background-color: #f3f4f6;
    color: #ef4444;
  }

  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .delete-btn:disabled:hover {
    background: none;
    color: #6b7280;
  }
</style>
