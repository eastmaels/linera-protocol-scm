import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import Navigation from './components/Navigation';
import LandingPage from './pages/LandingPage';
import BrowseProducts from './pages/BrowseProducts';
import RegisterProduct from './pages/RegisterProduct';
import ManufacturerRegistry from './pages/ManufacturerRegistry';
import { ManufacturerProvider } from './context/ManufacturerContext';

const { Footer } = Layout;

function App({ chainId, owner }) {
  return (
    <ManufacturerProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/browse" element={<BrowseProducts chainId={chainId} owner={owner} />} />
          <Route path="/register" element={<RegisterProduct chainId={chainId} owner={owner} />} />
          <Route path="/manufacturers" element={<ManufacturerRegistry />} />
        </Routes>
        <Footer style={{ textAlign: 'center' }}>
          Linera Supply Chain Management ©2025 - Powered by Linera Blockchain
        </Footer>
      </Layout>
    </ManufacturerProvider>
  );
}

export default App;
