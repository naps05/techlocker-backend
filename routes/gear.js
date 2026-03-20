const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Gear = require('../models/Gear');
const authMiddleware = require('../middleware/auth');

// Multer setup for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const isValid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET all gear for logged in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const gears = await Gear.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(gears);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET single gear
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const gear = await Gear.findOne({ _id: req.params.id, user: req.user.id });
    if (!gear) {
      return res.status(404).json({ message: 'Gear not found' });
    }
    res.json(gear);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create gear
router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { name, model, serialNumber, ownerName } = req.body;

    const photoUrl = req.file
      ? `http://localhost:3000/uploads/${req.file.filename}`
      : null;

    const gear = await Gear.create({
      name,
      model,
      serialNumber,
      ownerName,
      photoUrl,
      user: req.user.id
    });

    res.status(201).json(gear);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update gear
router.put('/:id', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { name, model, serialNumber, ownerName } = req.body;

    const gear = await Gear.findOne({ _id: req.params.id, user: req.user.id });
    if (!gear) {
      return res.status(404).json({ message: 'Gear not found' });
    }

    gear.name = name;
    gear.model = model;
    gear.serialNumber = serialNumber;
    gear.ownerName = ownerName;

    if (req.file) {
      gear.photoUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    await gear.save();
    res.json(gear);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE gear
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const gear = await Gear.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!gear) {
      return res.status(404).json({ message: 'Gear not found' });
    }
    res.json({ message: 'Gear deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;