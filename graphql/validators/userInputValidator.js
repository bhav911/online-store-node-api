const validator = require("validator");

exports.validateUserInput = (userInput, type) => {
  const errors = [];
  if (!validator.isEmail(userInput.email)) {
    errors.push({ message: "Email is Invalid." });
  }
  if (
    validator.isEmpty(userInput.password) ||
    !validator.isLength(userInput.password, { min: 5 })
  ) {
    errors.push({ message: "Password too short." });
  }
  if (type === "signup" && userInput.password !== userInput.confirmPassword) {
    errors.push({ message: "Passwords do not match." });
  }
  if (errors.length > 0) {
    const error = new Error("Invalid Input!");
    error.data = errors;
    error.code = 422;
    throw error;
  }
};
