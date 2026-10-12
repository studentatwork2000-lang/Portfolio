import Hero from './components/Hero/Hero'
import IntroStatement from './components/IntroStatement/IntroStatement'
import Aesthetics from './components/Aesthetics/Aesthetics'

export default function App() {
  return (
    <>
      <Hero />
      <IntroStatement />
      {/* WorkGlimpses and its assets are preserved for when Work returns. */}
      <section id="work" className="work-placeholder" aria-label="Work" />
      <Aesthetics />
    </>
  )
}
