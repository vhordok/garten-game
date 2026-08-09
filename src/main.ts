import { mount } from 'svelte'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/700.css'
import './app.css'
import App from './App.svelte'
import { initGame } from './lib/game/game'
import { initPixelUi } from './lib/ui/pixel/render'

initPixelUi()
// Blocking: loads the save and replays the offline catch-up. The boot screen in
// index.html is already painted at this point, so a returning player sees the
// garden loading instead of an empty page (PHASE 96).
const { offline } = initGame()

mount(App, {
  target: document.getElementById('app')!,
  props: { offline },
})

document.getElementById('boot')?.remove()
