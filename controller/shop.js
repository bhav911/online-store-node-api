const fs = require("fs");
const path = require("path");

const stripe = require("stripe")(
  "sk_test_51QnmCmCDlSGWE8W2vKsEBgmc6rO7ZzDUCW8VoBEPHH0aVp8L8v5COJpxpr9JTfAq70ewEikZFFrCIGOUP6s4AxBW008YQHZzgH"
);

const Order = require("../models/order");
const Product = require("../models/product");
const pdfDocument = require("pdfkit");
const User = require("../models/user");

exports.getProduct = (req, res, next) => {
  let productId = req.params.productId;
  Product.fetchProduct(productId, (product) => {
    res.send(product);
  });
};

exports.placeOrder = async (req, res, next) => {
  const userId = req.userId;
  const { session_id } = req.body;

  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid") {
    return res.status(400).json({ message: "Payment not completed" });
  }

  try {
    const user = await User.findById(userId);
    const orderId = user.placeOrder();
    return res.status(200).send(orderId);
  } catch (err) {
    res.send(false);
  }
};

exports.getOrders = async (req, res, next) => {
  const userId = req.userId;
  try {
    const user = await User.findById(userId);
    const orders = await user.getOrders();
    res.status(200).send(orders);
  } catch (err) {
    err.status(500);
    throw err;
  }
};

exports.getOrderDetails = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findOne({ _id: orderId, "user.userId": req.userId })
    .then((order) => {
      if (!order) {
        return res.status(402).json({ message: "Unauthorized" });
      }
      return res.status(200).json(order);
    })
    .catch((err) => {});
};

exports.getOrderInvoice = (req, res, next) => {
  let orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return res.status(404).json({ message: "Could not find order!" });
      }
      if (order.user.userId.toString() !== req.userId.toString()) {
        return res.status(401).json({ message: "Unauthorized access!" });
      }

      

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new pdfDocument();
      res.setHeader("Content-Type", "application/pdf"); // Fix typo
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoiceName}"`
      );

      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(24).text("Invoice", {
        underline: true,
        align: "center",
      });
      pdfDoc.text("\n");

      pdfDoc.fontSize(19).text("Orders", {
        underline: true,
      });
      pdfDoc.text("\n");

      let total_price = 0;

      order.products.forEach((element) => {
        total_price += element.product.price * element.quantity;
        pdfDoc
          .fontSize(14)
          .text(
            `${element.product.title} - ${element.product.price} X ${element.quantity}`
          );
      });

      pdfDoc.text("-------------");
      pdfDoc.text(`$${total_price}`);

      pdfDoc.end();
    })
    .catch((err) => {});
};

exports.getCheckout = async (req, res, next) => {
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
        "http://localhost:4200/orders/confirmation?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:4200/checkout/cancel",
    });
    return res.status(200).json({
      products,
      sessionId: session.id,
    });
  } catch (err) {
    throw err;
  }
};
