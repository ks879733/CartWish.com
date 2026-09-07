require('dotenv').config()

const PORT = process.env.PORT || 5000
const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const cookieParser = require('cookie-parser')
const path = require('path')
const cors = require('cors');

const userRouter = require('./routes/users')
const categoryRouter = require('./routes/category')
const productRouter = require('./routes/product')
const adminRouter = require('./routes/admin');
const cartRouter = require('./routes/cart');
const orderRouter = require('./routes/order');
const addressRouter = require('./routes/address')

const app = express();

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(), winston.format.json()
  ),
  transports: [new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/mylogs.log",
    }),
  ],
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", err);
  logger.on("finish", () => {
    process.exit(1);
    
  });
  logger.end();
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Promise Rejection", err);
  logger.on("finish", () => {
    process.exit(1);
    
  });
  logger.end();
});



mongoose.connect(process.env.DB_ID)
.then(()=>logger.info("Databse is connected successfully"))
.catch((err)=>{
  logger.error("database connection failde", err)
  logger.on("finish", () => {
    process.exit(1);   
  });
  logger.end();
});

app.use(express.json())
app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(cookieParser())

app.use("/upload/category", express.static(path.join(__dirname, "upload/category")));
app.use("/upload/products", express.static(path.join(__dirname, "upload/products")));
app.use("/api/user", userRouter);
app.use('/api/category', categoryRouter);
app.use('/api/products', productRouter);
app.use('/api/admin', adminRouter);
app.use("/api/cart", cartRouter)
app.use("/api/order", orderRouter);
app.use("/api/address", addressRouter);
app.use((error, req, res, next) => {
  console.log('Error middleware is running');
  logger.error(error.message, {
    method: req.method,
    path: req.originalUrl,
    stack: error.stack,
  })
  return res.status(500).json({message: "Interal server error"})
});


app.listen(PORT, () => {
  logger.info(`Server is running on port number : ${PORT}`);
})