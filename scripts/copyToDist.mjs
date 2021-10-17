// cross platform cp -r plugins/ dist/plugins && cp -r themes dist/
fs.copy(path.join(__dirname, '..', 'plugins'), path.join(__dirname, '..', 'dist', 'plugins'))
fs.copy(path.join(__dirname, '..', 'themes'), path.join(__dirname, '..', 'dist', 'themes'))