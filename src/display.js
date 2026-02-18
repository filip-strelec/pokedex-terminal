const chalk = require('chalk');
const Jimp = require('jimp');

const TYPE_COLORS = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD',
};

function colorType(type) {
  const hex = TYPE_COLORS[type] || '#FFFFFF';
  return chalk.hex(hex).bold(type.toUpperCase());
}

//USING:CHALK lib to draw the pokemon
async function renderSprite(spriteUrl, cols = 70, rows = 35) {
  try {
    const image = await Jimp.read(spriteUrl);

    const pixelH = rows * 2;
    image.resize(cols, pixelH);

    const UPPER = '▀';
    const LOWER = '▄';
    const ALPHA_THRESHOLD = 80;

    const lines = [];
    for (let y = 0; y < pixelH; y += 2) {
      let line = '';
      for (let x = 0; x < cols; x++) {
        const topColor = Jimp.intToRGBA(image.getPixelColor(x, y));
        const botColor = Jimp.intToRGBA(image.getPixelColor(x, y + 1));
        const topVis = topColor.a > ALPHA_THRESHOLD;
        const botVis = botColor.a > ALPHA_THRESHOLD;

        if (!topVis && !botVis) {
          line += ' ';
        } else if (topVis && !botVis) {
          line += `\x1b[38;2;${topColor.r};${topColor.g};${topColor.b}m${UPPER}\x1b[0m`;
        } else if (!topVis && botVis) {
          line += `\x1b[38;2;${botColor.r};${botColor.g};${botColor.b}m${LOWER}\x1b[0m`;
        } else {
          line += `\x1b[38;2;${topColor.r};${topColor.g};${topColor.b};48;2;${botColor.r};${botColor.g};${botColor.b}m${UPPER}\x1b[0m`;
        }
      }
      lines.push(line);
    }
    return lines.join('\n');
  } catch (err) {
    return chalk.gray('  [Could not render sprite]');
  }
}

