# Tackle Box, a WEBFISHING save editor

Open `index.html` in a browser. Nothing to install, and your files stay on your computer.

Built for WEBFISHING 1.12.

## What it does

- **Simple view**: drop your save, press *Unlock everything*, save. Your outfit is kept, stackable items are filled to 99, and each kind of item is put together (optional).
- **Advanced view**: money, rank, camp, inventory, fish maker, journal, cosmetics, quests, gear, game settings, raw data.
- **Rearrange the inventory** by dragging (or Alt + arrow keys), sort a tab, or organize everything by kind. The game has no way to do this.
- **Fish maker**: one custom fish, or every fish in chosen rarities at the smallest and biggest possible size.
- **Outfit preview** drawn from your save.
- **Secret items**: what is hidden in the game, what it is, and where to see it.
- **Start fresh**: turn a save into a new game and keep the parts you choose.

## How it protects your save

- A byte-for-byte copy of every file you open is kept in *Backups* before you can edit it.
- The edited file cannot be downloaded until you have downloaded a backup of the original and confirmed the game is closed.
- Every save is written, read back and compared, and checked for things that would crash the game.
- A file that cannot be rewritten exactly is opened read-only.
- Undo, a full list of changes, and a warning before unsaved edits are lost.

Backups live in the browser, so download the ones you care about. The game's own `.backup` file is not an older copy: the game rewrites it on every save.

## Layout

| Folder | Contents |
|---|---|
| `js/core` | Save format reader and writer, diff, zip |
| `js/data` | Game data. `items.js` and `cosmetics.js` are generated |
| `js/app` | Logic and shared interface: edits, fish rules, backups, safety checks, outfit preview |
| `js/views` | One file per page |
| `css` | Colours, base, components, pages |
| `assets/game` | Game pictures |
| `tests` | `node tests/run.js [folder of saves]` |
| `tools` | `extract-game-data.js` rebuilds the data from an installed game |

Scripts are plain scripts rather than modules so the page works straight from disk.

## Credits

Based on [NotNite's webfishing-save-editor](https://github.com/NotNite/webfishing-save-editor) (MIT, see `LICENSE`).
Pictures in `assets/game` are original WEBFISHING content by lamedeveloper and are not covered by the license. This is an unofficial fan tool.
