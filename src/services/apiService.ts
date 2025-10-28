const API_ENDPOINT = 'https://eby9ngcjr6.execute-api.eu-west-1.amazonaws.com/dev/save-user-input-to-s3';

export interface UploadImagePayload {
  image_base64_cropped: string;
  image_base64: string;
}

export interface UploadImageResponse {
  success: boolean;
  message?: string;
  [key: string]: any;
}

/**
 * Uploads images to the S3 bucket via API Gateway
 */
export const uploadImages = async (
  payload: UploadImagePayload
): Promise<UploadImageResponse> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};