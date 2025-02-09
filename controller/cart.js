const Product = require("../models/product");
const User = require("../models/user");

exports.getCart = async (req, res, next) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId).populate("cart.items.product");
    res.send(user.cart.items);
  } catch (err) {
    throw err;
  }
};

exports.addToCart = async (req, res, next) => {
  let productId = req.body._id;
  try {
    const product = await Product.findById(productId);
    if (product) {
      const userId = req.userId;
      const user = await User.findById(userId);
      const status = await user.addToCart(product._id);
      return res.status(200).send(status);
    }
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    throw err;
  }
};

exports.deleteCartItem = (req, res, next) => {
  let productId = req.body._id;
  req.user
    .deleteItemFromCart(productId)
    .then((status) => {
      res.send(status);
    })
    .catch((err) => {
      res.send(false);
    });
};
