import Fuse from 'fuse.js';
import pinyin from 'pinyin';

export function hasPinyinMatchOrFuseMatch(userInput: string, results: IResult[]) {
  const fuse = new Fuse(results, {
    keys: ['name', 'caption', 'hint'],
    getFn: (object, keyPath): string => {
      if (Array.isArray(keyPath)) {
        // we don't have nested keys
        return '';
      } else {
        const value = object[keyPath as keyof IResult] ?? '';
        return `${value}${pinyin(value, { style: pinyin.STYLE_NORMAL }).join('')}`;
      }
    },
    ignoreLocation: true,
  });
  return fuse.search(userInput);
}
export const pinyinfuse = hasPinyinMatchOrFuseMatch;
