import axios from 'axios';
import { ItemsResponse } from './types';

const API_URL = 'http://localhost:3001/api';

export const fetchItems = async (page: number, limit: number, search: string = ''): Promise<ItemsResponse> => {
  const response = await axios.get(`${API_URL}/items`, {
    params: { page, limit, search }
  });
  return response.data;
};

export const updateSelection = async (ids: number[], selected: boolean): Promise<void> => {
  await axios.put(`${API_URL}/items/select`, { ids, selected });
};

export const updateOrder = async (order: number[]): Promise<void> => {
  await axios.put(`${API_URL}/items/order`, { order });
}; 
