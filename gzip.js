const {gzip} = require("gzip-cli")

gzip({patterns: ['updates/exposdk/**/*.{html,css,js,svg}'], outputExtensions: ['gz', 'br'], ignorePatterns: ['**/icons']});