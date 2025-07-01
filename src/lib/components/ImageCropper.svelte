<script lang="ts">
  import {
    createImagePreview,
    type CropPixels,
    type CropData,
    cropAndScaleImage,
  } from '$lib/utils/image';
  import Cropper from 'svelte-easy-crop';

  let {
    imageFile = $bindable(null),
    croppedAreaPixels = $bindable(null),
    error = $bindable(null),
    onFileChange = () => {},
  }: {
    imageFile?: File | null;
    croppedAreaPixels?: CropPixels | null;
    error?: string | null;
    onFileChange?: (file: File | null) => void;
  } = $props();

  let imagePreview: string | null = $state(null);
  let crop = $state({ x: 0, y: 0 });
  let zoom = $state(1);
  let isApplied = $state(false);
  let croppedImageUrl: string | null = $state(null);
  let temporaryCroppedAreaPixels: CropPixels | null = $state(null);
  let fileInput = $state<HTMLInputElement>();

  $effect(() => {
    if (imageFile && !isApplied) {
      loadImagePreview();
    } else if (!imageFile) {
      reset();
    }
  });

  async function loadImagePreview() {
    if (!imageFile) return;

    try {
      imagePreview = await createImagePreview(imageFile);
      crop = { x: 0, y: 0 };
      zoom = 1;
      temporaryCroppedAreaPixels = null;
      croppedAreaPixels = null;
      isApplied = false;
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
        croppedImageUrl = null;
      }
    } catch (err) {
      error = 'Failed to load image preview';
      imagePreview = null;
      temporaryCroppedAreaPixels = null;
      croppedAreaPixels = null;
    }
  }

  function handleFileInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      imageFile = file;
    }
  }

  function handleCropComplete(event: CropData) {
    temporaryCroppedAreaPixels = event.pixels;
  }

  async function applyCrop() {
    if (!imageFile || !temporaryCroppedAreaPixels) return;

    try {
      const croppedFile = await cropAndScaleImage(imageFile, temporaryCroppedAreaPixels);
      if (croppedImageUrl) {
        URL.revokeObjectURL(croppedImageUrl);
      }
      croppedImageUrl = URL.createObjectURL(croppedFile);
      croppedAreaPixels = temporaryCroppedAreaPixels;
      isApplied = true;
      error = null;
    } catch (err) {
      error = 'Failed to apply crop';
    }
  }

  function chooseDifferentFile() {
    reset();
    onFileChange(null);
    // Reset file input
    if (fileInput) {
      fileInput.value = '';
    }
  }

  function reset() {
    imagePreview = null;
    temporaryCroppedAreaPixels = null;
    croppedAreaPixels = null;
    isApplied = false;
    if (croppedImageUrl) {
      URL.revokeObjectURL(croppedImageUrl);
      croppedImageUrl = null;
    }
  }
</script>

{#if !imageFile}
  <!-- Step 1: Show file input -->
  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    onchange={handleFileInput}
    required
    class="file-input"
  />
{:else if imageFile && !isApplied && imagePreview}
  <!-- Step 2: Show cropper with buttons -->
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
  <div class="cropper-actions">
    <button type="button" onclick={chooseDifferentFile} class="btn-secondary btn-sm">
      Choose Another File
    </button>
    <button
      type="button"
      onclick={applyCrop}
      disabled={!temporaryCroppedAreaPixels}
      class="btn-primary btn-sm"
    >
      Apply Crop
    </button>
  </div>
{:else if isApplied && croppedImageUrl}
  <!-- Step 3: Show cropped image with change file button -->
  <div class="applied-image">
    <div class="preview-container">
      <img src={croppedImageUrl} alt="Cropped preview" />
    </div>
    <button type="button" onclick={chooseDifferentFile} class="btn-secondary btn-sm">
      Choose Another File
    </button>
  </div>
{/if}

<style>
  .file-input {
    padding: 0.75rem;
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    font-size: 1rem;
    width: 100%;
    background: var(--color-bg);
  }

  .file-input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  .cropper-container {
    width: 100%;
    height: 300px;
    margin-top: 1rem;
    margin-bottom: 1rem;
    position: relative;
    background-color: var(--color-bg-light);
    border: 1px solid var(--color-borders);
    border-radius: 4px;
    overflow: hidden;
  }

  .cropper-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .applied-image {
    margin-top: 1rem;
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .preview-container {
    width: 150px;
    height: 150px;
  }

  .preview-container img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-borders);
  }
</style>
