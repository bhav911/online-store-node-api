const path = require("path");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const { graphqlHTTP } = require("express-graphql");

const graphqlSchema = require("./graphql/schema.js");
const graphqlResolver = require("./graphql/resolver.js");

const isAuth = require("./middleware/auth.js");
const { storeImage } = require("./util/fileHelper.js");

const { getOrderInvoice } = require("./controller/shop.js");

const app = express();

const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.va53l.mongodb.net/${process.env.MONGO_DATABASE}`;

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: "https://online-store-angular.vercel.app", // This is where your Angular app is running in development
    methods: "GET,POST,PUT,DELETE", // Allow specific HTTP methods
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"], // Add your custom headers here
    credentials: true, // Allow cookies to be sent
  })
);

app.options("*", cors());

app.post("/store-image", multer({ storage: fileStorage, fileFilter }).single("image"), (req, res) => {
  console.log(req.file);  
  if (!req.file) {
    return res.status(400).json({ message: "No image provided!" });
  }

  const normalizedPath = "/" + req.file.path.replace(/\\/g, "/");
  return res.json({ path: normalizedPath });
});

const errorController = require("./controller/error.js");

app.use(isAuth);

app.use("/graphql", (req, res, next) => {
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occurred";
      const status = err.originalError.code || 500;
      res.status(status);
      return { data, message, status };
    },
  })(req, res, next);
});

app.use("/orders/invoice/:orderId", getOrderInvoice);

app.use((error, req, res, next) => {
  console.log(error);  
  let status = error.statusCode;
  let message = error.message;
  return res.status(status).json({ message });
});

app.use(errorController.get404);

mongoose
  .connect(uri)
  .then((result) => {
    console.log("connected!");

    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.log("error: " + err);
  });
