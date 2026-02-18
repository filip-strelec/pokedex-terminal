# ◓ Terminal Pokédex

A terminal-based Pokédex that displays Pokémon data with ASCII art sprites, powered by the [PokéAPI](https://pokeapi.co/).

## Features

- **Search** Pokémon by name or ID
- **Browse** the full Pokémon list with pagination
- **Random** Pokémon lookup
- **ASCII art sprites** rendered directly in the terminal using half-block characters
- **Detailed view** including Pokédex entry, abilities, base stats, breeding info, moves, and game appearances
- **Color-coded** types and stat bars via [Chalk](https://github.com/chalk/chalk)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended for built-in `fetch`)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/filip-strelec/pokedex-terminal.git
cd pokedex-terminal

# Install dependencies
npm install

# Run the app
npm start
```

## Usage

Once running, you'll see an interactive menu:

```
  [1] Search Pokémon by name or ID
  [2] Browse Pokémon list
  [3] Random Pokémon
  [4] View details for <current Pokémon>
  [5] Next Pokémon →
  [6] ← Previous Pokémon
  [q] Quit
```



## Dependencies

| Package | Purpose |
|---------|---------|
| [`chalk`](https://www.npmjs.com/package/chalk) | Terminal string styling (colors, bold, etc.) |
| [`jimp`](https://www.npmjs.com/package/jimp) | Image processing for ASCII sprite rendering |

## API

All Pokémon data is fetched from the [PokéAPI v2](https://pokeapi.co/docs/v2). Official artwork sprites come from the [PokeAPI/sprites](https://github.com/PokeAPI/sprites) repository.

