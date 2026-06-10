import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initGame } from './lib/game/game'

const { offline } = initGame()

mount(App, {
  target: document.getElementById('app')!,
  props: { offline },
})
