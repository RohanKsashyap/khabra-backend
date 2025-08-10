const ImageKit = require('imagekit');

console.log('ImageKit Configuration:');
console.log('PUBLIC_KEY:', process.env.IMAGEKIT_PUBLIC_KEY ? 'LOADED' : 'MISSING');
console.log('PRIVATE_KEY:', process.env.IMAGEKIT_PRIVATE_KEY ? 'LOADED' : 'MISSING');
console.log('URL_ENDPOINT:', process.env.IMAGEKIT_URL_ENDPOINT || 'MISSING');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

module.exports = imagekit;
