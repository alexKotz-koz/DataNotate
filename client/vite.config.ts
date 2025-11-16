import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:5001",
                changeOrigin: true, // Changes the origin of the host header to the target URL
                secure: false // Disables SSL certificate verification for the proxy target
            }
        }
    }
})
