import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSvg = path.join(__dirname, '../public/favicon.svg');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // 192x192
    await sharp(inputSvg)
      .resize(192, 192)
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('Generated icon-192.png');

    // 512x512
    await sharp(inputSvg)
      .resize(512, 512)
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('Generated icon-512.png');

    // Apple touch icon (180x180)
    // Adding a background color to apple touch icon as iOS doesn't support transparent icons
    await sharp(inputSvg)
      .resize(180, 180)
      .flatten({ background: { r: 23, g: 19, b: 22 } }) // #171316
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('Generated apple-touch-icon.png');
    
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
