import Hero from './components/Hero/Hero'
import IntroStatement from './components/IntroStatement/IntroStatement'
import Aesthetics from './components/Aesthetics/Aesthetics'
import WorkStarField from './components/WorkStarField/WorkStarField'

export default function App() {
  return (
    <>
      <Hero />
      <IntroStatement />
      {/* WorkGlimpses and its assets are preserved for when Work returns. */}
      <WorkStarField />
      <Aesthetics />
    </>
  )
}
