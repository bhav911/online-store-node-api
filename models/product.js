const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Product", productSchema);

// const mongodb = require("mongodb");

// const getProductsFromFile = (cb) => {
//   fs.readFile(p, (err, fileContent) => {
//     let products = [];
//     if (!err) {
//       products = JSON.parse(fileContent);
//     }
//     cb(products);
//   });
// };

// module.exports = class Product {
//   constructor(title, imageUrl, description, price, id, userId) {
//     this.title = title;
//     this.imageUrl = imageUrl;
//     this.description = description;
//     this.price = price;
//     this._id = id ? new mongodb.ObjectId(id) : null;
//     this.userId = userId;
//   }

//   save() {
//     const db = getDb();
//     let dbOp;
//     if (this._id) {
//       dbOp = db
//         .collection("products")
//         .updateOne({ _id: this._id }, { $set: this });
//     } else {
//       dbOp = db.collection("products").insertOne(this);
//     }
//     return dbOp
//       .then((result) => {
//         return true;
//       })
//       .catch((err) => {
//         console.log("error: " + err);
//         return false;
//       });
//   }

//   static deleteProduct(_id) {
//     const db = getDb();
//     const objectId = new mongodb.ObjectId(_id);
//     return db
//       .collection("products")
//       .deleteOne({ _id: objectId })
//       .then((status) => {
//         console.log(status);
//         return true;
//       })
//       .catch((err) => {
//         console.log("error: " + err);
//         throw err;
//       });
//     // Cart.deleteProductFromCart(_id, product.price, (status) => {
//     //   cb(true);
//     // });
//   }

//   static fetchAll() {
//     const db = getDb();
//     return db
//       .collection("products")
//       .find()
//       .toArray()
//       .then((products) => {
//         return products;
//       })
//       .catch((err) => {
//         console.log("error: " + err);
//       });
//   }

//   static fetchProduct(_id) {
//     const db = getDb();
//     return db
//       .collection("products")
//       .findOne({ _id: mongodb.ObjectId.createFromHexString(_id) })
//       .catch((err) => {
//         console.log("Cannot find Product!, " + err);
//         return false;
//       });
//   }
// };
