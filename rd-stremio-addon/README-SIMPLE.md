# Brazuca RD - Simple DDD Stremio Addon

A Stremio addon that proxies Brazuca Torrents magnets through Real-Debrid into direct HTTP streams.

## Architecture

This addon follows a **simplified Domain Driven Design** approach with clear separation of concerns:

### Domains

- **Real-Debrid Domain** (`domains/realdebrid/`) - Handles torrent processing through Real-Debrid API
- **Source Domain** (`domains/source/`) - Fetches streams from source addons (Brazuca Torrents)
- **Stream Domain** (`domains/stream/`) - Formats streams for Stremio client
- **Configuration Domain** (`domains/configuration/`) - Manages app configuration

### Key Principles

- **Simple separation of concerns** - Each domain handles one responsibility
- **No over-engineering** - Just basic interfaces and classes
- **Easy to maintain** - Clear structure without complex abstractions
- **Clean code** - Well-named functions and proper error handling

## Development

### Run the simple DDD version:
```bash
npm run dev:simple
```

### Run the original version:
```bash
npm run dev
```

## Features

- ✅ Proxies Brazuca Torrents through Real-Debrid
- ✅ Dynamic manifest based on configuration
- ✅ Configuration page for Real-Debrid token
- ✅ Hot reloading development server
- ✅ Clean domain separation
- ✅ Simple, maintainable code

## Credits

Credits to the Brazuca Torrents addon author for the original torrent source.
