const fs = require("fs");

exports.deleteFile = (filePath) => {
  fs.unlink("." + filePath, (err) => {
    if (err) {
      throw err;
    }
  });
};

exports.storeImage = (req, res, next) => {
  if (!req.file) {
    return res.json({ message: "No image provided!" });
  }

  const normalizedPath = "/" + req.file.path.replace(/\\/g, "/");
  return res.json({ path: normalizedPath });
};
