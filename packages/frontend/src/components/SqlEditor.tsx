import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { format } from 'sql-formatter';
import { useTheme } from '@/contexts/ThemeContext';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  placeholder?: string;
  onCopy?: () => void;
}

const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  height = '200px',
  placeholder = 'Your SQL query will appear here...',
  onCopy
}) => {
  const editorRef = useRef<unknown>(null);
  const { theme } = useTheme();

  const handleEditorDidMount = (editor: unknown, monaco: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    editorRef.current = editor;
    
    // Configure SQL language features
    monaco.languages.setLanguageConfiguration('sql', {
      comments: {
        lineComment: '--',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['(', ')'],
        ['[', ']']
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
        { open: '"', close: '"' }
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
        { open: '"', close: '"' }
      ]
    });

    // Add custom SQL keywords
    monaco.languages.setMonarchTokensProvider('sql', {
      defaultToken: '',
      tokenPostfix: '.sql',
      ignoreCase: true,
      
      brackets: [
        { open: '(', close: ')', token: 'delimiter.parenthesis' },
        { open: '[', close: ']', token: 'delimiter.square' }
      ],

      keywords: [
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
        'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
        'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE',
        'IS', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
        'ALTER', 'DROP', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'CONSTRAINT',
        'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
        'AUTO_INCREMENT', 'IDENTITY', 'SERIAL', 'BIGSERIAL', 'SMALLSERIAL'
      ],

      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '<>', '+=', '-=', '*=', '/=', '%=', '|=', '&=', '^=', '+', '-', '*', '/',
        '%', '|', '&', '^', '<<', '>>', '||', '&&'
      ],

      builtinFunctions: [
        'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING', 'LENGTH',
        'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'COALESCE',
        'ISNULL', 'NULLIF', 'CAST', 'CONVERT', 'DATE', 'TIME', 'DATETIME',
        'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'NOW', 'CURRENT_DATE',
        'CURRENT_TIME', 'CURRENT_TIMESTAMP', 'DATEADD', 'DATEDIFF', 'DATEPART'
      ],

      tokenizer: {
        root: [
          { include: '@comments' },
          { include: '@whitespace' },
          { include: '@numbers' },
          { include: '@strings' },
          { include: '@complexIdentifiers' },
          [/[;,.]/, 'delimiter'],
          [/[()]/, '@brackets'],
          [/[\w@#$]+/, {
            cases: {
              '@keywords': 'keyword',
              '@operators': 'operator',
              '@builtinFunctions': 'predefined',
              '@default': 'identifier'
            }
          }]
        ],

        whitespace: [
          [/\s+/, 'white']
        ],

        comments: [
          [/--+.*/, 'comment'],
          [/\/\*/, { token: 'comment.quote', next: '@comment' }]
        ],

        comment: [
          [/[^*/]+/, 'comment'],
          [/\*\//, { token: 'comment.quote', next: '@pop' }],
          [/./, 'comment']
        ],

        numbers: [
          [/0[xX][0-9a-fA-F]*/, 'number'],
          [/[$][+-]*\d*(\.\d*)?/, 'number'],
          [/((\d+(\.\d*)?)|(\.\d+))([eE][\-+]?\d+)?/, 'number']
        ],

        strings: [
          [/N'/, { token: 'string', next: '@string' }],
          [/'/, { token: 'string', next: '@string' }],
          [/"/, { token: 'string', next: '@stringDouble' }]
        ],

        string: [
          [/[^']+/, 'string'],
          [/''/, 'string'],
          [/'/, { token: 'string', next: '@pop' }]
        ],

        stringDouble: [
          [/[^"]+/, 'string'],
          [/""/, 'string'],
          [/"/, { token: 'string', next: '@pop' }]
        ],

        complexIdentifiers: [
          [/\[/, { token: 'identifier.quote', next: '@bracketedIdentifier' }],
          [/`/, { token: 'identifier.quote', next: '@quotedIdentifier' }]
        ],

        bracketedIdentifier: [
          [/[^\]]+/, 'identifier'],
          [/]]/, 'identifier'],
          [/]/, { token: 'identifier.quote', next: '@pop' }]
        ],

        quotedIdentifier: [
          [/[^`]+/, 'identifier'],
          [/``/, 'identifier'],
          [/`/, { token: 'identifier.quote', next: '@pop' }]
        ]
      }
    });
  };

  const formatSql = () => {
    if (editorRef.current && value.trim()) {
      try {
        const formatted = format(value, {
          language: 'sql',
          keywordCase: 'upper',
          indentStyle: 'standard',
          logicalOperatorNewline: 'before',
          expressionWidth: 50,
          linesBetweenQueries: 2
        });
        onChange(formatted);
      } catch (error) {
        console.warn('Failed to format SQL:', error);
      }
    }
  };

  return (
    <div className="relative border-2 border-border rounded-md overflow-hidden">
      {/* VS Code-like header */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          {/* <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div> */}
          <span className="text-gray-600 dark:text-gray-300 ml-2">query editor</span>
        </div>
        <div className="flex items-center gap-2">
          {onCopy && (
            <button
              onClick={onCopy}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
              disabled={!value.trim()}
            >
              Copy Query
            </button>
          )}
          <button
            onClick={formatSql}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-blue-200 dark:hover:bg-gray-600 transition-colors"
            disabled={!value.trim()}
          >
            Format SQL
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <Editor
        height={height}
        language="sql"
        theme="black-theme"
        value={value || ''}
        onChange={(val) => onChange(val || '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
          lineNumbers: (lineNumber) => `<span style="padding-right: 8px;">${lineNumber}</span>`,
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 4,
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          roundedSelection: false,
          cursorStyle: 'line',
          automaticLayout: true,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          contextmenu: true,
          mouseWheelZoom: true,
          padding: { top: 8, bottom: 8},
          lineHeight: 20,
          letterSpacing: 0.5,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false
          },
          acceptSuggestionOnCommitCharacter: true,
          acceptSuggestionOnEnter: 'on',
          accessibilitySupport: 'auto',
          suggestOnTriggerCharacters: true,
          tabCompletion: 'on',
          wordBasedSuggestions: 'matchingDocuments',
          parameterHints: {
            enabled: true
          },
          autoIndent: 'full',
          formatOnPaste: true,
          formatOnType: true,
          placeholder: !value ? placeholder : undefined
        }}
        onMount={handleEditorDidMount}
        beforeMount={(monaco) => {
          monaco.editor.defineTheme('black-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': '#000000',
              'editor.lineHighlightBackground': '#1a1a1a',
              'editorLineNumber.foreground': '#666666',
              'editorLineNumber.activeForeground': '#ffffff'
            }
          });
          monaco.editor.setTheme('black-theme');
        }}
      />
    </div>
  );
};

export default SqlEditor;
