const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.resolve(__dirname, '../public/images/exercises');
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/images-index.json');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const isHidden = fileName => fileName.startsWith('.');

const readImages = () => {
  try {
    const entries = fs.readdirSync(IMAGES_DIR, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => !isHidden(name))
      .filter(name => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error('Failed to read images directory:', error.message);
    return [];
  }
};

const writeOutput = fileNames => {
  const payload = JSON.stringify(fileNames, null, 2);
  try {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, `${payload}\n`, 'utf8');
    console.log(`Wrote ${fileNames.length} entries to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('Failed to write output file:', error.message);
  }
};

const main = () => {
  const images = readImages();
  writeOutput(images);
};

main();
