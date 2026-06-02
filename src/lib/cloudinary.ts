/**
 * Cloudinary Upload Utility
 * This handles uploading files to Cloudinary using the unsigned upload preset.
 */

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'placeholder';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'gdu_portal_uploads';

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
}

/**
 * Uploads a file to Cloudinary
 * @param file The file to upload
 * @param folder Optional folder name in Cloudinary
 * @returns The Cloudinary upload response
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder: string = 'general'
): Promise<CloudinaryUploadResponse> {
  if (CLOUDINARY_CLOUD_NAME === 'placeholder') {
    console.error('Cloudinary Cloud Name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME.');
    throw new Error('Cloudinary configuration missing');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `gdu-portal/${folder}`);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
}

/**
 * Helper to get a optimized image URL with Cloudinary transformations
 */
export function getOptimizedImageUrl(url: string, width?: number, height?: number): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  transformations.push('c_fill', 'g_auto', 'f_auto', 'q_auto');
  
  return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
}
