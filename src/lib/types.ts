export interface PublicFigure {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_filename: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NewPublicFigure {
  name: string;
  description: string;
  image: File;
}
