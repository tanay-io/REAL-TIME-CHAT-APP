import crypto from "crypto";
require("dotenv").config();
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "12345678901234567890123456789012";
const normalizeKey = (key: string): string => {
  if (key.length === 32) return key;
  if (key.length > 32) return key.substring(0, 32);
  return key.padEnd(32, "0");
};
const NORMALIZED_KEY = normalizeKey(ENCRYPTION_KEY);
const ALGORITHM = "aes-256-cbc";
export class MessageEncryption {
  static encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(NORMALIZED_KEY),
        iv
      );
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt message");
    }
  }
  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
      }
      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(NORMALIZED_KEY),
        iv
      );
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt message");
    }
  }
  static simpleEncrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(NORMALIZED_KEY),
        iv
      );
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      console.error("Simple encryption error:", error);
      throw new Error("Failed to encrypt message");
    }
  }
  static simpleDecrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(":");
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
      }
      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(NORMALIZED_KEY),
        iv
      );
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("Simple decryption error:", error);
      throw new Error("Failed to decrypt message");
    }
  }
}
export default MessageEncryption;
