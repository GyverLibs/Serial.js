module.exports = {
    entry: './serial.js',
    output: {
        path: __dirname,
        filename: 'serial.min.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    mode: "production",
};