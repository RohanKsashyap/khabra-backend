const imagekit = require('../config/imagekit');
const asyncHandler = require('../middleware/asyncHandler');

class ImageController {
  // Upload image to ImageKit
  uploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    try {
      // Generate unique filename
      const filename = `product_${Date.now()}_${req.file.originalname}`;
      
      console.log('Uploading to ImageKit with filename:', filename);
      console.log('File buffer size:', req.file.buffer.length);
      console.log('File mimetype:', req.file.mimetype);
      
      // Upload to ImageKit (without transformations)
      const uploadResponse = await imagekit.upload({
        file: req.file.buffer,
        fileName: filename,
        folder: '/Khabra-mlm/OUR-PRODUCTS',  // Correct folder path
        useUniqueFileName: true,
        tags: ['product', 'mlm']
      });
      
      // Generate optimized and watermarked URL using ImageKit URL transformations
      const optimizedUrl = imagekit.url({
        path: uploadResponse.filePath,
        transformation: [
          {
            width: 800,
            height: 600,
            crop: 'maintain_ratio'
          },
          {
            overlay_text: 'Khabra',
            overlay_text_font_size: 20,
            overlay_text_color: 'FFFFFF',
            overlay_opacity: 60,
            overlay_x: 20,
            overlay_y: 20
          }
        ]
      });
      
      console.log('ImageKit upload successful:', uploadResponse.name);

      res.status(200).json({
        success: true,
        data: {
          url: optimizedUrl,  // Use the optimized URL with watermark
          originalUrl: uploadResponse.url,  // Original URL without transformations
          thumbnailUrl: uploadResponse.thumbnailUrl,
          fileId: uploadResponse.fileId,
          name: uploadResponse.name
        }
      });
    } catch (error) {
      console.error('ImageKit upload error:', {
        message: error.message,
        stack: error.stack,
        details: error.response || error
      });
      res.status(500).json({
        success: false,
        error: `Failed to upload image to CDN: ${error.message}`
      });
    }
  });

  // Delete image from ImageKit
  deleteImage = asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required'
      });
    }

    await imagekit.deleteFile(fileId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  });

  // Get ImageKit authentication parameters for frontend
  getAuthParams = asyncHandler(async (req, res) => {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    
    res.status(200).json({
      success: true,
      data: authenticationParameters
    });
  });
}

module.exports = new ImageController();
