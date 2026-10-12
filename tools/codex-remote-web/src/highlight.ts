import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
hljs.registerLanguage('javascript',javascript);hljs.registerLanguage('typescript',typescript);hljs.registerLanguage('python',python);hljs.registerLanguage('bash',bash);hljs.registerLanguage('json',json);hljs.registerLanguage('css',css);hljs.registerLanguage('html',xml);hljs.registerLanguage('xml',xml);
export function highlight(root:HTMLElement) {for(const code of root.querySelectorAll<HTMLElement>('pre code')) {const lang=code.className.replace('language-','');if(hljs.getLanguage(lang))hljs.highlightElement(code);}}
