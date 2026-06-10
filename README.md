# 🌿 Garten-Imperium

Browser-Idle-/Incremental-Game: Vom winzigen Kräuterbeet zum Garten-Imperium.
Pflanzen, warten, ernten, verkaufen, reinvestieren — inspiriert von Cookie
Clicker und Melvor Idle.

- **Spieldesign:** [GAME_DESIGN.md](GAME_DESIGN.md)
- **Architektur & Projektregeln:** [CLAUDE.md](CLAUDE.md)

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server starten
npm run check    # Typprüfung (svelte-check)
npm run build    # Produktions-Build nach dist/
```

Stack: Vite + TypeScript + Svelte 5. Kein Backend — der Spielstand liegt im
`localStorage` (mit Export/Import als Code).
