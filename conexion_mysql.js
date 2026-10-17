const { Pool } = require('pg');
require('dotenv').config();

// Si existe DATABASE_URL (Render), la usamos directamente; si no, usamos la configuración individual
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Necesario para Supabase
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'postgres',
      port: process.env.DB_PORT || 5432,
      ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false
    };

const conexion = new Pool(poolConfig);

// Comprobar la conexión inicial
conexion.connect((err, client, release) => {
  if (err) {
    return console.error('Error al conectar con la base de datos:', err.stack);
  }
  console.log('¡Conexión exitosa a la base de datos PostgreSQL!');
  release();
});

module.exports = conexion;