const readline = require('readline');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { getPokemon, getSpecies, getAbility, getPokemonList, getSpriteUrl } = require('./src/api');
const { renderSprite, displayPokemonCard, displayDetailedInfo } = require('./src/display');
const { catchGame } = require('./src/game');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const CAUGHT_FILE = path.join(__dirname, 'caught.json');

let currentPokemon = null;
let currentId = null;
let caughtPokemon = [];

function loadCaughtPokemon() {
  try {
    if (fs.existsSync(CAUGHT_FILE)) {
      const data = JSON.parse(fs.readFileSync(CAUGHT_FILE, 'utf8'));
      caughtPokemon = (data || []).map((id) => ({ id, name: null }));
    }
  } catch { /* ignore corrupt file */ } //TODO: add error handling
}

function saveCaughtPokemon() {
  const ids = caughtPokemon.map((p) => p.id);
  fs.writeFileSync(CAUGHT_FILE, JSON.stringify(ids, null, 2));
}

function printBanner() {
  console.clear();
  console.log(chalk.red.bold(`
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║    ◓  T E R M I N A L   P O K É D E X    ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
  `));
}

function printMenu() {
  console.log(chalk.yellow('\n  What would you like to do?\n'));
  console.log(chalk.white('  [1]') + chalk.gray(' Search Pokémon by name or ID'));
  console.log(chalk.white('  [2]') + chalk.gray(' Browse Pokémon list'));
  console.log(chalk.white('  [3]') + chalk.gray(' Random Pokémon'));
  if (currentPokemon) {
    console.log(chalk.white('  [4]') + chalk.gray(` View details for ${chalk.yellow(currentPokemon.name)}`));
    console.log(chalk.white('  [5]') + chalk.gray(' Next Pokémon →'));
    console.log(chalk.white('  [6]') + chalk.gray(' ← Previous Pokémon'));
    const already = caughtPokemon.some((p) => p.id === currentPokemon.id);
    console.log(chalk.white('  [7]') + chalk.gray(` ${already ? '(already caught) ' : ''}Throw Pokéball at ${chalk.yellow(currentPokemon.name)} ◓`));
  }
  if (caughtPokemon.length > 0) {
    console.log(chalk.white('  [8]') + chalk.gray(` View caught Pokémon (${caughtPokemon.length})`));
  }
  console.log(chalk.white('  [q]') + chalk.gray(' Quit'));
  console.log('');
}

async function showPokemon(nameOrId) {
  try {
    console.log(chalk.gray('\n  Fetching Pokémon data...'));
    const pokemon = await getPokemon(nameOrId);
    currentPokemon = pokemon;
    currentId = pokemon.id;

    const spriteUrl = getSpriteUrl(pokemon.id);
    console.log(chalk.gray('  Rendering sprite...\n'));
    const sprite = await renderSprite(spriteUrl);
    console.log(sprite);
    console.log(displayPokemonCard(pokemon));
  } catch (err) {
    if (err.message.toUpperCase() === 'NOT_FOUND') {
      console.log(chalk.red(`\n  ✗ Pokémon not found: "${nameOrId}"`));
      console.log(chalk.gray('    Try a name (e.g. pikachu) or ID (e.g. 25)\n'));
    } else {
      console.log(chalk.red(`\n  ✗ ${err.message}\n`));
    }
  }
}

async function showDetails() {
  if (!currentPokemon) {
    console.log(chalk.red('\n  ✗ No Pokémon loaded. Search for one first.\n'));
    return;
  }
  console.log(chalk.gray('\n  Fetching detailed data...'));

  let species = null;
  try {
    species = await getSpecies(currentPokemon.id);
  } catch { /* ignore */ }

  const abilities = [];
  for (const ab of currentPokemon.abilities) {
    try {
      const detail = await getAbility(ab.ability.url);
      abilities.push(detail);
    } catch { /* ignore */ }
  }

  console.log(displayDetailedInfo(currentPokemon, species, abilities));
}

