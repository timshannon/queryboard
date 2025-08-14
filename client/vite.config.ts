import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue({
        template: {
            compilerOptions: {
                // treat all tags with a dash as custom elements
                isCustomElement: (tag) => tag.startsWith("clr-") || tag.startsWith("cds-")
            }
        }
    })],
    server: {
        port: 8080,
    }
})
