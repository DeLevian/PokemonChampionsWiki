const EMPTY_POKEMON_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0iI2UyZThlZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQ1IiBmaWxsPSIjOTQzMzIyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg==';

/** Resolve Pokémon assets through the shared alias map loaded by main.js. */
export function getPokemonSpriteUrl(pokemon, type = 'artwork') {
    if (!pokemon) return EMPTY_POKEMON_SVG;

    const id = typeof pokemon === 'object' ? pokemon.id : pokemon;
    const name = typeof pokemon === 'object' ? (pokemon.name || id) : id;
    const artworkAliases = window.entityAliases?.pokemonArtwork || {};
    const artworkFile = artworkAliases[name] || `${name}.png`;

    const paths = {
        artwork: `data/sprites/pokemon/artwork/${artworkFile}`,
        standard: `data/sprites/pokemon/standard/${id}.png`,
        animated: `data/sprites/pokemon/animated/${id}.gif`
    };

    return paths[type] || paths.artwork;
}
