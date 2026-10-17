const { Pool } = require('pg');
require('dotenv').config();

const conexion = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false // Necesario para la conexión segura con Supabase
  }
});

// Comprobar la conexión inicial
conexion.connect((err, client, release) => {
  if (err) {
    return console.error('Error al conectar con la base de datos en Supabase:', err.stack);
  }
  console.log('¡Conexión exitosa a la base de datos PostgreSQL en Supabase!');
  release();
});

module.exports = conexion;