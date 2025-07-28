<script lang="ts">
  import { goto } from '$app/navigation';
  import { createPublicFigure } from '$lib/services/public-figures';
  import type { NewPublicFigure } from '$lib/types';
  import type { User } from '@supabase/supabase-js';
  import { cropAndScaleImage, type CropPixels } from '$lib/utils/image';
  import ImageCropper from '$lib/components/ImageCropper.svelte';

  let user: User | null = null;
  let name = $state('');
  let description = $state('');
  let imageFile: File | null = $state(null);
  let loading = $state(false);
  let error: string | null = $state(null);
  let croppedAreaPixels: CropPixels | null = $state(null);

  function handleImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    imageFile = file || null;
  }

  function handleCancel() {
    goto('/');
  }

  async function handleSubmit() {
    if (!name.trim() || !description.trim() || !imageFile) {
      error = 'Name, description, and photo are all required';
      return;
    }

    if (!croppedAreaPixels) {
      error = 'Please crop the image first.';
      return;
    }

    loading = true;
    error = null;

    try {
      const processedImageFile = await cropAndScaleImage(imageFile, croppedAreaPixels);

      const newFigure: NewPublicFigure = {
        name: name.trim(),
        description: description.trim(),
        image: processedImageFile,
      };

      const createdFigure = await createPublicFigure(newFigure);
      await goto(`/person/${createdFigure.slug}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create public figure';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Add New Public Figure - People Saying Their Own Names</title>
  <meta
    name="description"
    content="Add a new public figure to our collection. Upload their photo and information to help others learn how to pronounce their name correctly."
  />
</svelte:head>

<div class="page-content">
  <div class="form-container">
    <h2 class="section-header">Add New Public Figure</h2>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" bind:value={name} placeholder="e.g., Jamie Foxx" required />
        <div class="help-text">
          The full name the person is most known by. For example, Donald Trump, not Donald J. Trump
          or Donald John Trump.
        </div>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <input
          type="text"
          id="description"
          bind:value={description}
          placeholder="e.g., comedian and actor"
          required
        />
        <div class="help-text">
          Very brief description of who they are (e.g., "Comedian and podcaster")
        </div>
      </div>

      <div class="form-group">
        <label for="image">Photo</label>
        <ImageCropper
          bind:imageFile
          bind:croppedAreaPixels
          bind:error
          onFileChange={() => (imageFile = null)}
        />
        <div class="help-text">A photo of the person. The photo must be in the public domain.</div>
      </div>

      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <div class="form-actions">
        <button type="button" onclick={handleCancel} class="btn-secondary">Cancel</button>
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
  }

  .section-header {
    padding-top: 1rem;
  }

  .form-container {
    max-width: 40rem;
  }

  h2 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .form-group label {
    font-weight: 500;
  }

  input[type='text'] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
  }

  input[type='text']:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
</style>
