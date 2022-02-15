import { withTheme } from '@rjsf/core';
import { Theme as Mui5Theme } from '@rjsf/material-ui';
import type { JSONSchema6 } from 'json-schema';

// Make modifications to the theme with your own fields and widgets

// DEBUG: console
console.log(`Mui5Theme`, Mui5Theme);
const Form = withTheme(Mui5Theme);

const Widget = require('$:/plugins/linonetwo/tw-react/widget.js').widget;

const log = (type: string) => console.log.bind(console, type);

class FormWidget extends Widget {
  reactComponent = Form;
  getProps = () => {
    const currentTiddler = this.getAttribute('tiddler', this.getVariable('currentTiddler'));
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
    return {
      schema: schema,
      children: null,
      onChange: log('changed'),
      onSubmit: log('submitted'),
      onError: log('errors'),
    };
  };
}
exports.formWidget = FormWidget;
