const chalk = require('chalk');
const { getSpecies, getSpriteUrl } = require('./api');
const { renderSprite } = require('./display');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BALL_SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

function getDifficulty(captureRate) {
  if (captureRate >= 200) return { label: 'EASY', color: chalk.green, zone: 19, ball: 'poke-ball' };
  if (captureRate >= 120) return { label: 'MEDIUM', color: chalk.yellow, zone: 15, ball: 'great-ball' };
  if (captureRate >= 60) return { label: 'HARD', color: chalk.hex('#FFA500'), zone: 11, ball: 'ultra-ball' };
  if (captureRate >= 20) return { label: 'VERY HARD', color: chalk.red, zone: 7, ball: 'ultra-ball' };
  return { label: 'LEGENDARY', color: chalk.magenta, zone: 5, ball: 'master-ball' };
}

function getBallUrl(ballName) {
  return `${BALL_SPRITES}/${ballName}.png`;
}

function ballDisplayName(ballName) {
  return ballName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function runTimingBar(targetWidth, speed) {
  const W = 41;
  const start = Math.floor((W - targetWidth) / 2);
  const end = start + targetWidth;

  return new Promise((resolve) => {
    let pos = 0;
    let dir = 1;

    const draw = () => {
      let bar = '';
      for (let i = 0; i < W; i++) {
        if (i === pos) bar += chalk.bold.white('◉');
        else if (i >= start && i < end) bar += chalk.green('▓');
        else bar += chalk.gray('░');
      }
      process.stdout.write(`\r  ${bar}`);
    };

    const iv = setInterval(() => {
      pos += dir;
      if (pos >= W - 1) dir = -1;
      if (pos <= 0) dir = 1;
      draw();
    }, speed);

    draw();

    const handler = (data) => {
      clearInterval(iv);
      process.stdin.setRawMode(false);
      process.stdin.removeListener('data', handler);
      if (data[0] === 3) process.exit(0); // Ctrl+C

      const hit = pos >= start && pos < end;
      const center = (start + end) / 2;
      const acc = hit ? Math.max(0.1, 1 - Math.abs(pos - center) / (targetWidth / 2)) : 0;
      process.stdout.write('\n');
      resolve({ hit, accuracy: acc });
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', handler);
  });
}

async function throwAnimation() {
  const ball = chalk.red('◓');

  // Arc animation
  const positions = [28, 24, 20, 16, 13, 10, 8, 7, 6];
  for (const x of positions) {
    process.stdout.write(`\r  ${' '.repeat(50)}\r  ${' '.repeat(x)}${ball}`);
    await sleep(60);
  }

  // Bounce
  await sleep(100);
  process.stdout.write(`\r  ${' '.repeat(6)} `);
  await sleep(100);
  process.stdout.write(`\r  ${' '.repeat(6)}${ball}`);
  await sleep(200);
  process.stdout.write('\n');
}

async function shakeAnimation(shakeCount) {
  const ball = chalk.red('◓');

  // Wobble 3 times
  for (let i = 0; i < 3; i++) {
    process.stdout.write(`\r  ${' '.repeat(8)}${ball}`);
    await sleep(200);
    process.stdout.write(`\r  ${' '.repeat(12)}${ball}`);
    await sleep(200);
  }

  // Show shake count
  process.stdout.write(`\r  ${' '.repeat(10)}${ball}  ${chalk.yellow('● '.repeat(shakeCount))}\n`);
  await sleep(400);
}

async function successAnimation(name, pokemonId, ballName) {
  console.log('\n' + chalk.gray('  Catching...'));

  // Render sprites in parallel
  const [ballArt, pokemonArt] = await Promise.all([
    renderSprite(getBallUrl(ballName), 20, 10),
    renderSprite(getSpriteUrl(pokemonId), 40, 20),
  ]);

  // Show ball sprite
  console.log('');
  ballArt.split('\n').forEach(line => console.log(`      ${line}`));
  await sleep(400);

  // Success message
  const sparkles = chalk.yellowBright('     ✦  ·  ★  ·  ✦  ·  ★  ·  ✦');
  console.log('\n' + sparkles);
  console.log('\n' + chalk.bold.green(`     Gotcha! ${name.toUpperCase()} was caught!`));
  console.log(chalk.gray(`     Caught with: ${chalk.white(ballDisplayName(ballName))}`));

  // Show Pokémon sprite
  console.log('\n' + pokemonArt);
  console.log('\n' + sparkles + '\n');

  await sleep(1200);
}

async function catchGame(pokemon, rl) {
  rl.pause();

  // Get capture rate
  let captureRate = 45;
  try {
    const species = await getSpecies(pokemon.id);
    captureRate = species.capture_rate ?? 45;
  } catch {}

  const diff = getDifficulty(captureRate);
  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

  // Header
  console.log(chalk.bold.red(`\n  ╔${'═'.repeat(44)}╗`));
  console.log(chalk.bold.red('  ║') + chalk.bold.white(`   Wild ${name.toUpperCase()} appeared!`.padEnd(44)) + chalk.bold.red('║'));
  console.log(chalk.bold.red(`  ╚${'═'.repeat(44)}╝`));
  console.log(`\n  Difficulty: ${diff.color(diff.label)}  (catch rate ${captureRate}/255)`);
  console.log(`  Using: ${chalk.white(ballDisplayName(diff.ball))}\n`);

  const MAX_BALLS = 5;
  let caught = false;

  // Throw loop
  for (let ball = 0; ball < MAX_BALLS && !caught; ball++) {
    console.log(chalk.red(`\n  Pokéballs: ${'◓ '.repeat(MAX_BALLS - ball).trim()}`));
    console.log(chalk.gray(`  Press any key when ${chalk.white('◉')} is inside the ${chalk.green('▓▓▓')} zone!\n`));

    const speed = Math.round(35 + (captureRate / 255) * 35);
    const result = await runTimingBar(diff.zone, speed);

    if (!result.hit) {
      console.log(chalk.red('\n  ✗ Missed!\n'));
      await sleep(500);
      continue;
    }

    // Show throw quality
    const quality = result.accuracy > 0.8 ? chalk.yellow('★ Excellent!')
                  : result.accuracy > 0.5 ? chalk.cyan('● Great!')
                  : chalk.white('○ Nice!');
    console.log(`\n  ${quality}`);
    await sleep(300);

    await throwAnimation();

    // Calculate catch probability
    const bonus = 1.5 + result.accuracy * 1.5;
    const catchProb = Math.min(0.95, (captureRate * bonus) / 255);

    // Shake check (3 shakes needed)
    let shakes = 0;
    for (let i = 1; i <= 3; i++) {
      await shakeAnimation(i);
      if (Math.random() < catchProb) {
        shakes++;
      } else {
        break;
      }
    }

    if (shakes === 3) {
      caught = true;
      await successAnimation(name, pokemon.id, diff.ball);
    } else {
      console.log(chalk.red(`\n  ${name} broke free!\n`));
      await sleep(400);
    }
  }

  if (!caught) {
    console.log(chalk.gray(`\n  ${name} got away...\n`));
  }

  rl.resume();
  return { caught };
}

module.exports = { catchGame };

