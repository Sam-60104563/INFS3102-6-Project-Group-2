const multer = require('multer');
const crypto = require('crypto')
let rand = crypto.randomUUID()
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'dist/static/images');
  },
  filename: (req, file, cb) => {
    cb(null, rand + Date.now() + '.jpg');
  }
});

const upload = multer({ storage: storage });

module.exports = upload;