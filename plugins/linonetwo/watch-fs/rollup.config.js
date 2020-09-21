import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import disablePackages from 'rollup-plugin-disable-packages';

export default {
  input: 'dependencies.js',
  output: {
    file: 'watch-fs/3rds.js',
    format: 'cjs',
    exports: 'named'
  },
  external: [
    'events',
    'fs',
    'fsevents',
    'util',
    'path',
    'os',
    'stream'
  ],
  plugins: [
    nodeResolve(),
    json(),
    commonjs(),

    // We are not able to bundle in fsevents since it is a native osx lib.
    // It will give us errors if we don't disable (replace it with noop) it.
    // We must also use `useFsEvents: false` when calling chokidar.watch.
    disablePackages('fsevents')
  ]
};
