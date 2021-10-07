const folders = fs.readdirSync('./src');
await Promise.all(folders.map((folder) => $`cd ${path.join(__dirname, '..', 'src', folder)} && npm i`));
