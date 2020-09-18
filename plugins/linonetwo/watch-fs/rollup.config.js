import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import disablePackages from 'rollup-plugin-disable-packages';

export default {
  input: 'dependencies.js',
  output: {
    file: '3rds.js',
    format: 'cjs',
    exports: 'named'
  },
  plugins: [
    nodeResolve(),
    json(),
    commonjs(),
    disablePackages('fsevents')
  ]
};
