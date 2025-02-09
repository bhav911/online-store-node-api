const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const bcrypt = require("bcryptjs");
const postmark = require("postmark");

const User = require("../models/user");

const client = new postmark.ServerClient(
  "cdc1760a-7837-4327-b6df-e823648636ad"
);

exports.postLogin = async (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;

  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let field = errors.array()[0];
    return res.status(422).json({ message: field.msg, field: field.path });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }
    const doMatch = await bcrypt.compare(password, user.password);
    if (doMatch) {
      const token = jwt.sign(
        {
          email: user.email,
          userId: user._id.toString(),
        },
        "chaddi ma kaanu",
        {
          expiresIn: "1h",
        }
      );
      return res.status(200).json({ token, userId: user._id.toString() });
    }
    return res.status(401).json({ message: "Incorrect email or password" });
  } catch (err) {
    console.log("error: " + err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.postSignup = (req, res, next) => {
  let email = req.body.email;
  let password = req.body.password;

  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let field = errors.array()[0];
    return res.status(422).json({ message: field.msg, field: field.path });
  }

  bcrypt
    .hash(password, 12)
    .then((encryptedPassword) => {
      const user = new User({
        email,
        password: encryptedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((user) => {
      req.session.isLoggedIn = true;
      req.session.user = user;
      req.session.save(() => {
        let template_variable = {
          name: user.email,
          product_name: "Our Shop",
        };
        let template_ID = 38864484;
        sendEmail(user.email, template_ID, template_variable);
        res.send(user);
      });
    })
    .catch((err) => {
      if (err === "User already exists") {
        return;
      }
      console.error("Signup error:", err);
      res.status(500).json({
        message: "An error occurred during signup.",
        error: err.message || err,
      });
    });
};

exports.postSendPasswordResetMail = (req, res, next) => {
  const email = req.body.email;

  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    let field = errors.array()[0];
    return res.status(422).json({ message: field.msg });
  }
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Something went wrong." });
    }
    const token = buffer.toString("hex");
    User.findOne({ email })
      .then((user) => {
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((user) => {
        res
          .status(200)
          .json({ message: "Password reset email sent successfully!" });
        let template_variable = {
          name: user.email,
          product_name: "Our Shop",
          action_url: `http://localhost:4200/reset-password/${token}`,
        };
        let template_ID = 38864483;
        sendEmail(user.email, template_ID, template_variable);
      })
      .catch((err) => {
        if (err === "No account found") {
          return;
        }
        console.error("Error during password reset:", err);
        res.status(500).json({
          message: `Something went wrong.`,
          error: err.message || err,
        });
      });
  });
};

exports.postResetPassword = (req, res, next) => {
  let userObject = req.body.userObject;
  let userId = userObject.userId;
  let password = userObject.password;
  let token = userObject.token;
  let resetUser;
  User.findOne({
    _id: userId,
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(password, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.status(200).json("Updated Password Successfully");
    })
    .catch((error) => {
      console.log("error updating password: " + error);
      res.status(501).json({ message: "Something went wrong!" });
    });
};

exports.validatePasswordResetToken = (req, res, next) => {
  let token = req.query.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "Invalid Request!" });
      }
      res.status(200).json({ userId: user._id });
    })
    .catch((err) => {
      console.error("error:", err);
      res.status(500).json({
        message: "An error occurred.",
        error: err.message || err,
      });
    });
};

exports.authStatus = (req, res, next) => {
  const userId = req.userId;
  User.findById(userId)
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      console.log("error: " + err);
    });
};

const sendEmail = async (emailAddress, TemplateId, variables) => {
  try {
    const response = await client.sendEmailWithTemplate({
      From: "bhavyamodhiya@theslayeraa.com", // Sender address (verified in Postmark)
      To: emailAddress, // Recipient address
      TemplateId: TemplateId, // Your Postmark template ID
      TemplateModel: variables,
    });
    console.log("Email sent successfully:", response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
