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

export interface PronunciationExample {
  id: string;
  public_figure_id: string;
  youtube_video_id: string;
  start_timestamp: number;
  end_timestamp: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  public_figure?: PublicFigure;
}

export interface NewPronunciationExample {
  public_figure_id: string;
  youtube_video_id: string;
  start_timestamp: number;
  end_timestamp: number;
}
