/**
 *
 * @example [pinyinfuse]
 * @param source
 * @param operator
 * @param options
 * @returns
 */
export const getFormTagJSONSchema = (source: (iter: SourceIterator) => void, operator: IFilterOperatorParamOperator, options: IFilterOperatorOptions) => {
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
