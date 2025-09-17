const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with your credentials from the dashboard
cloudinary.config({ 
  cloud_name: 'dsaueswxp', 
  api_key: '736132676618158', 
  api_secret: 'OhC-4eicXHJ0lpBtuYHUzdQ04eg' 
});

// Set up the storage engine for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ocean-hazard-reports', // This will create a folder in Cloudinary for your files
    allowed_formats: ['jpeg', 'png', 'jpg', 'mp4'], // Specify allowed file types
  },
});

module.exports = {
  cloudinary,
  storage,
};