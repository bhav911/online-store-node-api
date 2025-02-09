const deleteFile = require("../util/fileHelper");
const io = require("../socket");

const Product = require("../models/product");
const { validationResult } = require("express-validator");

const Products_Per_Page = 2;

exports.postAddProduct = async (req, res, next) => {
  let errors = validationResult(req);

  if (!errors.isEmpty()) {
    let field = errors.array()[0];
    let errorData = { message: field.msg, field: field.path };
    let error = new Error();
    error.error = errorData;
    error.statusCode = 422;
    throw error;
  }
  let productInfo = req.body;
  const title = productInfo.title;
  const image = req.file;
  const price = productInfo.price;
  const description = productInfo.description;

  const product = new Product({
    title: title,
    description: description,
    price: price,
    imageUrl: "/" + image.path,
    userId: req.userId,
  });
  try {
    const status = await product.save();
    io.getIO().emit("products", { action: "create", product });
    return res.send(status);
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    err.error = { message: "Something went wrong" };
    next(err);
  }
};

exports.postUpdateProduct = async (req, res, next) => {
  let _id = req.params._id;
  let productInfo = req.body;
  const title = productInfo.title;
  const image = req.file;
  const price = productInfo.price;
  const description = productInfo.description;
  try {
    const product = await Product.findById(_id);

    if (product.userId.toString() !== req.userId) {
      const error = new Error("Invalid Request");
      error.statusCode = 401;
      throw error;
    }

    product.title = title;
    product.description = description;
    product.price = price;
    if (image) {
      deleteFile(product.imageUrl);
      product.imageUrl = "/" + image.path;
    }

    const result = await product.save();
    console.log(result);

    io.getIO().emit("products", { action: "update", product: result });
    res.send(result);
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postDeleteProduct = async (req, res, next) => {
  let productId = req.body._id;
  try {
    const product = await Product.findOne({
      _id: productId,
      userId: req.userId,
    });
    deleteFile(product.imageUrl);
    const status = await product.deleteOne(this);
    let isDeleted = status.deletedCount > 0;
    if (isDeleted) {
      io.getIO().emit("products", { action: "delete", productId });
      return res.status(200).json("Product deleted!");
    } else {
      const error = new Error("Invalid request!");
      error.statusCode = 401;
      throw error;
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getProduct = (req, res, next) => {
  let productId = req.params._id;
  Product.findById(productId)
    .then((product) => {
      res.send(product);
    })
    .catch((err) => {
      res.send(false);
    });
};

exports.getProducts = (req, res, next) => {
  let url = req.url;
  let page = req.query.page ?? 1;
  let filter = {};
  if (url === "/products") {
    filter = {
      userId: req.user._id,
    };
  }

  Product.find(filter)
    .skip((page - 1) * Products_Per_Page)
    .limit(Products_Per_Page)
    .then((products) => {
      Product.countDocuments().then((productCount) => {
        res.send({ products, productCount });
      });
    })
    .catch((err) => {
      res.send(false);
    });
};
