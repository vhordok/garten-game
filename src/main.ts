import { mount } from 'svelte'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/700.css'
import './app.css'
import App from './App.svelte'
import { initGame } from './lib/game/game'
import { initPixelUi } from './lib/ui/pixel/render'

initPixelUi()
const { offline } = initGame()

mount(App, {
  target: document.getElementById('app')!,
  props: { offline },
})
