// `CheckerPlugin` is optional. Use it if you want async error reporting.
// We need this plugin to detect a `--watch` mode. It may be removed later
// after https://github.com/webpack/webpack/issues/3460 will be resolved.
const { CheckerPlugin } = require('awesome-typescript-loader')
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  context: __dirname + '/src',
  entry: './main',
  output: {
    path: __dirname + '/build',
    filename: 'js/main.js',
  },

  watchOptions: {
    ignored: [
      /node_modules\/+(?!@mata\/devtool)/, 
      /@mata\/devtool\/node_modules/,
    ]
  },
  
  // Currently we need to add '.ts' to the resolve.extensions array.
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },

  // Source maps support ('inline-source-map' also works)
  devtool: 'source-map',

  // Add the loader for .ts files.
  module: {
    loaders: [
      {
        test: /\.tsx?$/,
        loader: 'awesome-typescript-loader'
      }
    ]
  },

  plugins: [
      new CopyWebpackPlugin([
        // {output}/file.txt
        { from: 'static' },
      ]),
      new CheckerPlugin(),
  ]
};
