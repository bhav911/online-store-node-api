const User = require("../models/user");
const Product = require("../models/product");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { deleteFile } = require("../util/fileHelper");
const { sendEmail } = require("../util/emailHelper");
const { validateUserInput } = require("./validators/userInputValidator");
const { validateProductInput } = require("./validators/productInputValidator");
const Order = require("../models/order");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const Products_Per_Page = 5;

module.exports = {
  // User Related
  createUser: async function ({ userInput }, req) {
    validateUserInput(userInput, "signup");

    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      const error = new Error("User Already Exist!");
      error.code = 403;
      throw error;
    }
    try {
      const hashedPw = await bcrypt.hash(userInput.password, 12);
      const user = new User({
        email: userInput.email,
        password: hashedPw,
        cart: {
          items: [],
        },
      });

      const createdUser = await user.save();
      return createdUser.email;
    } catch (err) {
      if (!err.code) {
        err.code = 500;
      }
      throw err;
    }
  },

  login: async function (userInput) {
    let email = userInput.email;
    let password = userInput.password;

    validateUserInput(userInput, "login");

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid email or password!");
      error.code = 401;
      throw error;
    }
    const doMatch = await bcrypt.compare(password, user.password);
    if (!doMatch) {
      const error = new Error("Invalid email or password!");
      error.code = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "chaddi ma kaanu",
      {
        expiresIn: "1h",
      }
    );

    return { token, userId: user._id.toString(), email: user.email };
  },

  authStatus(_, req) {
    if (!req.isAuth) {
      return null;
    }
    return req.userId;
  },

  sendPassResetMail: async function ({ email }, req) {
    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("User Not Found");
      error.code = 404;
      throw error;
    }
    const tokenBuffer = crypto.randomBytes(32);
    const resetToken = tokenBuffer.toString("hex");
    if (!resetToken) {
      const error = new Error("Something Went Wrong");
      error.code = 500;
      throw error;
    }
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000;
    const savedUser = await user.save();
    if (savedUser) {
      let template_variable = {
        name: user.email,
        product_name: "Our Shop",
        action_url: `http://localhost:4200/reset-password/${resetToken}`,
      };
      let template_ID = 38864483;
      sendEmail(user.email, template_ID, template_variable);
      return user.email;
    }
  },

  async validatePassResetToken({ token }) {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });
    if (!user) {
      const error = new Error("Invalid request!");
      error.code = 401;
      throw error;
    }
    return user._id.toString();
  },

  async resetPassword({ resetPasswordInput }) {
    console.log(resetPasswordInput);
    const userId = resetPasswordInput.userId;
    const token = resetPasswordInput.token;
    const password = resetPasswordInput.password;

    try {
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpiration: { $gt: Date.now() },
        _id: userId,
      });

      if (!user) {
        const error = new Error("Invalid Request!");
        error.code = 401;
        throw error;
      }
      const hashedPw = await bcrypt.hash(password, 12);
      user.password = hashedPw;
      user.resetToken = undefined;
      user.resetTokenExpiration = undefined;
      const savedUser = await user.save();
      return savedUser.email;
    } catch (error) {
      throw error;
    }
  },

  async getCheckout(_, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const userId = req.userId;
    try {
      const user = await User.findById(userId).populate("cart.items.product");
      let products = user.cart.items;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((p) => {
          return {
            price_data: {
              currency: "usd",
              unit_amount: p.product.price * 100,
              product_data: {
                name: p.product.title,
                description: p.product.description,
                images: ["https://example.com/t-shirt.png"],
              },
            },
            quantity: p.quantity,
          };
        }),
        mode: "payment",
        success_url:
          "https://online-store-angular.vercel.app/orders/confirmation?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://online-store-angular.vercel.app/checkout/cancel",
      });
      return {
        products,
        session_id: session.id,
      };
    } catch (err) {
      throw err;
    }
  },

  //Cart related
  async getCartItems(_, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId).populate("cart.items.product");
    if (!user) {
      const error = new Error("User not found!");
      error.code = 404;
      throw error;
    }
    return user.cart.items;
  },

  async addItemToCart({ _id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found!");
      error.code = 404;
      throw error;
    }
    await user.addToCart(_id);
    return true;
  },

  async deleteItemFromCart({ _id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found!");
      error.code = 404;
      throw error;
    }
    await user.deleteItemFromCart(_id);
    return true;
  },

  //orders related
  async placeOrder({ session_id }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      const error = new Error("Payment Failed!");
      error.code = 403;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found!");
      error.code = 404;
      throw error;
    }

    const orderId = await user.placeOrder();
    return orderId;
  },

  async getOrderDetails({ orderId }, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid request!");
      error.code = 404;
      throw error;
    }

    const order = await Order.findOne({
      _id: orderId,
      "user.userId": req.userId,
    });

    if (!order) {
      const error = new Error("Order not found!");
      error.code = 404;
      throw error;
    }
    return order;
  },

  async getOrders(_, req) {
    if (!req.isAuth) {
      const error = new Error("Not Authenticated!");
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid request!");
      error.code = 404;
      throw error;
    }

    const orders = await Order.find({ "user.userId": req.userId });
    return orders.map((order) => {
      return {
        ...order._doc,
        _id: order._id.toString(),
      };
    });
  },

  //Product related
  async product({ _id }) {
    const product = await Product.findById(_id);
    if (!product) {
      const error = new Error("Product Not Found!");
      error.code = 404;
      throw error;
    }
    return { ...product._doc, _id: product._id.toString() };
  },

  async products({ role, page }, req) {
    let query = {};
    if (role === "admin") {
      query = { userId: req.userId };
    }
    const products = await Product.find(query)
      .skip((page - 1) * Products_Per_Page)
      .limit(Products_Per_Page)
      .sort({ _id: 1 });
    const productCount = await Product.countDocuments(query);
    return { products, productCount };
  },

  createProduct: async function ({ productInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Unauthorized User.");
      error.code = 402;
      throw error;
    }
    validateProductInput(productInput);

    let title = productInput.title;
    let description = productInput.description;
    let price = productInput.price;
    let imageUrl = productInput.imageUrl;

    const product = new Product({
      title,
      description,
      price,
      imageUrl,
      userId: req.userId,
    });

    const createdProduct = await product.save();
    return { ...createdProduct._doc, _id: createdProduct._id.toString() };
  },

  updateProduct: async function ({ productInput }, req) {
    if (!req.isAuth) {
      const error = new Error("Unauthorized!");
      error.code = 402;
      throw error;
    }
    const product = await Product.findById(productInput._id);
    if (product.userId.toString() !== req.userId.toString()) {
      const error = new Error("Unauthorized!");
      error.code = 402;
      throw error;
    }
    validateProductInput(productInput);

    let title = productInput.title;
    let description = productInput.description;
    let price = productInput.price;
    let imageUrl = productInput.imageUrl;

    product.title = title;
    product.description = description;
    product.price = price;
    if (imageUrl) {
      deleteFile(product.imageUrl);
      product.imageUrl = imageUrl;
    }

    const updatedProduct = await product.save();

    return { ...updatedProduct._doc, _id: updatedProduct._id.toString() };
  },

  deleteProduct: async function ({ _id }, req) {
    if (!req.isAuth) {
      const error = new Error("Unauthorized!");
      error.code = 402;
      throw error;
    }
    const product = await Product.findOne({ _id, userId: req.userId });
    if (!product) {
      const error = new Error("Product Not Found!");
      error.code = 402;
      throw error;
    }

    deleteFile(product.imageUrl);
    const result = await Product.deleteOne({ _id });
    return result.deletedCount > 0 ? true : false;
  },
};
