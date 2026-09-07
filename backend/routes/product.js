const express = require('express');
const authMidlleware = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const Category = require('../models/category')
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const Product = require('../models/product');
const { nextTick } = require('process');
const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb)=> {
    cb(null, 'upload/products')
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

router.post("/", authMidlleware, checkRole("seller"),upload.array("images", 8),async (req, res) => {
 const { title, description, category, price, stock } = req.body
 const images = req.files.map((image) => image.filename)

 if(images.length === 0) {
  return res.status(400).json({message: "Atleast one image is required"})
 }

 const newProduct = new Product({
  title,
  description,
  category,
  price,
  stock,
  images,
  seller: req.user._id
 })

 await newProduct.save();
 res.status(201).json(newProduct)
});

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const perPage = parseInt(req.query.perPage) || 8
  const queryCategory = req.query.category || null;
  const querySearch = req.query.search || null;
  let query = {}
  if(queryCategory) {
    const category = await Category.findOne({name: queryCategory})

    if(!category) {
      return res.status(404).json({message: "Category not found"})
    }
    query.category = category._id;
  }
  if(querySearch) {
    query.title = { $regex: querySearch, $options: "i" }
  }

  const products = await Product.find(query)
  .select("-description -seller -category -__v")
  .sort({ createdAt: -1, _id: -1 })
  .skip((page - 1) * perPage)
  .limit(perPage)
  .lean();

  const updatedProducts = products.map((product) => {
    const normalizedImages = Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : product.images ? [product.images] : [];
    const reviewList = Array.isArray(product.review) ? product.review : [];
    const numberOfReviews = reviewList.length;
    const sumOfRating = reviewList.reduce((sum, review) => sum + (review?.rating || 0), 0);
    const averageRating = sumOfRating / (numberOfReviews || 1);

    return {
      ...product,
      images: normalizedImages[0] || "",
      review: { numberOfReviews, averageRating },
    }
  });
  const totalProducts = await Product.countDocuments(query)
  const totalPages = Math.ceil(totalProducts/perPage)
  res.json({
    products: updatedProducts,
    totalProducts: totalProducts,
    totalPages,
    currentPage: page,
    postPerPage: perPage
  });
})

router.get('/suggestions',async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    if (!search) return res.json([]);
    const products = await Product.find({
      title: { $regex: search, $options: "i" },
    })
    .select("_id title")
    .limit(10)
    res.json(products)
    
  } catch (error) {
    next(error)
  }

})

router.get("/:id", async (req, res) => {
  const id = req.params.id;

  const product = await Product.findById(id).populate("seller", "_id name email").populate("review.user", "_id name email").select("-category -__v");

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  const normalizedImages = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : product.images ? [product.images] : [];

  res.json({
    ...product.toObject(),
    images: normalizedImages,
  });
});

router.delete("/:id", authMidlleware, async(req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId).select("seller images");
  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }
  if(req.user.role === "admin" || (req.user.role === "seller" && req.user._id.toString() === product.seller.toString())){
    await product.deleteOne()

    if(product.images && product.images.length > 0) {
      product.images.forEach(async (imageName) => {
        const fullPath = path.join(__dirname, "../upload/products", imageName)

        try {
          await fs.unlink(fullPath)
          
        } catch (error) {
            console.error(`Error deleting file ${fullPath}`, error)
        }
      })
    }
      


    return res.json({message: "Deleted successfully"})
  }
  return res.status(403).json({message: "Access denied: only admin and seller are allow to delete product"})
})

module.exports = router