function statBar(value, max = 255) {
  const barLen = 25;
  const filled = Math.round((value / max) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  let color;
  if (value >= 150) color = chalk.green;
  else if (value >= 90) color = chalk.yellow;
  else if (value >= 50) color = chalk.hex('#FFA500');
  else color = chalk.red;
  return color(bar) + chalk.white(` ${value}`);
}

function formatStatName(name) {
  const map = {
    hp: 'HP     ',
    attack: 'ATK    ',
    defense: 'DEF    ',
    'special-attack': 'SP.ATK ',
    'special-defense': 'SP.DEF ',
    speed: 'SPEED  ',
  };
  return chalk.bold(map[name] || name.padEnd(7));
}

function displayPokemonCard(pokemon) {
  const id = String(pokemon.id).padStart(4, '0');
  const name = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
  const types = pokemon.types.map((t) => colorType(t.type.name)).join(' / ');
  const height = (pokemon.height / 10).toFixed(1);
  const weight = (pokemon.weight / 10).toFixed(1);

  const lines = [];
  lines.push('');
  lines.push(chalk.cyan('═'.repeat(50)));
  lines.push(chalk.bold.white(`  #${id}  `) + chalk.bold.yellow(name.toUpperCase()));
  lines.push(chalk.cyan('─'.repeat(50)));
  lines.push(`  ${chalk.gray('Type:')}    ${types}`);
  lines.push(`  ${chalk.gray('Height:')}  ${height} m`);
  lines.push(`  ${chalk.gray('Weight:')}  ${weight} kg`);
  lines.push('');
  lines.push(chalk.bold.white('  BASE STATS'));
  lines.push(chalk.cyan('─'.repeat(50)));
  for (const s of pokemon.stats) {
    lines.push(`  ${formatStatName(s.stat.name)} ${statBar(s.base_stat)}`);
  }
  lines.push(chalk.cyan('═'.repeat(50)));
  return lines.join('\n');
}

function displayDetailedInfo(pokemon, species, abilities) {
  const lines = [];

  if (species) {
    const entry = species.flavor_text_entries.find((e) => e.language.name === 'en');
    if (entry) {
      const text = entry.flavor_text.replace(/[\n\f\r]/g, ' ');
      lines.push('');
      lines.push(chalk.bold.white('  POKÉDEX ENTRY'));
      lines.push(chalk.cyan('─'.repeat(50)));
      lines.push(chalk.italic(`  "${text}"`));
    }
  }

  // Abilities detail
  lines.push('');
  lines.push(chalk.bold.white('  ABILITIES'));
  lines.push(chalk.cyan('─'.repeat(50)));
  for (const ab of pokemon.abilities) {
    const name = ab.ability.name.replace(/-/g, ' ');
    const label = ab.is_hidden ? chalk.gray(' (hidden)') : '';
    const detail = abilities.find((a) => a.name === ab.ability.name);
    let desc = '';
    if (detail) {
      const en = detail.effect_entries.find((e) => e.language.name === 'en');
      if (en) desc = en.short_effect;
    }
    lines.push(`  ${chalk.bold.yellow('•')} ${chalk.bold(name.toUpperCase())}${label}`);
    if (desc) lines.push(`    ${chalk.gray(desc)}`);
  }

  // What games had them
  lines.push('');
  lines.push(chalk.bold.white('  GAME APPEARANCES'));
  lines.push(chalk.cyan('─'.repeat(50)));
  const games = pokemon.game_indices.map((g) => g.version.name.replace(/-/g, ' '));
  // 4 games per row
  for (let i = 0; i < games.length; i += 4) {
    const row = games.slice(i, i + 4).map((g) => chalk.white(g.padEnd(18))).join('');
    lines.push(`  ${row}`);
  }

  // Evolution info
  if (species) {
    lines.push('');
    lines.push(chalk.bold.white('  BREEDING'));
    lines.push(chalk.cyan('─'.repeat(50)));
    const eggGroups = species.egg_groups.map((e) => e.name).join(', ');
    const growthRate = species.growth_rate?.name || 'unknown';
    const captureRate = species.capture_rate;
    const happiness = species.base_happiness;
    lines.push(`  ${chalk.gray('Egg Groups:')}    ${eggGroups}`);
    lines.push(`  ${chalk.gray('Growth Rate:')}   ${growthRate}`);
    lines.push(`  ${chalk.gray('Capture Rate:')}  ${captureRate}`);
    lines.push(`  ${chalk.gray('Base Happy:')}    ${happiness}`);

    if (species.genera) {
      const genus = species.genera.find((g) => g.language.name === 'en');
      if (genus) {
        lines.push(`  ${chalk.gray('Category:')}      ${genus.genus}`);
      }
    }
  }

  // Moves info
  lines.push('');
  lines.push(chalk.bold.white('  MOVES (Level-up)'));
  lines.push(chalk.cyan('─'.repeat(50)));
  const levelMoves = [];
  for (const m of pokemon.moves) {
    for (const v of m.version_group_details) {
      if (v.move_learn_method.name === 'level-up' && v.level_learned_at > 0) {
        levelMoves.push({ name: m.move.name, level: v.level_learned_at });
        break;
      }
    }
  }
  levelMoves.sort((a, b) => a.level - b.level);
  const uniqueMoves = [...new Map(levelMoves.map((m) => [m.name, m])).values()];
  const shown = uniqueMoves.slice(0, 12);
  for (const m of shown) {
    const moveName = m.name.replace(/-/g, ' ');
    lines.push(`  ${chalk.gray(`Lv.${String(m.level).padStart(3)}`)}  ${chalk.white(moveName)}`);
  }
  if (uniqueMoves.length > 12) {
    lines.push(chalk.gray(`  ... and ${uniqueMoves.length - 12} more`));
  }

  lines.push(chalk.cyan('═'.repeat(50)));
  return lines.join('\n');
}

module.exports = { renderSprite, displayPokemonCard, displayDetailedInfo };

