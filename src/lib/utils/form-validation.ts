import { extractYouTubeVideoId } from '$lib/services/pronunciation-examples';

export interface NewFigureFormData {
  name: string;
  description: string;
  imageFile: File | null;
  croppedAreaPixels: any;
}

export interface PronunciationExampleFormData {
  youtubeUrl: string;
  startTimestamp: number;
  endTimestamp: number;
  description: string;
}

export function validateNewFigure(formData: NewFigureFormData): string | null {
  if (!formData.name.trim()) {
    return 'Name is required for new public figures';
  }
  if (!formData.description.trim()) {
    return 'Description is required for new public figures';
  }
  if (!formData.imageFile) {
    return 'Photo is required for new public figures';
  }
  if (!formData.croppedAreaPixels) {
    return 'Please crop the image first';
  }
  return null;
}

export function validatePronunciationExample(
  formData: PronunciationExampleFormData
): string | null {
  const videoId = extractYouTubeVideoId(formData.youtubeUrl);
  if (!videoId) {
    return 'Please enter a valid YouTube URL or video ID';
  }

  if (formData.startTimestamp >= formData.endTimestamp) {
    return 'End timestamp must be greater than start timestamp';
  }

  if (formData.startTimestamp < 0 || formData.endTimestamp < 0) {
    return 'Timestamps must be positive numbers';
  }

  return null;
}
