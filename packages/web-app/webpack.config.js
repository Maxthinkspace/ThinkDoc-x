const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");
require("dotenv").config();

module.exports = (env, options) => {
  const dev = options.mode === "development";

  return {
    entry: "./src/main.tsx",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.[contenthash].js",
      clean: true,
      publicPath: "/",
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "babel-loader",
            },
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
        {
          test: /\.css$/i,
          use: [
            "style-loader",
            "css-loader",
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [
                    require("tailwindcss"),
                    require("autoprefixer"),
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./public/index.html",
        filename: "index.html",
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "public",
            to: ".",
            globOptions: {
              ignore: ["**/index.html"],
            },
          },
        ],
      }),
      new webpack.DefinePlugin({
        "process.env.REACT_APP_API_BASE_URL": JSON.stringify(
          process.env.REACT_APP_API_BASE_URL || "https://localhost:3003"
        ),
        "process.env.REACT_APP_AZURE_CLIENT_ID": JSON.stringify(
          process.env.REACT_APP_AZURE_CLIENT_ID || ""
        ),
        "process.env.REACT_APP_SUPABASE_URL": JSON.stringify(
          process.env.REACT_APP_SUPABASE_URL || ""
        ),
        "process.env.REACT_APP_SUPABASE_ANON_KEY": JSON.stringify(
          process.env.REACT_APP_SUPABASE_ANON_KEY || ""
        ),
        "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      compress: true,
      port: 8080,
      hot: true,
      historyApiFallback: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      proxy: [
        {
          context: ["/api"],
          target: process.env.REACT_APP_API_BASE_URL || "https://localhost:3003",
          changeOrigin: true,
          secure: false,
        },
      ],
    },
    devtool: dev ? "source-map" : false,
  };
};

