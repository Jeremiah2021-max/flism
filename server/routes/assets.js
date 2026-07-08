const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { notifyAdmins } = require('../lib/notifyAdmins');
const { validate, assetSchema } = require('../middleware/validation');
const logger = require('../lib/logger');
const upload = require('../middleware/upload');

const router = express.Router();

// Upload asset images
router.post('/upload', authMiddleware, upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
  logger.info('Images uploaded', { userId: req.userId, count: req.files.length });
  res.json({ images: imageUrls });
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM assets WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching assets', { error: err.message, userId: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM assets WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching asset', { error: err.message, assetId: req.params.id, userId: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, validate(assetSchema), async (req, res) => {
  const { type, description, serial_number, estimated_value, brand, model, condition, images } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO assets (user_id, type, description, serial_number, estimated_value, brand, model, condition, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.userId, type, description || null, serial_number || null, estimated_value, brand || null, model || null, condition || 'good', images || []]
    );
    const asset = result.rows[0];
    
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req.userId, 'Asset Submitted', `Your ${brand ? brand + ' ' : ''}${type} has been submitted for review.`, 'info']
    );
    
    const userRow = await pool.query('SELECT full_name, university FROM users WHERE id = $1', [req.userId]);
    const u = userRow.rows[0];
    await notifyAdmins(
      '📦 New Asset Submitted',
      `${u.full_name} (${u.university}) submitted a ${brand ? brand + ' ' : ''}${type} valued at GHS ${parseFloat(estimated_value).toFixed(2)}.`,
      'info'
    );

    logger.info('Asset submitted', { assetId: asset.id, userId: req.userId, type, value: estimated_value });
    res.status(201).json(asset);
  } catch (err) {
    logger.error('Error creating asset', { error: err.message, userId: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { type, description, serial_number, estimated_value, brand, model, condition, images } = req.body;
  try {
    const result = await pool.query(
      `UPDATE assets 
       SET type = COALESCE($1, type),
           description = COALESCE($2, description),
           serial_number = COALESCE($3, serial_number),
           estimated_value = COALESCE($4, estimated_value),
           brand = COALESCE($5, brand),
           model = COALESCE($6, model),
           condition = COALESCE($7, condition),
           images = COALESCE($8, images)
       WHERE id = $9 AND user_id = $10 AND status = 'pending'
       RETURNING *`,
      [type, description, serial_number, estimated_value, brand, model, condition, images, req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found or cannot be edited' });
    logger.info('Asset updated', { assetId: req.params.id, userId: req.userId });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating asset', { error: err.message, assetId: req.params.id, userId: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM assets WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING *`,
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Asset not found or cannot be deleted' });
    logger.info('Asset deleted', { assetId: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    logger.error('Error deleting asset', { error: err.message, assetId: req.params.id, userId: req.userId });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;