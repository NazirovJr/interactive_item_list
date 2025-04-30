import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useQuery } from '../fixTypes';
import { fetchItems, updateSelection, updateOrder } from '../api';
import { Item } from '../types';

const ItemList: React.FC = () => {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [customOrder, setCustomOrder] = useState<number[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['items', page, search],
    queryFn: () => fetchItems(page, 20, search),
    keepPreviousData: true,
  });

  useEffect(() => {
    if (data) {
      if (page === 0) {
        setItems(data.items);
      } else {
        setItems(prev => [...prev, ...data.items]);
      }
    }
  }, [data, page]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1,
    };

    observer.current = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting && data?.hasMore && !isFetching) {
        setPage(prev => prev + 1);
      }
    }, options);

    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [data?.hasMore, isFetching]);

  useEffect(() => {
    const savedSelected = localStorage.getItem('selectedItems');
    const savedOrder = localStorage.getItem('customOrder');
    
    if (savedSelected) {
      try {
        const parsed = JSON.parse(savedSelected);
        setSelectedItems(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse selected items from localStorage');
      }
    }
    
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        setCustomOrder(parsed);
      } catch (e) {
        console.error('Failed to parse custom order from localStorage');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedItems', JSON.stringify([...selectedItems]));
  }, [selectedItems]);

  useEffect(() => {
    localStorage.setItem('customOrder', JSON.stringify(customOrder));
  }, [customOrder]);

  const handleSelectItem = useCallback((id: number, checked: boolean) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []);

  const selectionMutation = useMutation({
    mutationFn: ({ ids, selected }: { ids: number[], selected: boolean }) =>
      updateSelection(ids, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const orderMutation = useMutation({
    mutationFn: (order: number[]) => updateOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(0);
    setItems([]);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [reorderedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, reorderedItem);

    setItems(reorderedItems);

    const newOrder = reorderedItems.map(item => item.id);
    setCustomOrder(newOrder);
    orderMutation.mutate(newOrder);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedItems);
      items.forEach(item => newSelected.add(item.id));
      setSelectedItems(newSelected);
      selectionMutation.mutate({ 
        ids: items.map(item => item.id), 
        selected: true 
      });
    } else {
      const newSelected = new Set(selectedItems);
      items.forEach(item => newSelected.delete(item.id));
      setSelectedItems(newSelected);
      selectionMutation.mutate({ 
        ids: items.map(item => item.id), 
        selected: false 
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search items..."
          className="search-input"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          className="mr-2 h-5 w-5"
          onChange={(e) => handleSelectAll(e.target.checked)}
          checked={items.length > 0 && items.every(item => selectedItems.has(item.id))}
          indeterminate={items.some(item => selectedItems.has(item.id)) && !items.every(item => selectedItems.has(item.id))}
        />
        <span className="select-all-text">Select All</span>
        <div className="ml-4">
          {selectedItems.size > 0 && (
            <span className="text-blue-600">{selectedItems.size} items selected</span>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="items">
          {(provided) => (
            <div
              className="bg-white rounded-lg shadow overflow-hidden"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`p-3 border-b border-gray-200 flex items-center ${
                        selectedItems.has(item.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-3 h-5 w-5"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          handleSelectItem(item.id, e.target.checked);
                          selectionMutation.mutate({
                            ids: [item.id],
                            selected: e.target.checked
                          });
                        }}
                      />
                      <div className="flex-1">
                        <span className="text-gray-700">{item.value}</span>
                      </div>
                      <div className="flex items-center ml-2 text-gray-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {isLoading && (
                <div className="p-4 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]"></div>
                </div>
              )}
              {data?.hasMore && !isLoading && (
                <div ref={loadingRef} className="p-3 text-center text-gray-500">
                  Loading more items...
                </div>
              )}
              {items.length === 0 && !isLoading && (
                <div className="p-4 text-center text-gray-500">
                  No items found
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default ItemList; 
