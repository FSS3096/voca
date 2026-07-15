export interface Draft {
  id: string | number;
  text: string;
  style?: 'raw' | 'polished' | 'short';
}

export interface GenerationResult {
  noActivity: boolean;
  drafts: Draft[];
  metadata?: {
    repoFullName: string;
    generatedAt: string;
  };
}
