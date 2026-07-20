// https://docs.expo.dev/guides/using-eslint/
import expoConfig from "eslint-config-expo/flat.js";
import reactPlugin from "eslint-plugin-react";
import reactNativePlugin from "eslint-plugin-react-native";
import { defineConfig } from "eslint/config";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    plugins: {
      react: reactPlugin,
      "react-native": reactNativePlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
    rules: {
      "react-native/no-unused-styles": 1,
      "react-native/split-platform-components": 1,
      "react-native/no-inline-styles": 0,
      "react-native/no-color-literals": 0,
      "react-native/no-raw-text": [
        "error",
        {
          skip: ["ThemedText"],
        },
      ],
      "react-native/no-single-element-style-arrays": 1,
    },
  },
]);
