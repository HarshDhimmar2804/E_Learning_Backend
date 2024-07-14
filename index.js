import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import Razorpay from "razorpay";
import cors from "cors";
import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

// Workaround for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const instance = new Razorpay({
  key_id: process.env.Razorpay_KEY,
  key_secret: process.env.Razorpay_SECRET,
});

const app = express();

// Using middlewares
app.use(express.json());
app.use(cors());

// Set static folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads");
  },
  filename(req, file, cb) {
    const id = uuid();
    const extName = file.originalname.split(".").pop();
    const fileName = `${id}.${extName}`;
    cb(null, fileName);
  },
});

const uploadFiles = multer({ storage }).single("file");

// Routes
app.post("/upload", (req, res) => {
  uploadFiles(req, res, (err) => {
    if (err) {
      console.error("Upload error: ", err);
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ file: req.file });
  });
});

app.get("/", (req, res) => {
  res.send("Server is working");
});

// Importing routes
import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";

// Using routes
app.use("/api", userRoutes);
app.use("/api", courseRoutes);
app.use("/api", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  connectDb();
});
