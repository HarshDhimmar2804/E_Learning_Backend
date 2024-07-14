import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import crypto from "crypto";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";

export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  res.json({
    courses,
  });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  res.json({
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lectures });
  }

  if (!user.subscription.includes(req.params.id))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lecture });
  }

  if (!user.subscription.includes(lecture.course))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lecture });
});

export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });

  res.json({
    courses,
  });
});

export const checkout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);

  const course = await Courses.findById(req.params.id);

  if (user.subscription.includes(course._id)) {
    return res.status(400).json({
      message: "You already have this course",
    });
  }

  const options = {
    amount: Number(course.price * 100),
    currency: "INR",
  };

  const order = await instance.orders.create(options);

  res.status(201).json({
    order,
    course,
  });
});

export const paymentVerification = TryCatch(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.Razorpay_SECRET)
    .update(body)
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    const user = await User.findById(req.user._id);

    const course = await Courses.findById(req.params.id);

    user.subscription.push(course._id);

    await Progress.create({
      course: course._id,
      completedLectures: [],
      user: req.user._id,
    });

    await user.save();

    res.status(200).json({
      message: "Course Purchased Successfully",
    });
  } else {
    return res.status(400).json({
      message: "Payment Failed",
    });
  }
});

export const addProgress = TryCatch(async (req, res) => {
  const { course, lectureId } = req.query;
  if (!course || !lectureId) {
    return res
      .status(400)
      .json({ message: "Missing course or lectureId in query parameters" });
  }

  const progress = await Progress.findOne({
    user: req.user._id,
    course,
  });

  if (!progress) {
    return res
      .status(404)
      .json({ message: "Progress not found for the specified course" });
  }

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({
      message: "Progress already recorded for this lecture",
    });
  }

  progress.completedLectures.push(lectureId);
  await progress.save();

  res.status(201).json({
    message: "New progress added",
  });
});

export const getYourProgress = TryCatch(async (req, res) => {
  const { course } = req.query;
  if (!course) {
    return res
      .status(400)
      .json({ message: "Missing course in query parameters" });
  }

  const progressArray = await Progress.find({
    user: req.user._id,
    course,
  });

  if (progressArray.length === 0) {
    return res
      .status(404)
      .json({ message: "No progress found for the specified course" });
  }

  const progress = progressArray[0];
  const allLecturesCount = await Lecture.countDocuments({ course });
  const completedLecturesCount = progress.completedLectures.length;
  const courseProgressPercentage =
    (completedLecturesCount * 100) / allLecturesCount;

  res.json({
    courseProgressPercentage,
    completedLectures: completedLecturesCount,
    allLectures: allLecturesCount,
    progress,
  });
});
