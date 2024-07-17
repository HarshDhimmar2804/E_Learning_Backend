// import multer from "multer";
// import { v4 as uuid } from "uuid";

// const storage = multer.diskStorage({
//   destination(req, file, cb) {
//     cb(null, "uploads");
//   },
//   filename(req, file, cb) {
//     const id = uuid();

//     const extName = file.originalname.split(".").pop();

//     const fileName = `${id}.${extName}`;

//     cb(null, fileName);
//   },
// });

// export const uploadFiles = multer({ storage }).single("file");

import multer from "multer";
import { v4 as uuid } from "uuid";
import fs from "fs";
import path from "path";

// Ensure the uploads directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const id = uuid();
    const extName = file.originalname.split(".").pop();
    const fileName = `${id}.${extName}`;
    cb(null, fileName);
  },
});

export const uploadFiles = multer({ storage }).single("file");
