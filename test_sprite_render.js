const { getSpriteUrl } = require('./src/api');
const { renderSprite } = require('./src/display');

(async () => {
  const url = getSpriteUrl(6); // charizard with CHALK lib
  console.log('URL:', url);
  const sprite = await renderSprite(url);
  console.log(sprite);
  process.exit(0);
})();

