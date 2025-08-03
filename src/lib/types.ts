export interface PublicProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  setup_completed?: boolean;
  terms_accepted_at?: string | null;
}

export interface PublicFigure {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_filename: string | null;
  photo_attribution: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  creator_profile?: PublicProfile | null;
}

export interface NewPublicFigure {
  name: string;
  description: string;
  image: File;
  photo_attribution?: string;
}

export interface PronunciationExample {
  id: string;
  public_figure_id: string;
  youtube_video_id: string;
  start_timestamp: number;
  end_timestamp: number;
  description?: string | null;
  upvotes: number;
  downvotes: number;
  wilson_score: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  public_figure?: PublicFigure;
  user_vote?: PronunciationExampleVote | null;
  creator_profile?: PublicProfile | null;
}

export interface NewPronunciationExample {
  public_figure_id: string;
  youtube_video_id: string;
  start_timestamp: number;
  end_timestamp: number;
  description?: string;
}

export interface PronunciationExampleVote {
  id: string;
  pronunciation_example_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
  updated_at: string;
}

export interface NewPronunciationExampleVote {
  pronunciation_example_id: string;
  vote_type: 'upvote' | 'downvote';
  user_id?: string;
}
