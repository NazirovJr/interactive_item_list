const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { pool, initializeDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Обрабатываем запрос на получение элементов с пагинацией
app.get('/api/items', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    
    let result;
    
    if (search) {
      const [filtered] = await pool.query(
        `SELECT * FROM items 
         WHERE value LIKE ? 
         ORDER BY id
         LIMIT ? OFFSET ?`,
        [`%${search}%`, limit, page * limit]
      );
      
      const [countResult] = await pool.query(
        `SELECT COUNT(*) as total FROM items WHERE value LIKE ?`,
        [`%${search}%`]
      );
      
      const total = countResult[0].total;
      
      res.json({
        items: filtered,
        hasMore: total > (page * limit) + limit,
        total: total
      });
    } else {
      const [orderCount] = await pool.query(
        `SELECT COUNT(*) as count FROM user_order`
      );
      
      if (orderCount[0].count > 0) {
        if (page === 0) {
          const [orderedItems] = await pool.query(
            `SELECT i.* FROM items i
             JOIN user_order uo ON i.id = uo.item_id
             ORDER BY uo.position
             LIMIT ?`,
            [limit]
          );

          if (orderedItems.length < limit) {
            const remaining = limit - orderedItems.length;
            const [remainingItems] = await pool.query(
              `SELECT i.* FROM items i
               WHERE i.id NOT IN (SELECT item_id FROM user_order)
               ORDER BY i.id
               LIMIT ?`,
              [remaining]
            );
            
            result = [...orderedItems, ...remainingItems];
          } else {
            result = orderedItems;
          }
        } else {
          const [orderedCount] = await pool.query(
            `SELECT COUNT(*) as count FROM user_order`
          );
          
          const orderedItemsCount = orderedCount[0].count;
          const orderedItemsRemaining = Math.max(0, orderedItemsCount - limit);

          if (page === 1 && orderedItemsRemaining > 0) {
            const [nextOrderedItems] = await pool.query(
              `SELECT i.* FROM items i
               JOIN user_order uo ON i.id = uo.item_id
               ORDER BY uo.position
               LIMIT ? OFFSET ?`,
              [Math.min(limit, orderedItemsRemaining), limit]
            );

            if (nextOrderedItems.length < limit) {
              const remaining = limit - nextOrderedItems.length;
              const [remainingItems] = await pool.query(
                `SELECT i.* FROM items i
                 WHERE i.id NOT IN (SELECT item_id FROM user_order)
                 ORDER BY i.id
                 LIMIT ?`,
                [remaining]
              );
              
              result = [...nextOrderedItems, ...remainingItems];
            } else {
              result = nextOrderedItems;
            }
          } else {
            // Для остальных страниц - стандартная пагинация остальных элементов
            const effectivePage = page - (orderedItemsRemaining > 0 ? 2 : 1);
            const offset = effectivePage * limit;

            const [items] = await pool.query(
              `SELECT i.* FROM items i
               WHERE i.id NOT IN (SELECT item_id FROM user_order)
               ORDER BY i.id
               LIMIT ? OFFSET ?`,
              [limit, offset]
            );
            
            result = items;
          }
        }

        const [countResult] = await pool.query(
          `SELECT COUNT(*) as total FROM items`
        );
        
        const total = countResult[0].total;
        const [orderedCountResult] = await pool.query(
          `SELECT COUNT(*) as count FROM user_order`
        );
        const orderedCount = orderedCountResult[0].count;
        const remainingCount = total - orderedCount;
        
        let hasMore;
        if (page === 0) {
          hasMore = orderedCount > limit;
        } else if (page === 1 && orderedCount > limit) {
          const orderedRemaining = orderedCount - limit;
          hasMore = orderedRemaining + remainingCount > limit;
        } else {
          const effectivePage = page - (orderedCount > limit ? 2 : 1);
          hasMore = remainingCount > effectivePage * limit + limit;
        }
        
        res.json({
          items: result,
          hasMore: hasMore,
          total: total
        });
      } else {
        const [items] = await pool.query(
          `SELECT * FROM items ORDER BY id LIMIT ? OFFSET ?`,
          [limit, page * limit]
        );
        
        const [countResult] = await pool.query(
          `SELECT COUNT(*) as total FROM items`
        );
        
        const total = countResult[0].total;
        
        res.json({
          items: items,
          hasMore: total > (page * limit) + limit,
          total: total
        });
      }
    }
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление статуса выбора элементов
app.put('/api/items/select', async (req, res) => {
  try {
    const { ids, selected } = req.body;
    
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    if (ids.length === 0) {
      return res.json({ success: true });
    }
    
    await pool.query(
      `UPDATE items SET selected = ? WHERE id IN (?)`,
      [selected, ids]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating selection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление пользовательского порядка элементов
app.put('/api/items/order', async (req, res) => {
  try {
    const { order } = req.body;
    
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      await connection.query('DELETE FROM user_order');
      
      if (order.length > 0) {
        const values = order.map((itemId, index) => [itemId, index]);
        await connection.query(
          'INSERT INTO user_order (item_id, position) VALUES ?',
          [values]
        );
      }
      
      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Инициализируем базу данных при запуске сервера
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 
