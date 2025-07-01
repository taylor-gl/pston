<script lang="ts">
  import Icon from '@iconify/svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PublicFigure } from '$lib/types';
  import { getSearchSuggestions } from '$lib/services/public-figures';
  import PublicFigureListItem from './PublicFigureListItem.svelte';

  let searchQuery = $state('');
  let suggestions: PublicFigure[] = $state([]);
  let showSuggestions = $state(false);
  let loading = $state(false);
  let isFirstSearch = $state(true);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchInput = $state<HTMLInputElement>();
  let searchContainer = $state<HTMLElement>();
  let selectedIndex = $state(-1);

  async function handleInput() {
    const query = searchQuery.trim();

    if (query.length < 2) {
      suggestions = [];
      showSuggestions = false;
      isFirstSearch = true;
      return;
    }

    loading = true;
    clearTimeout(searchTimeout);

    searchTimeout = setTimeout(async () => {
      const queryForThisRequest = query;
      try {
        const newSuggestions = await getSearchSuggestions(queryForThisRequest);

        // Only update if this result is still relevant to current search
        if (searchQuery.trim() === queryForThisRequest) {
          suggestions = newSuggestions;
          showSuggestions = newSuggestions.length > 0;
          selectedIndex = -1;
          isFirstSearch = false;
        }
      } catch (error) {
        console.error('Search failed:', error);
        // Only update on error if this result is still relevant and it's the first search
        if (searchQuery.trim() === queryForThisRequest && isFirstSearch) {
          suggestions = [];
          showSuggestions = false;
        }
      } finally {
        loading = false;
      }
    }, 300);
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (searchQuery.trim()) {
      hideSuggestions();
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  function selectSuggestion(figure: PublicFigure) {
    hideSuggestions();
    goto(`/person/${figure.slug}`);
  }

  function hideSuggestions() {
    showSuggestions = false;
    selectedIndex = -1;
    isFirstSearch = true;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!showSuggestions) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selectedSuggestion = suggestions[selectedIndex];
          if (selectedSuggestion) {
            selectSuggestion(selectedSuggestion);
          }
        } else {
          handleSubmit(event);
        }
        break;
      case 'Escape':
        hideSuggestions();
        searchInput?.blur();
        break;
    }
  }

  function handleClickOutside(event: Event) {
    if (searchContainer && !searchContainer.contains(event.target as Node)) {
      hideSuggestions();
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      clearTimeout(searchTimeout);
    };
  });
</script>

<div bind:this={searchContainer} class="search-container">
  <form onsubmit={handleSubmit} class="search-form">
    <div class="search-input-container">
      <input
        bind:this={searchInput}
        bind:value={searchQuery}
        oninput={handleInput}
        onkeydown={handleKeydown}
        onfocus={() => {
          if (searchQuery.length >= 2 && suggestions.length > 0) {
            showSuggestions = true;
          }
        }}
        type="text"
        placeholder="Search public figures..."
        class="search-input"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="submit" class="search-button" aria-label="Search">
        <Icon icon="material-symbols:search" width="16" height="16" />
      </button>
    </div>
  </form>

  {#if showSuggestions || (loading && isFirstSearch && searchQuery.length >= 2) || (searchQuery.length >= 2 && !loading && suggestions.length === 0)}
    <div class="suggestions-container">
      {#if loading && isFirstSearch && suggestions.length === 0}
        <div class="help-text loading">
          <Icon icon="material-symbols:search" />
          Searching...
        </div>
      {:else if suggestions.length === 0 && searchQuery.length >= 2 && !loading}
        <div class="help-text no-results">
          No public figures found matching "{searchQuery}"
        </div>
      {:else}
        <ul class="suggestions-list">
          {#each suggestions as suggestion, index (suggestion.id)}
            <button
              class="suggestion-wrapper"
              class:selected={index === selectedIndex}
              onclick={() => selectSuggestion(suggestion)}
            >
              <PublicFigureListItem figure={suggestion} variant="small" showLink={false} />
            </button>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }

  .search-form {
    position: relative;
  }

  .search-input-container {
    position: relative;
    display: flex;
    border: 1px solid var(--color-borders);
    border-radius: 2px;
    background: var(--color-bg);
  }

  .search-input {
    flex: 1;
    padding: 8px 12px;
    border: none;
    outline: none;
    font-size: 14px;
    background: transparent;
    color: var(--color-text);
  }

  .search-input::placeholder {
    color: var(--color-borders);
  }

  .search-button {
    padding: 8px 12px;
    border: none;
    background: var(--color-bg-light);
    color: var(--color-text);
    cursor: pointer;
    border-left: 1px solid var(--color-borders);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .search-button:hover {
    background: var(--color-borders);
  }

  .suggestions-container {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 300px;
    overflow-y: auto;
    background: white;
    border: 1px solid var(--color-borders);
    border-top: none;
    border-radius: 0 0 8px 8px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .suggestions-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .suggestion-wrapper {
    display: block;
    width: 100%;
    padding: 0 0.5rem;
    margin: 0;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
  }

  .suggestion-wrapper:hover {
    background: var(--color-bg-light);
  }

  .suggestion-wrapper.selected {
    background-color: var(--color-bg-light);
    outline: 1px solid var(--color-accent);
  }

  .loading {
    padding: 12px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .no-results {
    padding: 12px;
    text-align: center;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .search-container {
      max-width: 100%;
    }
  }
</style>
