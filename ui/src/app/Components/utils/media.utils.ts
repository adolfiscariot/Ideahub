import { MediaType } from '../../Interfaces/Media/media-interface'

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function detectMediaType(file: File): MediaType {
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));

  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(extension)) {
    return MediaType.Image;
  }

  if (['.mp4', '.mov', '.avi', '.wmv'].includes(extension)) {
    return MediaType.Video;
  }

  return MediaType.Document;
}

export function processSelectedFiles(
  event: Event,
  existingFiles: File[],
  maxSizeMB = 20
): { files: File[]; errors: string[] } {
  const input = event.target as HTMLInputElement;
  if (!input.files) return { files: existingFiles, errors: [] };

  const errors: string[] = [];
  const updatedFiles = [...existingFiles];

  for (const file of Array.from(input.files)) {
    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`${file.name} exceeds ${maxSizeMB}MB limit`);
      continue;
    }

    updatedFiles.push(file);
  }

  input.value = '';

  return { files: updatedFiles, errors };
}

export function removeFileAtIndex(files: File[], index: number): File[] {
  const updatedFiles = [...files];
  updatedFiles.splice(index, 1);
  return updatedFiles;
}
