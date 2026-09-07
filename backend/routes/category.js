const express = require('express')
const router = express.Router()
const Category = require("../models/category")
const multer = require('multer')
const authMidlleware = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')

const storage = multer.diskStorage({
  destination: (req, file, cb)=> {
    cb(null, 'upload/category')
  },
  filename: (req, file, cb) => {
    const timeStamp = Date.now()
    const originalName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.]/g, "")
    cb(null, `${timeStamp}-${originalName}`)
  }
})
const filefilter = (req, file, cb) => {
  console.log('MIME:', file.mimetype)
  console.log('Original name:', file.originalname)

  const allowType = ['image/jpeg', 'image/png', 'image/gif']
  const ext = file.originalname.toLowerCase().split('.').pop()

  if (allowType.includes(file.mimetype) || ['jpg', 'jpeg', 'png', 'gif'].includes(ext) || file.mimetype === 'application/octet-stream') {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type only jpeg/jpg/png/gif'))
  }
}

const upload = multer({
  storage:storage,
  fileFilter: filefilter,
  limits: {fileSize: 2 * 1024 * 1024}
});
router.post("/",authMidlleware, checkRole("admin"), upload.single("icon") ,async (req, res) => {
  if(!req.body.name || !req.file) {
    return res.status(400).json({message: "Name and icon are required"})
  }
  console.log(req.file);

  const newCategory = new Category({
    name: req.body.name,
    image: req.file.filename
  })

  await newCategory.save()
  res.status(201).json({message: "Category created successfully", category: newCategory})
});

router.get('/', async (req, res) => {
  const categories = await Category.find().sort("name")
  res.json(categories)
})
module.exports = router