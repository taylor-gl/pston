export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropData {
  percent: any;
  pixels: CropPixels;
}

export async function cropAndScaleImage(
  imageFile: File,
  croppedAreaPixels: CropPixels
): Promise<File> {
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

export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}
