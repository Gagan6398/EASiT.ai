import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the base URL from environment or use a default for production
const BASE_URL = process.env.VITE_APP_URL || 'https://easitai-semifinal-main.vercel.app';

// Define the core routes that should be indexed by search engines
const routes = [
    '/',
    '/about',
    '/features',
    '/pricing',
    '/legal',
    '/auth'
];

function generateSitemap() {
    const today = new Date().toISOString();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    routes.forEach(route => {
        const url = `${BASE_URL}${route}`;
        xml += '  <url>\n';
        xml += `    <loc>${url}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        // Prioritize the landing page, give others a slightly lower priority
        xml += `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n`;
        xml += '  </url>\n';
    });
    
    xml += '</urlset>';

    const publicDir = path.resolve(__dirname, '../public');
    const sitemapPath = path.join(publicDir, 'sitemap.xml');

    try {
        fs.writeFileSync(sitemapPath, xml);
        console.log(`Successfully generated sitemap.xml with ${routes.length} routes at ${sitemapPath}`);
    } catch (error) {
        console.error('Error writing sitemap.xml:', error);
        process.exit(1);
    }
}

generateSitemap();
