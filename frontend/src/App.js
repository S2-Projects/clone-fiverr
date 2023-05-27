import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import GigsView from './views/GigsView';
import AddGig from './views/AddGig';
import GigDetails from './views/GigDetails';
import Footer from './components/Footer';

  
function App() {
  return(
  <Router>
    <Navbar />
    <Routes>
      <Route path='/' exact element={<GigsView/>} />
      <Route path='/gigs/cat/:id' exact element={<GigsView/>} />
      <Route path='/gigs/add' element={<AddGig/>} />
      <Route path='/gigs/view/:id' element={<GigDetails/>} />
    </Routes>
    <Footer/>
  </Router>
  )
}

export default App;
