import { Config } from '@remotion/cli/config'

// Le code source utilise des imports en `.js` (style NodeNext) qui pointent en
// réalité vers des fichiers `.ts`/`.tsx`. Webpack 5 sait gérer ce mapping via
// `resolve.extensionAlias`. Sans ça, le studio plante avec "Can't resolve './Root.js'".
Config.overrideWebpackConfig((current) => ({
  ...current,
  resolve: {
    ...current.resolve,
    extensionAlias: {
      ...(current.resolve?.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    },
  },
}))