async function browsePokemon() {
  const limit = 20;
  let offset = currentId ? Math.floor((currentId - 1) / limit) * limit : 0;

  while (true) {
    let data;
    try {
      console.log(chalk.gray('\n  Loading list...'));
      data = await getPokemonList(offset, limit);
    } catch (err) {
      console.log(chalk.red(`\n  ✗ ${err.message}\n`));
      return;
    }
    console.log(chalk.bold.white(`\n  POKÉMON LIST (${offset + 1}–${offset + data.results.length} of ${data.count})\n`));

    data.results.forEach((p, i) => {
      const num = offset + i + 1;
      const name = p.name.charAt(0).toUpperCase() + p.name.slice(1);
      console.log(chalk.white(`  ${String(num).padStart(4)}.`) + chalk.yellow(` ${name}`));
    });

    console.log(chalk.gray('\n  [n] Next page  [p] Previous page  [number] Select  [b] Back\n'));
    const input = (await ask(chalk.cyan('  > '))).trim().toLowerCase();

    if (input === 'n' && data.next) { offset += limit; }
    else if (input === 'p' && offset >= limit) { offset -= limit; }
    else if (input === 'b') { return; }
    else if (!isNaN(input) && Number(input) > 0) {
      await showPokemon(Number(input));
      return;
    }
  }
}

async function viewCaughtCollection() {
  if (caughtPokemon.length === 0) {
    console.log(chalk.gray('\n  No Pokémon caught yet!\n'));
    return;
  }

  // Ensure names are loaded (they may be null if loaded from file)
  for (const p of caughtPokemon) {
    if (!p.name) {
      try {
        const data = await getPokemon(p.id);
        p.name = data.name;
      } catch { p.name = `pokemon-${p.id}`; }
    }
  }

  while (true) {
    console.log(chalk.bold.white('\n  ◓ CAUGHT POKÉMON') + chalk.gray(` (${caughtPokemon.length})\n`));
    console.log(chalk.cyan('  ' + '─'.repeat(50)));
    caughtPokemon.forEach((p, i) => {
      const n = p.name.charAt(0).toUpperCase() + p.name.slice(1);
      console.log(`  ${chalk.white(String(i + 1).padStart(3) + '.')} ${chalk.white(`#${String(p.id).padStart(4, '0')}`)} ${chalk.yellow(n)}`);
    });
    console.log(chalk.cyan('  ' + '─'.repeat(50)));
    console.log(chalk.gray('\n  [number] View Pokémon  [b] Back\n'));

    const input = (await ask(chalk.cyan('  > '))).trim().toLowerCase();
    if (input === 'b') return;

    const idx = parseInt(input, 10);
    if (!isNaN(idx) && idx >= 1 && idx <= caughtPokemon.length) {
      await showPokemon(caughtPokemon[idx - 1].id);
      return;
    }
  }
}

async function main() {
  loadCaughtPokemon();
  printBanner();

  while (true) {
    printMenu();
    const choice = (await ask(chalk.cyan('  > '))).trim().toLowerCase();

    switch (choice) {
      case '1': {
        const query = (await ask(chalk.cyan('  Enter name or ID: '))).trim();
        if (query) await showPokemon(query);
        break;
      }
      case '2':
        await browsePokemon();
        break;
      case '3': {
        const randId = Math.floor(Math.random() * 1025) + 1;
        await showPokemon(randId);
        break;
      }
      case '4':
        await showDetails();
        break;
      case '5':
        if (currentId) await showPokemon(currentId + 1);
        else console.log(chalk.red('\n  ✗ No Pokémon loaded.\n'));
        break;
      case '6':
        if (currentId && currentId > 1) await showPokemon(currentId - 1);
        else console.log(chalk.red('\n  ✗ Cannot go below #1.\n'));
        break;
      case '7':
        if (currentPokemon) {
          const result = await catchGame(currentPokemon, rl);
          if (result.caught && !caughtPokemon.some((p) => p.id === currentPokemon.id)) {
            caughtPokemon.push({ id: currentPokemon.id, name: currentPokemon.name });
            saveCaughtPokemon();
          }
        } else {
          console.log(chalk.red('\n  ✗ No Pokémon loaded.\n'));
        }
        break;
      case '8':
        await viewCaughtCollection();
        break;
      case 'q':
      case 'quit':
      case 'exit':
        console.log(chalk.yellow('\n  Goodbye, Trainer! ⚡\n'));
        rl.close();
        process.exit(0);
      default:
        console.log(chalk.red('\n  ✗ Invalid option. Try again.\n'));
    }
  }
}

main().catch((err) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});

