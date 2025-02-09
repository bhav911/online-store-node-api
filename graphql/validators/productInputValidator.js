const validator = require("validator");

exports.validateProductInput = (productInput) => {
  let title = productInput.title;
  let description = productInput.description;
  let price = productInput.price.toString();
  let imageUrl = productInput.imageUrl;

  const errors = [];

  if (
    validator.isEmpty(title) ||
    !validator.isLength(title, { min: 5, max: 50 })
  ) {
    errors.push({ message: "Title must be of length between 5 to 20!" });
  }
  if (
    validator.isEmpty(description) ||
    !validator.isLength(description, { min: 20, max: 500 })
  ) {
    errors.push({
      message: "Description must be of length between 20 to 500!",
    });
  }
  if (validator.isEmpty(price) || !validator.isInt(price)) {
    errors.push({ message: "Invalid Price!" });
  }
  if (errors.length > 0) {
    const error = new Error("Invalid Input");
    error.data = errors;
    error.code = 422;
    throw error;
  }
};
