const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'itemlist',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(config);

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id INT PRIMARY KEY,
        value VARCHAR(255) NOT NULL,
        selected BOOLEAN DEFAULT false
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_order (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        position INT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id),
        UNIQUE (item_id)
      )
    `);

    const [rows] = await pool.query('SELECT COUNT(*) as count FROM items');
    
    if (rows[0].count === 0) {
      console.log('Initializing database with test data...');
      
      const batchSize = 1000;
      for (let i = 1; i <= 1000000; i += batchSize) {
        const values = [];
        const end = Math.min(i + batchSize - 1, 1000000);
        
        for (let j = i; j <= end; j++) {
          values.push(`(${j}, 'Item ${j}', false)`);
        }
        
        await pool.query(`
          INSERT INTO items (id, value, selected) 
          VALUES ${values.join(',')}
        `);
        
        if (i % 10000 === 1) {
          console.log(`Inserted ${end} records...`);
        }
      }
      
      console.log('Database initialization complete!');
    }
    
    console.log('Database is ready to use!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = {
  pool,
  initializeDatabase
}; 
