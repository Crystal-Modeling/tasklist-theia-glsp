/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: '@eclipse-glsp',
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json'
    },
    overrides: [
        {
            files: ['lms-*', '**/lms/**', '**/notation/**'],
            rules: {
                'header/header': 'off'
            }
        }
    ]
};
