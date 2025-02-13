import Sticky from './Sticky'
import './App.css'

function App() {
  return (
    <>
      <div className="container mx-auto">
        <div className="bg-sky-100 h-[150vh] w-full aaaaa">

        </div>
        <div className="bg-amber-100 h-[150vh] w-full bbbbb">

        </div>
        <Sticky enabled top={50} bottomBoundary=".aaaaa" className="absolute top-0">
          <div className="bg-red-50 inline-block p-8">1</div>
        </Sticky>
      </div>

    </>
  )
}

export default App
