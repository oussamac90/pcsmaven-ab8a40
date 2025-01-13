import { defineConfig } from 'vite'; // v4.3.9
import react from '@vitejs/plugin-react'; // v4.0.0
import tsconfigPaths from 'vite-tsconfig-paths'; // v4.2.0

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tsconfigPaths()
  ],

  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages', 
      '@services': '/src/services',
      '@utils': '/src/utils',
      '@hooks': '/src/hooks',
      '@store': '/src/store',
      '@types': '/src/types',
      '@assets': '/src/assets',
      '@styles': '/src/styles',
      '@config': '/src/config'
    }
  },

  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: true,
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'chart-vendor': ['recharts', 'd3-scale', 'd3-shape'],
          'form-vendor': ['react-hook-form', 'yup'],
          'util-vendor': ['date-fns', 'lodash']
        }
      }
    }
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}'
      ]
    }
  },

  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(mode),
      VITE_API_URL: JSON.stringify(process.env.VITE_API_URL),
      VITE_WS_URL: JSON.stringify(process.env.VITE_WS_URL),
      VITE_APP_VERSION: JSON.stringify(process.env.npm_package_version),
      VITE_APP_NAME: JSON.stringify('Port Community System')
    }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'recharts',
      'date-fns',
      'lodash'
    ]
  }
}));