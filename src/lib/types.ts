export interface PublicFigure {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NewPublicFigure {
  name: string;
  description: string;
  image: File;
}

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
