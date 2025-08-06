export interface Container {
  id: string;
  name: string;
  description: string | null;
  code?: string | null;
  isItem: boolean;
  userId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  children?: Container[];
}

export interface ContainerWithExtras extends Container {
  tags: string[];
  children?: Container[];
}