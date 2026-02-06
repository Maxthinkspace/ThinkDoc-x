/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const fs = require("fs");
const path = require("path");

const urlDev = "https://localhost:3000/";
const urlProd = "https://app.mythinkspace.ai/"; 

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return {
    ca: httpsOptions.ca,
    key: httpsOptions.key,
    cert: httpsOptions.cert,
  };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const envFile = dev ? '.env.local' : '.env.production';
  require("dotenv").config({path: envFile});
  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      react: ["react", "react-dom"],
      taskpane: {
        import: ["./src/taskpane/index.tsx", "./src/taskpane/taskpane.html"],
        dependOn: "react",
      },
      selectionDialog: "./src/taskpane/dialogs/selectionDialog.ts",
      commands: "./src/commands/commands.ts",
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
      alias: {
        "@": path.resolve(__dirname),
      },
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.(png|jpg|jpeg|ttf|woff|woff2|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        "process.env.REACT_APP_DEV_API_TOKEN": JSON.stringify(process.env.REACT_APP_DEV_API_TOKEN),
        "process.env.REACT_APP_API_BASE_URL": JSON.stringify(process.env.REACT_APP_API_BASE_URL),
        "process.env.REACT_APP_DEV_MODE": JSON.stringify(process.env.REACT_APP_DEV_MODE),
        "process.env.BYPASS_LOGIN": JSON.stringify(process.env.BYPASS_LOGIN),
      }),
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane", "react"],
      }),
      new HtmlWebpackPlugin({
        filename: "selectionDialog.html",
        template: "./src/taskpane/dialogs/selectionDialog.html",
        chunks: ["polyfill", "selectionDialog"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              if (dev) {
                return content;
              } else {
                return content.toString().replace(new RegExp(urlDev, "g"), urlProd);
              }
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"],
      }),
      new webpack.ProvidePlugin({
        Promise: ["es6-promise", "Promise"],
      }),
    ],
    devServer: {
      hot: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      // Forward API calls from the add-in dev server (https://localhost:3000)
      // to the backend (https://localhost:3003). Many taskpane pages use
      // relative fetch("/api/...") calls, so without a proxy they hit the
      // dev server and fail.
      proxy: [
        {
          context: ["/api"],
          // Backend may run HTTP or HTTPS depending on certificate presence.
          // Prefer explicit REACT_APP_API_BASE_URL, otherwise auto-detect based on certificates.
          target: process.env.REACT_APP_API_BASE_URL || "https://localhost:3003",
          changeOrigin: true,
          secure: false, // allow self-signed localhost certs
        },
      ],
      server: {
        type: "https",
        options:
          env.WEBPACK_BUILD || options.https !== undefined
            ? options.https
            : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 3000,
    },
  };

  return config;
};