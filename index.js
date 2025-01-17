import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./database/db.js";
import Razorpay from "razorpay";
import cors from "cors";
import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

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

// Ensure the uploads directory exists
const uploadDir = path.resolve(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("Uploads directory created");
} else {
  console.log("Uploads directory exists");
}

// Set static folder
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination(req, file, cb) {
    console.log("Setting destination to uploads directory");
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    console.log("Generating unique filename");
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
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res.status(500).json({ error: err.message });
    } else if (err) {
      console.error("Unknown error:", err);
      return res
        .status(500)
        .json({ error: "An error occurred during file upload" });
    }

    // Everything went fine.
    console.log("File uploaded successfully:", req.file.filename);
    res.status(200).json({
      message: "File uploaded successfully",
      fileName: req.file.filename,
    });
  });
});

app.delete("/delete/:filename", (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);

  // Log the file path
  console.log("Attempting to delete file:", filePath);

  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        // File does not exist
        console.error("File does not exist:", filePath);
        return res.status(404).json({ error: "File not found" });
      }
      // Other errors
      console.error("Error deleting file:", err);
      return res
        .status(500)
        .json({ error: "An error occurred during file deletion" });
    }

    console.log("File deleted successfully:", filePath);
    res.status(200).json({ message: "File deleted successfully" });
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
