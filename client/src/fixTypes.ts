import { useQuery as useOriginalQuery } from '@tanstack/react-query';

export function useQuery(options: any) {
  if (options && 'keepPreviousData' in options) {
    const { keepPreviousData, ...rest } = options;
    if (keepPreviousData) {
      return useOriginalQuery({
        ...rest,
        placeholderData: (prev: any) => prev,
      });
    }
    return useOriginalQuery(rest);
  }
  
  return useOriginalQuery(options);
} 