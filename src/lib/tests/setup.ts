import { vi } from 'vitest';

vi.mock('$lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn().mockImplementation((filename) => ({
          data: { publicUrl: `https://example.com/${filename}` },
        })),
      })),
    },
  },
}));

vi.mock('$app/environment', () => ({
  dev: true,
}));
