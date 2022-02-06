import { withTheme } from '@rjsf/core';
import { Theme as Mui5Theme } from '@rjsf/material-ui';

// Make modifications to the theme with your own fields and widgets

const Form = withTheme(Mui5Theme);

const Widget = require('$:/plugins/linonetwo/tw-react/widget.js').widget;

const schema = {
  title: 'Todo',
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', title: 'Title', default: 'A new task' },
    done: { type: 'boolean', title: 'Done?', default: false },
  },
};

const log = (type: string) => console.log.bind(console, type);

class FormWidget extends Widget {
  reactComponent = Form;
  getProps = () => ({
    schema: schema,
    onChange: log('changed'),
    onSubmit: log('submitted'),
    onError: log('errors'),
  });
}
exports.formWidget = FormWidget;
