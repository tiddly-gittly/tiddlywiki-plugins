import Fuse from 'fuse.js';
import pinyin from 'pinyin';

export interface IFilterOperatorParamOperator {
  /** the name of the filter operator specified in the WikiText; */
  operator: string;
  /** the operand for the filter step (as a string; if the filter specified it in angle brackets or braces, the text reference or letiable name will have already been resolved); */
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

export interface IFilterOperatorOptions {
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
    includeScore: true,
    includeMatches: true,
    shouldSort: true,
  });
  return fuse.search(input).reverse();
}

$tw.utils.pinyinfuse = hasPinyinMatchOrFuseMatch;

type SourceIterator = (tiddler: Object, title: string) => void;
interface ISearchOptions {
  /** an iterator function for the source tiddlers, called source(iterator), where iterator is called as iterator(tiddler,title) */
  source?: (iter: SourceIterator) => void;
  /** An array of tiddler titles to exclude from the search */
  exclude?: string[];
  /** If true returns tiddlers that do not contain the specified string */
  invert?: boolean;
  /** If true forces a case sensitive search */
  caseSensitive?: boolean;
  /** If specified, restricts the search to the specified field, or an array of field names */
  field?: string | string[];
  /** If true, forces all but regexp searches to be anchored to the start of text */
  anchored?: boolean;
  /** If true, the field options are inverted to specify the fields that are not to be searched */
  excludeField?: boolean;
  /** searches for literal string */
  literal?: boolean;
  /** same as literal except runs of whitespace are treated as a single space */
  whitespace?: boolean;
  /** (default) treats search string as a list of tokens, and matches if all tokens are found, regardless of adjacency or ordering */
  words?: boolean;
}

/**
Return an array of tiddler titles that match a search string
@param searchText The text string to search for
@param options see below

Options available:
- source: an iterator function for the source tiddlers, called source(iterator), where iterator is called as iterator(tiddler,title)
- exclude: An array of tiddler titles to exclude from the search
- invert: If true returns tiddlers that do not contain the specified string
- caseSensitive: If true forces a case sensitive search
- field: If specified, restricts the search to the specified field, or an array of field names
- anchored: If true, forces all but regexp searches to be anchored to the start of text
- excludeField: If true, the field options are inverted to specify the fields that are not to be searched

The search mode is determined by the first of these boolean flags to be true:
- literal: searches for literal string
- whitespace: same as literal except runs of whitespace are treated as a single space
- regexp: treats the search term as a regular expression
- words: (default) treats search string as a list of tokens, and matches if all tokens are found, regardless of adjacency or ordering

*/
export function fuzzySearchWiki(searchText: string, options: ISearchOptions = {}) {
  const { exclude } = options;
  // Accumulate the array of fields to be searched or excluded from the search
  let fields: string[] = [];
  if (options.field) {
    if (Array.isArray(options.field)) {
      options.field.forEach((fieldName) => {
        if (fieldName) {
          fields.push(fieldName);
        }
      });
    } else {
      fields.push(options.field);
    }
  }
  // Use default fields if none specified and we're not excluding fields (excluding fields with an empty field array is the same as searching all fields)
  if (fields.length === 0 && !options.excludeField) {
    fields.push('title');
    fields.push('tags');
    fields.push('text');
  }

  // get tiddler list to search
  let tiddlerTitlesToSearch: string[] = [];
  if (typeof options.source === 'function') {
    options.source((tiddler, title) => {
      tiddlerTitlesToSearch.push(title);
    });
  } else {
    tiddlerTitlesToSearch = $tw.wiki.getTiddlers();
  }
  const results = hasPinyinMatchOrFuseMatch(tiddlerTitlesToSearch, searchText);
  // Remove any of the results we have to exclude
  if (exclude) {
    for (let excludeIndex = 0; excludeIndex < exclude.length; excludeIndex += 1) {
      let p = results.findIndex((item) => item.item.includes(exclude[excludeIndex]));
      if (p !== -1) {
        results.splice(p, 1);
      }
    }
  }
  return results.map((item) => item.item);
}

/**
 *
 * @example [pinyinfuse]
 * @param source
 * @param operator
 * @param options
 * @returns
 */
export const pinyinfuse = (source: (iter: SourceIterator) => void, operator: IFilterOperatorParamOperator, options: IFilterOperatorOptions) => {
  const invert = operator.prefix === '!';
  if (operator.suffixes) {
    let hasFlag = function (flag: string) {
      return (operator.suffixes?.[1] ?? []).indexOf(flag) !== -1;
    };
    let excludeFields = false;
    let fieldList = operator.suffixes[0] || [];
    let firstField = fieldList[0] || '';
    let firstChar = firstField.charAt(0);
    let fields: string[];
    if (firstChar === '-') {
      fields = [firstField.slice(1)].concat(fieldList.slice(1));
      excludeFields = true;
    } else if (fieldList[0] === '*') {
      fields = [];
      excludeFields = true;
    } else {
      fields = fieldList.slice(0);
    }
    return fuzzySearchWiki(operator.operand, {
      source: source,
      invert: invert,
      field: fields,
      excludeField: excludeFields,
      caseSensitive: hasFlag('casesensitive'),
      literal: hasFlag('literal'),
      whitespace: hasFlag('whitespace'),
      anchored: hasFlag('anchored'),
      words: hasFlag('words'),
    });
  } else {
    return fuzzySearchWiki(operator.operand, {
      source: source,
      invert: invert,
    });
  }
};
