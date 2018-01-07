const webpack = require('webpack');
const path = require('path');

// HTML Web Pack Plugin
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const workboxPlugin = require('workbox-webpack-plugin');
const CleanWebpackPlugin = require('webpack-clean-plugin');

const config = {
  module: {
    rules: [
      {
        test: /\.((png)|(eot)|(woff)|(woff2)|(ttf)|(svg)|(gif))(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file-loader?name=/[hash].[ext]'
      },
      {test: /\.json$/, loader: 'json-loader'},
      {
        loader: 'babel-loader',
        test: /\.js?$/,
        exclude: /node_modules/,
        query: {cacheDirectory: true}
      }
    ]
  },

  plugins: [
  // Debug mode on!
    new webpack.LoaderOptionsPlugin({
      debug: true
    }),
    new webpack.ProvidePlugin({
      'fetch': 'imports-loader?this=>global!exports?global.fetch!whatwg-fetch'
    }),
    // Clean up the dist directory before we put stuff in it
    new CleanWebpackPlugin(['dist/js/*.js']),
    //  Generate manifest.json file in your root output directory
    //  with a mapping of all source file names to their corresponding output file,
    new ManifestPlugin(),
    //  Bundle Analyzer. See https://www.npmjs.com/package/webpack-bundle-analyzer
    //  for more instructions
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      analyzerHost: '127.0.0.1',
      analyzerPort: 8888,
      reportFilename: 'report.html',
      defaultSizes: 'gzip',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'stats.json',
      // Log level. Can be 'info', 'warn', 'error' or 'silent'.
      logLevel: 'info'
    }),
    // generates a file with proper links to bundles from a template
    // in the root directory
    // new HtmlWebpackPlugin({
    //   production: options.production,
    //   template: './index-template.html'
    // }),
    //  Runs uglify.js
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    // Generates precaching service worker based on our
    // existing directories
    new workboxPlugin({
      globDirectory: './dist',
      globPatterns: ['**/*.{html,css,js}'],
      swDest: './dist/sw.js',
      clientsClaim: true,
      skipWaiting: true,
    })

  ],

  context: path.join(__dirname, 'src'),
  entry: {
    app: ['./js/app.js']
  },
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/',
    filename: '[name].js'
  },
  externals:  [/^vendor\/.+\.js$/]
};

module.exports = config;
