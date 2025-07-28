<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { PublicFigure, NewPublicFigure, NewPronunciationExample } from '$lib/types';
  import type { User } from '@supabase/supabase-js';
  import { createPublicFigure, getPublicFigureBySlug } from '$lib/services/public-figures';
  import {
    createPronunciationExample,
    extractYouTubeVideoId,
  } from '$lib/services/pronunciation-examples';
  import { getCurrentUser } from '$lib/services/auth';
  import { cropAndScaleImage, type CropPixels } from '$lib/utils/image';
  import {
    validateNewFigure,
    validatePronunciationExample,
    type NewFigureFormData,
    type PronunciationExampleFormData,
  } from '$lib/utils/form-validation';
  import FigureSelector from '$lib/components/FigureSelector.svelte';
  import ImageCropper from '$lib/components/ImageCropper.svelte';
  import TimestampPicker from '$lib/components/TimestampPicker.svelte';

  let user: User | null = $state(null);
  let loading = $state(false);
  let error: string | null = $state(null);

  let selectedFigure: PublicFigure | null = $state(null);
  let figureMode: 'existing' | 'new' = $state('existing');

  let newFigureName = $state('');
  let newFigureDescription = $state('');
  let newFigureImageFile: File | null = $state(null);
  let croppedAreaPixels: CropPixels | null = $state(null);

  let youtubeUrl = $state('');
  let startTimestamp = $state(0);
  let endTimestamp = $state(5);
  let exampleDescription = $state('');

  let videoId = $derived(youtubeUrl ? extractYouTubeVideoId(youtubeUrl) : null);

  onMount(async () => {
    try {
      user = await getCurrentUser();
      if (!user) {
        goto('/auth?redirect=' + encodeURIComponent($page.url.pathname + $page.url.search));
        return;
      }
      const figureSlug = $page.url.searchParams.get('figure');
      if (figureSlug) {
        const figure = await getPublicFigureBySlug(figureSlug);
        if (figure) {
          selectedFigure = figure;
          figureMode = 'existing';
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
    }
  });

  function handleImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    newFigureImageFile = file || null;
  }

  function handleFigureSelect(figure: PublicFigure | null) {
    selectedFigure = figure;
  }

  async function handleSubmit() {
    error = null;
    loading = true;

    try {
      if (!user) {
        error = 'You must be signed in to submit pronunciation examples';
        return;
      }

      if (figureMode === 'existing' && !selectedFigure) {
        error = 'Please select a public figure';
        return;
      }

      let figureToUse = selectedFigure;

      if (figureMode === 'new') {
        const newFigureData: NewFigureFormData = {
          name: newFigureName,
          description: newFigureDescription,
          imageFile: newFigureImageFile,
          croppedAreaPixels,
        };

        const newFigureError = validateNewFigure(newFigureData);
        if (newFigureError) {
          error = newFigureError;
          return;
        }

        const processedImageFile = await cropAndScaleImage(newFigureImageFile!, croppedAreaPixels!);

        const newFigure: NewPublicFigure = {
          name: newFigureName.trim(),
          description: newFigureDescription.trim(),
          image: processedImageFile,
        };

        figureToUse = await createPublicFigure(newFigure);
      }

      const exampleData: PronunciationExampleFormData = {
        youtubeUrl,
        startTimestamp,
        endTimestamp,
        description: exampleDescription,
      };

      const exampleError = validatePronunciationExample(exampleData);
      if (exampleError) {
        error = exampleError;
        return;
      }

      const videoId = extractYouTubeVideoId(youtubeUrl)!;
      const newExample: NewPronunciationExample = {
        public_figure_id: figureToUse!.id,
        youtube_video_id: videoId,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
      };

      if (exampleDescription.trim()) {
        newExample.description = exampleDescription.trim();
      }

      await createPronunciationExample(newExample);
      goto(`/person/${figureToUse!.slug}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit pronunciation example';
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  }
</script>

<svelte:head>
  <title>Submit New Pronunciation Example - People Saying Their Own Names</title>
  <meta
    name="description"
    content="Submit a new pronunciation example of a public figure saying their own name. Help others learn correct pronunciations."
  />
</svelte:head>

<div class="page-content">
  <div class="form-container">
    <h2>Submit New Pronunciation Example</h2>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <!-- Public Figure Selection -->
      <fieldset class="form-section">
        <legend>Public Figure</legend>

        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" bind:group={figureMode} value="existing" />
            <span>Choose existing public figure</span>
          </label>
          <label class="radio-option">
            <input type="radio" bind:group={figureMode} value="new" />
            <span>Add new public figure</span>
          </label>
        </div>

        {#if figureMode === 'existing'}
          <FigureSelector
            bind:selectedFigure
            onSelect={handleFigureSelect}
            placeholder="Type to search for public figure..."
          />
        {:else}
          <!-- New Public Figure Form -->
          <div class="new-figure-form">
            <div class="form-group">
              <label for="new-name">Name</label>
              <input
                type="text"
                id="new-name"
                bind:value={newFigureName}
                placeholder="e.g., Jamie Foxx"
                required
              />
              <div class="help-text">
                The full name the person is most known by. For example, Donald Trump, not Donald J.
                Trump or Donald John Trump.
              </div>
            </div>

            <div class="form-group">
              <label for="new-description">Description</label>
              <input
                type="text"
                id="new-description"
                bind:value={newFigureDescription}
                placeholder="e.g., comedian and actor"
                required
              />
              <div class="help-text">
                Very brief description of who they are (e.g., "Comedian and podcaster")
              </div>
            </div>

            <div class="form-group">
              <label for="new-image">Photo</label>
              <ImageCropper
                bind:imageFile={newFigureImageFile}
                bind:croppedAreaPixels
                bind:error
                onFileChange={() => (newFigureImageFile = null)}
              />
              <div class="help-text">
                A photo of the person. The photo must be in the public domain.
              </div>
            </div>
          </div>
        {/if}
      </fieldset>

      <!-- Pronunciation Example Details -->
      <fieldset class="form-section">
        <legend>Pronunciation Example</legend>

        <div class="form-group">
          <label for="youtube-url">YouTube URL or Video ID</label>
          <input
            type="text"
            id="youtube-url"
            bind:value={youtubeUrl}
            placeholder="https://youtube.com/watch?v=... or video ID"
            required
          />
        </div>

        {#if videoId}
          <div class="timestamp-picker-container">
            <TimestampPicker {videoId} bind:startTimestamp bind:endTimestamp />
          </div>
        {/if}

        <div class="form-group description-field">
          <label for="example-description">Description (optional)</label>
          <input
            type="text"
            id="example-description"
            bind:value={exampleDescription}
            placeholder="e.g., from interview with Jimmy Fallon"
          />
          <p class="help-text">
            Leave this blank or add notes about the quality, e.g. "Other people talking in the
            background"
          </p>
        </div>
      </fieldset>

      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <div class="form-actions">
        <button type="button" onclick={handleCancel} class="btn-secondary"> Cancel </button>
        <button type="submit" disabled={loading} class="btn-primary">
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .page-content {
    max-width: 72rem;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .form-container {
    max-width: 48rem;
    margin: 0 auto;
  }

  .form-container h2 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.5rem;
    margin-bottom: 2rem;
  }

  .form-section {
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .form-section legend {
    font-weight: 600;
    padding: 0 0.5rem;
  }

  .radio-group {
    display: flex;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .new-figure-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 500;
  }

  .form-group input {
    padding: 0.75rem;
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    font-size: 1rem;
  }

  .form-group input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .help-text {
    font-size: 0.875rem;
    color: var(--color-text-light);
    margin: 0;
  }

  .description-field {
    margin-top: 1.5rem;
  }

  .timestamp-picker-container {
    margin-top: 1.5rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .radio-group {
      flex-direction: column;
      gap: 1rem;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>
