
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Thêm cấu hình để xử lý assets
config.resolver.assetExts.push("tflite", "json")

// Thêm cấu hình để xử lý lỗi missing-asset-registry-path
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "missing-asset-registry-path": path.resolve(__dirname, "assets/empty.png"),
}

// Thêm cấu hình để xử lý lỗi với expo-router
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs"]

// Thêm cấu hình để xử lý lỗi với các module không tương thích
config.resolver.resolverMainFields = ["react-native", "browser", "main"]

module.exports = config
