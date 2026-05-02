import { supabase } from './supabase';

export const BUCKET_NAME = 'cuestionarios';
export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadImageResult {
  success: boolean;
  publicUrl?: string;
  path?: string;
  error?: string;
}

/**
 * Sube una imagen a Supabase Storage
 * @param file Archivo de imagen
 * @param folder Carpeta dentro del bucket (ej: 'preguntas', 'opciones')
 * @returns URL pública o error
 */
export async function uploadImageToStorage(
  file: File,
  folder: string
): Promise<UploadImageResult> {
  try {
    // Validar formato
    if (!ALLOWED_FORMATS.includes(file.type)) {
      return {
        success: false,
        error: 'Formato no permitido. Usa JPG, PNG o WEBP.',
      };
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `Archivo muy grande. Máximo 3 MB. Tu archivo: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      };
    }

    // Generar nombre único para la imagen
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = file.type.split('/')[1];
    const fileName = `${timestamp}_${random}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    // Subir a Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return {
        success: false,
        error: `Error al subir: ${uploadError.message}`,
      };
    }

    // Obtener URL pública
    const publicUrlData = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath).data;

    return {
      success: true,
      publicUrl: publicUrlData.publicUrl,
      path: filePath,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido al subir imagen',
    };
  }
}

/**
 * Elimina una imagen de Supabase Storage
 * @param filePath Ruta completa del archivo
 */
export async function deleteImageFromStorage(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error al eliminar imagen:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error:', err);
    return false;
  }
}
