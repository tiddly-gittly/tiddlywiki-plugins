import Fuse from 'fuse.js';
import pinyin from 'pinyin';

export interface IOperator {
  /** the name of the filter operator specified in the WikiText; */
  operator: string;
  /** the operand for the filter step (as a string; if the filter specified it in angle brackets or braces, the text reference or variable name will have already been resolved); */
  operand: string;
  /** (optional) a string containing a single exclamation mark if the filter operator is to be negated; */
  prefix?: string;
  /** (optional) a string containing an additional filter argument (typically a tiddler field name) following the filter name (separated by a colon in the filter syntax); */
  suffix?: string;
  /** multiple suffix
   * for example, in `search:<field list>:<flag list>[<operand>]`, you will get `<field list>` as suffixes[0], and `<flag list>` as suffixes[1]
   */
  suffixes?: string[][];
  /** (optional, deprecated) used instead of `operand` if the filter operand is a regexp. */
  regexp?: string;
}

export interface IOptions {
  /** The `$tw.Wiki` object; */
  wiki: Object;
  /** (optional) a widget node. */
  widget: Object;
}

export function hasPinyinMatchOrFuseMatch(items: string[], input: string): Fuse.FuseResult<string>[] {
  const fuse = new Fuse(items, {
    getFn: (object, keyPath): string => {
      if (Array.isArray(keyPath)) {
        // we don't have nested keys
        return '';
      } else {
        const value = object;
        return `${value}${pinyin(value, { style: pinyin.STYLE_NORMAL }).join('')}`;
      }
    },
    ignoreLocation: true,
  });
  return fuse.search(input);
}

/**
 *
 * @example [pinyinfuse]
 * @param source
 * @param operator
 * @param options
 * @returns
 */
export const pinyinfuse = (source: string, operator: IOperator, options: IOptions) => {
  const invert = operator.prefix === '!';
  if (operator.suffixes) {
    var hasFlag = function (flag) {
        return (operator.suffixes[1] || []).indexOf(flag) !== -1;
      },
      excludeFields = false,
      fieldList = operator.suffixes[0] || [],
      firstField = fieldList[0] || '',
      firstChar = firstField.charAt(0),
      fields;
    if (firstChar === '-') {
      fields = [firstField.slice(1)].concat(fieldList.slice(1));
      excludeFields = true;
    } else if (fieldList[0] === '*') {
      fields = [];
      excludeFields = true;
    } else {
      fields = fieldList.slice(0);
    }
    return options.wiki.search(operator.operand, {
      source: source,
      invert: invert,
      field: fields,
      excludeField: excludeFields,
      caseSensitive: hasFlag('casesensitive'),
      literal: hasFlag('literal'),
      whitespace: hasFlag('whitespace'),
      anchored: hasFlag('anchored'),
      regexp: hasFlag('regexp'),
      words: hasFlag('words'),
    });
  } else {
    return options.wiki.search(operator.operand, {
      source: source,
      invert: invert,
    });
  }
};
