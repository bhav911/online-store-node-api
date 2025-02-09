const mongoose = require("mongoose");
const Order = require("./order");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  resetToken: String,
  resetTokenExpiration: Date,
  password: {
    type: String,
    required: true,
  },
  cart: {
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
      },
    ],
  },
});

userSchema.methods.addToCart = function (productId) {
  const productIndex = this.cart.items.findIndex((product) => {
    return product.product.toString() === productId.toString();
  });
  const updatedCartItems = [...this.cart.items];

  if (productIndex >= 0) {
    updatedCartItems[productIndex].quantity++;
  } else {
    updatedCartItems.push({
      product: productId,
      quantity: 1,
    });
  }

  const updatedCart = {
    items: updatedCartItems,
  };

  this.cart = updatedCart;
  return this.save();
};

userSchema.methods.deleteItemFromCart = function (productId) {
  const cartItem = [...this.cart.items];
  const updatedCart = cartItem.filter(
    (i) => i.product.toString() !== productId
  );

  this.cart.items = updatedCart;
  return this.save();
};

userSchema.methods.placeOrder = function () {
  return this.populate("cart.items.product").then((products) => {
    const cartItems = products.cart.items.map((i) => {
      return {
        quantity: i.quantity,
        product: { ...i.product._doc },
      };
    });

    const order = new Order({
      products: cartItems,
      user: {
        userId: this._id,
        email: this.email,
      },
    });
    return order
      .save()
      .then((order) => {
        this.cart.items = [];
        return this.save().then(() => {
          return order._id;
        });
      })
      .catch((err) => {
        console.log("error: " + err);
        throw err;
      });
  });
};

userSchema.methods.getOrders = function () {
  return Order.find({ "user.userId": this._id })
    .then((orders) => {
      return orders;
    })
    .catch((err) => {
      console.log("error: " + err);
      throw err;
    });
};

module.exports = mongoose.model("User", userSchema);

// const mongodb = require("mongodb");

// module.exports = class User {
//   constructor(username, email, cart, _id) {
//     this.username = username;
//     this.email = email;
//     this.cart = cart;
//     this._id = _id ? new mongodb.ObjectId(_id) : null;
//   }

//   save() {
//     const db = getDb();
//     return db
//       .collections("users")
//       .insertOne(this)
//       .then((status) => {
//         console.log(status);
//         return status;
//       })
//       .catch((err) => {
//         console.log("error: " + err);
//         throw err;
//       });
//   }

//   getCart() {
//     const db = getDb();
//     const productIds = this.cart.items.map((i) => i.productId);
//     return db
//       .collection("products")
//       .find({ _id: { $in: productIds } })
//       .toArray()
//       .then((products) => {
//         const cart = products.map((prod) => ({
//           ...prod,
//           quantity: this.cart.items.find(
//             (i) => i.productId.toString() === prod._id.toString()
//           ).quantity,
//         }));
//         return cart;
//       });
//   }

//   addToCart(productId) {
//     const productIndex = this.cart.items.findIndex((product) => {
//       return product.productId.toString() === productId.toString();
//     });
//     const updatedCartItems = [...this.cart.items];

//     if (productIndex >= 0) {
//       updatedCartItems[productIndex].quantity++;
//     } else {
//       updatedCartItems.push({
//         productId: productId,
//         quantity: 1,
//       });
//     }

//     const updatedCart = {
//       items: updatedCartItems,
//     };

//     const db = getDb();
//     return db
//       .collection("users")
//       .updateOne({ _id: this._id }, { $set: { cart: updatedCart } });
//   }

//   deleteItemFromCart(productId) {
//     const db = getDb();
//     const cartItem = [...this.cart.items];
//     const updatedCart = cartItem.filter(
//       (i) => i.productId.toString() !== productId
//     );
//     const cart = {
//       items: updatedCart,
//     };
//     return db
//       .collection("users")
//       .updateOne({ _id: this._id }, { $set: { cart } });
//   }

//   getOrders() {
//     const db = getDb();
//     return db
//       .collection("orders")
//       .find({ "user._id": this._id })
//       .toArray()
//       .catch((err) => {
//         console.log("error: " + err);
//         throw err;
//       });
//   }

//   placeOrder() {
//     const db = getDb();
//     return this.getCart().then((products) => {
//       return db
//         .collection("orders")
//         .insertOne({
//           products: products,
//           user: {
//             _id: this._id,
//             username: this.username,
//           },
//         })
//         .then((result) => {
//           this.cart.items = [];
//           return db
//             .collection("users")
//             .updateOne({ _id: this._id }, { $set: { cart: { items: [] } } });
//         });
//     });
//   }

//   static fetchUser(_id) {
//     const db = getDb();
//     const objectId = new mongodb.ObjectId(_id);
//     return db
//       .collection("users")
//       .findOne({ _id: objectId })
//       .then((user) => {
//         return user;
//       })
//       .catch((err) => {
//         console.log("error: " + err);
//         throw err;
//       });
//   }
// };
