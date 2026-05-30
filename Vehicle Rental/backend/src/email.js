const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function getSmtpCredentials() {
  const user = String(process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || process.env.EMAIL_PASS || "").trim();
  return { user, pass };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

let transporterPromise;

function getTransporter() {
  if (!transporterPromise) {
    const { user, pass } = getSmtpCredentials();
    if (!user || !pass) {
      throw new Error("EMAIL_USER and EMAIL_PASS must be set in backend/.env");
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 587);
    const useGmailService = host === "smtp.gmail.com" && !process.env.SMTP_HOST;

    const transporter = useGmailService
      ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } })
      : nodemailer.createTransport({
          host,
          port,
          secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465,
          auth: { user, pass }
        });

    transporterPromise = transporter.verify().then(() => transporter);
  }
  return transporterPromise;
}

async function sendBookingConfirmationEmail({ to, customerName, booking, vehicleName }) {
  const recipient = String(to || "").trim();
  if (!isValidEmail(recipient)) {
    throw new Error(`Invalid or missing recipient email: "${recipient || ""}"`);
  }

  const { user } = getSmtpCredentials();
  const from = process.env.EMAIL_FROM || user;
  const text = [
    `Hello ${customerName},`,
    "",
    "Your DriveHive booking is confirmed.",
    "",
    `Booking ID: ${booking.id}`,
    `Customer Name: ${customerName}`,
    `Vehicle Name: ${vehicleName || booking.vehicleId}`,
    `Pickup Date: ${booking.pickup}`,
    `Return Date: ${booking.dropoff}`,
    `Total Amount: ${booking.total}`,
    `Payment Status: ${booking.paymentStatus}`,
    "",
    "Thank you for choosing DriveHive."
  ].join("\n");

  const transporter = await getTransporter();
  await transporter.sendMail({
    from,
    to: recipient,
    subject: `DriveHive booking confirmed - ${booking.id}`,
    text
  });
  console.log("[email] booking confirmation sent", { bookingId: booking.id, recipient });
}

module.exports = { sendBookingConfirmationEmail };
