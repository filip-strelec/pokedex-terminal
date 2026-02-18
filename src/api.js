const chalk = require('chalk');

const BASE_URL = 'https://pokeapi.co/api/v2';
const SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(
      err.message?.includes('fetch') || err.code.toUpperCase() === 'ENOTFOUND'
        ? 'Network error – check your internet connection'
        : `Request failed: ${err.message}`
    );
  }
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error(`API returned status ${res.status}`);
  return res.json();
}

async function getPokemon(nameOrId) {
  const query = String(nameOrId).toLowerCase().trim();
  return fetchJson(`${BASE_URL}/pokemon/${query}`);
}

async function getSpecies(nameOrId) {
  const query = String(nameOrId).toLowerCase().trim();
  return fetchJson(`${BASE_URL}/pokemon-species/${query}`);
}

async function getAbility(url) {
  return fetchJson(url);
}

async function getPokemonList(offset = 0, limit = 20) {
  return fetchJson(`${BASE_URL}/pokemon?offset=${offset}&limit=${limit}`);
}

function getSpriteUrl(id) {
  return `${SPRITE_URL}/${id}.png`;
}

module.exports = { getPokemon, getSpecies, getAbility, getPokemonList, getSpriteUrl };

