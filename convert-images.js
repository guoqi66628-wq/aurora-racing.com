import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const imagesDir = path.join(process.cwd(), 'public', 'images');

const convertImages = async (dir) => {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await convertImages(filePath);
    } else if (/\.(png|jpg|jpeg)$/i.test(file)) {
      const ext = path.extname(file);
      const outputFilePath = filePath.replace(new RegExp(`${ext}$`, 'i'), '.webp');
      
      console.log(`Converting: ${filePath} -> ${outputFilePath}`);
      
      try {
        await sharp(filePath)
          .webp({ quality: 80 })
          .toFile(outputFilePath);
        
        // Delete original file
        fs.unlinkSync(filePath);
        console.log(`Deleted original: ${filePath}`);
      } catch (err) {
        console.error(`Failed to convert ${filePath}:`, err);
      }
    }
  }
};

convertImages(imagesDir)
  .then(() => console.log('All images converted to WebP successfully!'))
  .catch(err => console.error('Error during conversion:', err));
