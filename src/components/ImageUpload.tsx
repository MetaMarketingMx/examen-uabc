'use client';

import React, { useState, useRef } from 'react';
import { uploadImageToStorage } from '@/lib/storage';

interface ImageUploadProps {
  label: string;
  value?: string; // URL pública de la imagen
  onChange: (publicUrl: string | null) => void;
  onError?: (error: string) => void;
  folder: string; // Carpeta en Storage
  accept?: string;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  onError,
  folder,
  accept = 'image/jpeg,image/png,image/webp',
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Mostrar preview local inmediatamente
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir a Storage
      const result = await uploadImageToStorage(file, folder);

      if (result.success && result.publicUrl) {
        onChange(result.publicUrl);
      } else {
        const errorMsg = result.error || 'Error desconocido';
        setError(errorMsg);
        onError?.(errorMsg);
        setPreview(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al procesar imagen';
      setError(errorMsg);
      onError?.(errorMsg);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    onChange(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
      </label>

      {/* Preview */}
      {preview && (
        <div className="relative rounded-lg border border-slate-700 overflow-hidden bg-slate-800/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="absolute top-2 right-2 px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Area */}
      {!preview && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative rounded-lg border-2 border-dashed border-slate-600 hover:border-sky-500 bg-slate-800/30 hover:bg-slate-800/50 p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />

          <div className="space-y-2">
            <div className="text-3xl">📷</div>
            <p className="text-sm text-slate-400">
              {loading ? 'Cargando...' : 'Haz clic para seleccionar imagen'}
            </p>
            <p className="text-xs text-slate-500">
              JPG, PNG o WEBP · Máx 3 MB
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/50 text-red-300 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
