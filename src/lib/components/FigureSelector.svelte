<script lang="ts">
  import Icon from '@iconify/svelte';
  import { onMount } from 'svelte';
  import type { PublicFigure } from '$lib/types';
  import { getSearchSuggestions } from '$lib/services/public-figures';
  import PublicFigureListItem from './PublicFigureListItem.svelte';

  let {
    selectedFigure = $bindable(null),
    onSelect = () => {},
    placeholder = 'Search for public figure...',
  }: {
    selectedFigure?: PublicFigure | null;
    onSelect?: (figure: PublicFigure | null) => void;
    placeholder?: string;
  } = $props();

  let searchQuery = $state('');
  let suggestions: PublicFigure[] = $state([]);
  let showSuggestions = $state(false);
  let loading = $state(false);
  let isFirstSearch = $state(true);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let searchInput = $state<HTMLInputElement>();
  let figureSelector = $state<HTMLElement>();
  let selectedIndex = $state(-1);

  $effect(() => {
    if (selectedFigure) {
      searchQuery = selectedFigure.name;
      showSuggestions = false;
    }
  });

  async function handleInput() {
    if (selectedFigure) return;

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

        if (searchQuery.trim() === queryForThisRequest) {
          suggestions = newSuggestions;
          showSuggestions = newSuggestions.length > 0;
          selectedIndex = -1;
          isFirstSearch = false;
        }
      } catch (error) {
        console.error('Search failed:', error);
        if (searchQuery.trim() === queryForThisRequest && isFirstSearch) {
          suggestions = [];
          showSuggestions = false;
        }
      } finally {
        loading = false;
      }
    }, 300);
  }

  function selectFigure(figure: PublicFigure) {
    selectedFigure = figure;
    searchQuery = figure.name;
    hideSuggestions();
    onSelect(figure);
  }

  function clearSelection() {
    selectedFigure = null;
    searchQuery = '';
    onSelect(null);
    searchInput?.focus();
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
            selectFigure(selectedSuggestion);
          }
        }
        break;
      case 'Escape':
        hideSuggestions();
        searchInput?.blur();
        break;
    }
  }

  function handleClickOutside(event: Event) {
    if (figureSelector && !figureSelector.contains(event.target as Node)) {
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

<div bind:this={figureSelector} class="figure-selector">
  <label for="figure-search">Search for public figure</label>

  {#if selectedFigure}
    <div class="selected-figure">
      <PublicFigureListItem figure={selectedFigure} />
      <button type="button" onclick={clearSelection} class="clear-btn"> Clear </button>
    </div>
  {:else}
    <div class="search-container">
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
          id="figure-search"
          {placeholder}
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={clearSelection}
            class="clear-search-btn"
            aria-label="Clear search"
          >
            <Icon icon="material-symbols:close" width="16" height="16" />
          </button>
        {/if}
      </div>

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
                  type="button"
                  class="suggestion-wrapper"
                  class:selected={index === selectedIndex}
                  onclick={() => selectFigure(suggestion)}
                >
                  <PublicFigureListItem figure={suggestion} variant="small" showLink={false} />
                </button>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .figure-selector {
    margin-bottom: 1rem;
  }

  .figure-selector label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .selected-figure {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--color-bg-light);
    border-radius: 4px;
    border: 1px solid var(--color-borders);
  }

  .selected-figure :global(.figure-item) {
    flex: 1;
    min-width: 0;
    padding: 0;
  }

  .clear-btn {
    background: var(--color-error);
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .clear-btn:hover {
    background: var(--color-error-dark);
  }

  .search-container {
    position: relative;
  }

  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    background: var(--color-bg);
  }

  .search-input-container input {
    flex: 1;
    padding: 0.75rem;
    border: none;
    outline: none;
    font-size: 1rem;
    background: transparent;
    color: var(--color-text);
  }

  .search-input-container input::placeholder {
    color: var(--color-borders);
  }

  .search-input-container input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .clear-search-btn {
    padding: 0.5rem;
    border: none;
    background: none;
    color: var(--color-borders);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-search-btn:hover {
    color: var(--color-text);
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
    max-height: 300px;
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
</style>
