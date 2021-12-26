// cross platform cp -r plugins/ dist/plugins && cp -r themes dist/
fs.copy(path.join(__dirname, '..', 'plugins'), path.join(__dirname, '..', 'dist', 'plugins'))
fs.copy(path.join(__dirname, '..', 'themes'), path.join(__dirname, '..', 'dist', 'themes'))
// for dev wiki
fs.copy(path.join(__dirname, '..', 'tiddlers'), path.join(__dirname, '..', 'dist', 'tiddlers'))
fs.copy(path.join(__dirname, '..', 'tiddlywiki.info'), path.join(__dirname, '..', 'dist', 'tiddlywiki.info'))
