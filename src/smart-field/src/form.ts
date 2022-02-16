import { withTheme, IChangeEvent } from '@rjsf/core';
import { Theme as Mui5Theme } from '@rjsf/material-ui';
import type { JSONSchema6 } from 'json-schema';
import debounce from 'lodash/debounce';
import { ITiddlerFields } from 'tiddlywiki';
import type { ReactWidget } from 'tw-react';

// Make modifications to the theme with your own fields and widgets
const Form = withTheme(Mui5Theme);

const Widget = require('$:/plugins/linonetwo/tw-react/widget.js').widget as typeof ReactWidget;

const log = (type: string) => console.log.bind(console, type);
const DEBOUNCE_DELAY = 1000;

class FormWidget extends Widget {
  reactComponent = Form;
  getProps = () => {
    const currentTiddler = this.getAttribute('tiddler', this.getVariable('currentTiddler'));
    const formData = $tw.wiki.getTiddler(currentTiddler)?.fields ?? {};
    /** Found "form tags" of the current tiddler, we will read their fields to get fields that will show up in our user's tiddler. */
    const formTagsFilter: string = `${currentTiddler} +[tags[]tag[$:/tags/Ontology/Form]]`;
    const formTags: string[] = $tw.wiki.compileFilter(formTagsFilter)();
    // prepare ontology names we need to find
    /**
     * Fields that will show in user's tiddler, and each field's ontology name.
     */
    const formFieldsAndOntologies: { field: string; ontology: string }[] = formTags.flatMap((tiddlerTitle) => {
      const fields = $tw.wiki.getTiddler(tiddlerTitle)?.fields;
      if (!fields) {
        return [];
      }
      /** We will look for fields like `properties.xxx` */
      return Object.keys(fields)
        .filter((fieldName) => fieldName.startsWith('properties.') && fields[fieldName])
        .map((fieldName) => {
          const ontologyName = fields[fieldName] as string;
          const finalFieldName = fieldName.replace('properties.', '');
          return { field: finalFieldName, ontology: ontologyName };
        });
    });
    // get JSONSchema from the ontology, using ontologyName.fieldName
    const schema: JSONSchema6 = {
      type: 'object',
      required: [],
      properties: {
        // title: { type: 'string', title: 'Title', default: 'A new task' },
        // done: { type: 'boolean', title: 'Done?', default: false },
      },
    };
    formFieldsAndOntologies.forEach(({ field, ontology }) => {
      /**
       * A tiddler tagged with `$:/tags/Ontology/Field`
       */
      const ontologyFieldTiddler = $tw.wiki.getTiddler(`$:/plugins/ontology/${ontology}/${field}`)?.fields;
      if (!ontologyFieldTiddler?.tags?.includes('$:/tags/Ontology/Field')) {
        return;
      }
      /**
       * JSONSchema in tiddler's text field
       */
      const schemaFragmentOfThisField: string = ontologyFieldTiddler.text;
      try {
        const parsedSchema = JSON.parse(schemaFragmentOfThisField);
        schema.properties![field] = parsedSchema;
      } catch {
        // TODO: handle error and warn user about a bad form plugin installed
      }
    });
    const debouncedOnChange = debounce((data: IChangeEvent) => {
      const prevFields = $tw.wiki.getTiddler(currentTiddler)?.fields ?? ({} as ITiddlerFields);
      // prevent useless call to addTiddler
      if (Object.keys(data.formData).length === 0 || Object.keys(data.formData).every((key) => prevFields[key] === data.formData[key])) {
        return;
      }
      $tw.wiki.addTiddler({ ...prevFields, ...data.formData });
    }, DEBOUNCE_DELAY);
    return {
      schema,
      formData,
      children: null,
      onChange: debouncedOnChange,
      // onSubmit: log('submitted'),
      // onError: log('errors'),
    };
  };
}
exports.formWidget = FormWidget;
