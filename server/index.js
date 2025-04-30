const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Generate items from 1 to 1,000,000
const generateItems = () => {
  const items = [];
  for (let i = 1; i <= 1000000; i++) {
    items.push({
      id: i,
      value: `Item ${i}`,
      selected: false
    });
  }
  return items;
};

// In-memory data store
let items = generateItems();
let userOrder = [];

// Get items with pagination
app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  
  let result;
  
  if (search) {
    const filtered = items.filter(item =>
      item.value.toLowerCase().includes(search.toLowerCase())
    );
    
    // Apply pagination to filtered results
    result = filtered.slice(page * limit, (page * limit) + limit);
    
    res.json({
      items: result,
      hasMore: filtered.length > (page * limit) + limit,
      total: filtered.length
    });
  } else if (userOrder.length > 0) {
    const orderedIds = new Set(userOrder);
    const orderedItems = userOrder.map(id => items.find(item => item.id === id));
    
    const remainingItems = items.filter(item => !orderedIds.has(item.id));
    
    if (page === 0) {
      const firstPageOrderedItems = orderedItems.slice(0, limit);
      
      if (firstPageOrderedItems.length < limit) {
        const remainingNeeded = limit - firstPageOrderedItems.length;
        const firstPageRemainingItems = remainingItems.slice(0, remainingNeeded);
        result = [...firstPageOrderedItems, ...firstPageRemainingItems];
      } else {
        result = firstPageOrderedItems;
      }
    } else {
      const orderedItemsRemaining = Math.max(0, orderedItems.length - limit);
      
      if (page === 1 && orderedItemsRemaining > 0) {
        const nextOrderedItems = orderedItems.slice(limit);
        
        if (nextOrderedItems.length < limit) {
          const remainingNeeded = limit - nextOrderedItems.length;
          const nextRemainingItems = remainingItems.slice(0, remainingNeeded);
          result = [...nextOrderedItems, ...nextRemainingItems];
        } else {
          result = nextOrderedItems.slice(0, limit);
        }
      } else {
        const effectivePage = page - (orderedItemsRemaining > 0 ? 2 : 1);
        const startIndex = effectivePage * limit;
        result = remainingItems.slice(startIndex, startIndex + limit);
      }
    }
    
    res.json({
      items: result,
      hasMore: (page === 0 && orderedItems.length > limit) || 
               (page === 1 && orderedItemsRemaining > 0 && orderedItemsRemaining + remainingItems.length > limit) ||
               (remainingItems.length > ((page - (orderedItemsRemaining > 0 ? 2 : 1)) * limit + limit)),
      total: items.length
    });
  } else {
    result = items.slice(page * limit, (page * limit) + limit);
    
    res.json({
      items: result,
      hasMore: items.length > (page * limit) + limit,
      total: items.length
    });
  }
});

// Update item selection status
app.put('/api/items/select', (req, res) => {
  const { ids, selected } = req.body;
  
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }
  
  items = items.map(item => {
    if (ids.includes(item.id)) {
      return { ...item, selected };
    }
    return item;
  });
  
  res.json({ success: true });
});

// Update item order
app.put('/api/items/order', (req, res) => {
  const { order } = req.body;
  
  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }
  
  userOrder = order;
  
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
