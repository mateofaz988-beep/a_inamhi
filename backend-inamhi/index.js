const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la conexión a MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root', // Ingresa tu contraseña
  database: 'inemhi' // Ingresa el nombre de tu BD
});

db.connect(err => {
  if (err) throw err;
  console.log('Conectado a MySQL');
});

// GET: Obtener los usuarios para llenar la tabla
app.get('/api/trabajadores', (req, res) => {
  const sql = 'SELECT * FROM usuarios'; // Ajusta el nombre de tu tabla
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// DELETE: Eliminar un usuario por ID
app.delete('/api/trabajadores/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM usuarios WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Usuario eliminado exitosamente' });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});