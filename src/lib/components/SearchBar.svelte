<script lang="ts">
  import Icon from '@iconify/svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { PublicFigure } from '$lib/types';
  import { getSearchSuggestions } from '$lib/services/public-figures';
  import PublicFigureListItem from './PublicFigureListItem.svelte';

  let searchQuery = '';
  let suggestions: PublicFigure[] = [];
  let showSuggestions = false;
  let loading = false;
  let isFirstSearch = true;
  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchInput: HTMLInputElement;
  let suggestionsContainer: HTMLElement;
  let selectedIndex = -1;

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
        searchInput.blur();
        break;
    }
  }

  function handleClickOutside(event: Event) {
    if (
      searchInput &&
      suggestionsContainer &&
      !searchInput.contains(event.target as Node) &&
      !suggestionsContainer.contains(event.target as Node)
    ) {
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

<div class="search-container">
  <form on:submit={handleSubmit} class="search-form">
    <div class="search-input-container">
      <input
        bind:this={searchInput}
        bind:value={searchQuery}
        on:input={handleInput}
        on:keydown={handleKeydown}
        on:focus={() => {
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
    <div bind:this={suggestionsContainer} class="suggestions-container">
      {#if loading && isFirstSearch && suggestions.length === 0}
        <div class="status-message loading">
          <Icon icon="line-md:loading-loop" width="16" height="16" />
          <span>Searching...</span>
        </div>
      {:else if suggestions.length === 0 && searchQuery.length >= 2 && !loading}
        <div class="status-message no-results">
          <span>No results found</span>
        </div>
      {:else}
        <ul class="suggestions-list">
          {#each suggestions as suggestion, index (suggestion.id)}
            <button
              class="suggestion-wrapper"
              class:selected={index === selectedIndex}
              on:click={() => selectSuggestion(suggestion)}
            >
              <PublicFigureListItem figure={suggestion} variant="small" />
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
    background: #e5e5e5;
  }

  .suggestions-container {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-borders);
    border-top: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    max-height: 400px;
    overflow-y: auto;
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

  .status-message {
    padding: 12px;
    text-align: center;
    color: var(--color-borders);
    font-size: 0.9rem;
  }

  .status-message.loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .search-container {
      max-width: 100%;
    }
  }
</style>
