// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo'
    ],
    plugins: [
      // Bắt buộc để Expo Router thiết lập LinkingContext, file-based routing, v.v.
      'expo-router/babel'
    ],
  };
};
