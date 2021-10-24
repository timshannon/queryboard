import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue({
        template: {
            compilerOptions: {
                isCustomElement: tag => tag.startsWith("cds-")
            }
        }
    })],
    server: {
        port: 8070,
        strictPort: true,
        proxy: {
            '/v1': 'http://localhost:8071',
        },
    },
});
