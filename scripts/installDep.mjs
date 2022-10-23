const folders = fs.readdirSync('./src');
await Promise.all(folders.filter((pathName) => !pathName.startsWith('.')).map((folder) => $`cd ${path.join(__dirname, '..', 'src', folder)} && npm i --legacy-peer-deps`));
