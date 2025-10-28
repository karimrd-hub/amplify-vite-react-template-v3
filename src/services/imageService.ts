// src/services/imageService.ts

/**
 * Compresses an image to reduce file size
 */
export const compressImage = (
  imageData: string,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Canvas context not available');
        return;
      }

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = imageData;
  });
};

/**
 * Crops the upper third of an image
 */
export const cropUpperThird = (imageData: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject('Canvas context not available');
        return;
      }

      const cropHeight = Math.floor(img.height / 3);
      canvas.width = img.width;
      canvas.height = cropHeight;

      ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);

      resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = reject;
    img.src = imageData;
  });
};

/**
 * Converts a data URL to base64 string (removes prefix)
 */
export const dataUrlToBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1];
};

/**
 * Calculates the approximate size of the payload in MB
 */
export const calculatePayloadSize = (base64Strings: string[]): number => {
  const totalLength = base64Strings.reduce((sum, str) => sum + str.length, 0);
  return (totalLength * 0.75) / (1024 * 1024);
};