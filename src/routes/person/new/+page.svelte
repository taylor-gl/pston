<script lang="ts">
  import { goto } from '$app/navigation';
  import { createPublicFigure } from '$lib/services/public-figures';
  import type { NewPublicFigure } from '$lib/types';
  import Cropper from 'svelte-easy-crop';

  interface Pixels {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  let name = '';
  let description = '';
  let imageFile: File | undefined;
  let imagePreview: string | null = null;
  let loading = false;
  let error: string | null = null;
  let crop = { x: 0, y: 0 };
  let zoom = 1;
  let croppedAreaPixels: null | Pixels = null;

  function handleImageChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      imageFile = file;
      const reader = new FileReader();
      reader.onload = async (e) => {
        imagePreview = e.target?.result as string;
        crop = { x: 0, y: 0 };
        zoom = 1;
        croppedAreaPixels = null;
      };
      reader.readAsDataURL(file);
    } else {
      imageFile = undefined;
      imagePreview = null;
      croppedAreaPixels = null;
    }
  }

  function handleCropComplete(e: { percent: any; pixels: Pixels }) {
    croppedAreaPixels = e.pixels;
  }

  function handleCancel() {
    goto('/');
  }

  async function cropAndScaleImage(imageFile: File, croppedAreaPixels: Pixels): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const croppedWidth = croppedAreaPixels.width;
        const croppedHeight = croppedAreaPixels.height;

        const maxSize = 512;
        const scaleFactor = Math.min(1, maxSize / Math.max(croppedWidth, croppedHeight));

        const finalSize = Math.round(Math.max(croppedWidth, croppedHeight) * scaleFactor);
        canvas.width = finalSize;
        canvas.height = finalSize;

        ctx.clearRect(0, 0, finalSize, finalSize);

        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          finalSize,
          finalSize
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const fileName = imageFile.name.replace(/\.[^/.]+$/, '.webp');
              const processedFile = new File([blob], fileName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/webp',
          0.9
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(imageFile);
    });
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
    <h2>Add New Public Figure</h2>

    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="name">Name</label>
        <input type="text" id="name" bind:value={name} placeholder="e.g., Jamie Foxx" required />
        <div class="help-text">The person's full name</div>
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
          Very brief description of who they are (e.g., "comedian and podcaster")
        </div>
      </div>

      <div class="form-group">
        <label for="image">Photo</label>
        <input type="file" id="image" accept="image/*" on:change={handleImageChange} required />
        <div class="help-text">Profile photo is required</div>
        {#if imagePreview}
          <div class="cropper-container">
            <Cropper
              image={imagePreview}
              bind:crop
              bind:zoom
              aspect={1}
              cropShape="round"
              showGrid={true}
              oncropcomplete={handleCropComplete}
              zoomSpeed={0.3}
              minZoom={1}
              maxZoom={10}
            />
          </div>
        {/if}
      </div>

      {#if error}
        <div class="error-message">
          {error}
        </div>
      {/if}

      <div class="form-actions">
        <button type="submit" disabled={loading} class="submit-button">
          {loading ? 'Creating...' : 'Create Public Figure'}
        </button>
        <button type="button" on:click={handleCancel} class="cancel-button"> Cancel </button>
      </div>
    </form>
  </div>
</div>

<style>
  .page-content {
    max-width: 72rem;
    margin: 0 auto;
  }

  .form-container {
    max-width: 40rem;
  }

  h2 {
    border-bottom: 1px solid var(--color-borders);
    padding-bottom: 0.25rem;
  }

  label {
    display: block;
    font-weight: 500;
  }

  input[type='text'],
  input[type='file'] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-borders);
    font-size: 1rem;
    font-family: inherit;
  }

  input[type='text']:focus {
    outline: none;
    border-color: var(--color-link);
    box-shadow: 0 0 0 1px var(--color-link);
  }

  .help-text {
    font-size: 0.9rem;
    color: var(--color-text);
    opacity: 0.7;
  }

  .error-message {
    background-color: var(--color-error-bg);
    color: var(--color-error);
    padding: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
  }

  .submit-button {
    background-color: var(--color-link);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
  }

  .submit-button:hover:not(:disabled) {
    background-color: var(--color-link-hover);
  }

  .submit-button:disabled {
    background-color: var(--color-borders);
    cursor: not-allowed;
  }

  .cancel-button {
    background: none;
    border: 1px solid var(--color-borders);
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    cursor: pointer;
    color: var(--color-text);
  }

  .cancel-button:hover {
    background-color: var(--color-bg-light);
  }

  .cropper-container {
    width: 100%;
    height: 400px;
    margin-top: 1rem;
    position: relative;
    background-color: var(--color-bg-light);
    border: 1px solid var(--color-borders);
    border-radius: 8px;
    overflow: hidden;
  }
</style>
