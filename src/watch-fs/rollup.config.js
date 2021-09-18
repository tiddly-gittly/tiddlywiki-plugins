import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import disablePackages from 'rollup-plugin-disable-packages';

export default {
  input: 'src/index.js',
  output: {
    file: '../../dist/watch-fs.js',
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
    typescript(),
    nodeResolve(),
    json(),
    commonjs(),

    // We are not able to bundle in fsevents since it is a native osx lib.
    // It will give us errors if we don't disable (replace it with noop) it.
    // We must also use `useFsEvents: false` when calling chokidar.watch.
    disablePackages('fsevents')
  ]
};