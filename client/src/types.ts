export interface Item {
  id: number;
  value: string;
  selected: boolean;
}

export interface ItemsResponse {
  items: Item[];
  hasMore: boolean;
  total: number;
} 