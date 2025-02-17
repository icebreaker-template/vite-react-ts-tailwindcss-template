// import Sticky2 from './ai'
// import Sticky from './Sticky'

import Sticky from './sticky/index';
import './App.css';

const Sticky2 = Sticky;

function App() {
  return (
    <>
      <div className="container mx-auto">
        <div className="ccccc h-20"></div>
        <div className="bg-sky-100 h-[150vh] w-full aaaaa"></div>
        <div className="bg-amber-100 h-[150vh] w-full bbbbb"></div>
        <Sticky
          enabled
          top=".ccccc"
          bottomBoundary=".aaaaa"
          className="absolute top-0"
        >
          <div className="bg-red-50 inline-block p-8">1</div>
        </Sticky>
        <div className="pl-50">
          <Sticky2
            enabled
            top={50}
            bottomBoundary=".aaaaa"
            className="absolute top-0"
          >
            <div className="bg-red-200 inline-block p-8">1</div>
          </Sticky2>
        </div>
      </div>
    </>
  );
}

export default App;
