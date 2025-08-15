import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'adapters/prisma/index': 'src/adapters/prisma/index.ts',
    'server/next/index': 'src/server/next/index.ts',
    'react/index': 'src/react/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
    entry: {
      index: 'src/index.ts',
      'core/index': 'src/core/index.ts',
      'adapters/prisma/index': 'src/adapters/prisma/index.ts',
      'server/next/index': 'src/server/next/index.ts',
      'react/index': 'src/react/index.ts',
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [
    'react',
    'react-dom',
    'next',
    'next-auth',
    '@prisma/client',
    '@chakra-ui/react',
    '@tanstack/react-query',
    'recharts',
  ],
  esbuildOptions(options) {
    options.platform = 'node';
    options.target = 'es2022';
  },
  onSuccess: async () => {
    console.log('Build completed successfully!');
  },
});