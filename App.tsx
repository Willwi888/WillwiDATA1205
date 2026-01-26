
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Database from './pages/Database';
import AddSong from './pages/AddSong';
import SongDetail from './pages/SongDetail';
import Interactive from './pages/Interactive';
import About from './pages/About';
import AdminDashboard from './pages/AdminDashboard';
import ChatWidget from './components/ChatWidget';
import { DataProvider } from './context/DataContext';
import { UserProvider } from './context/UserContext';
import { LanguageProvider } from './context/LanguageContext';

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <UserProvider>
          <DataProvider>
              <HashRouter>
              <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/database" element={<Database />} />
                    <Route path="/add" element={<AddSong />} />
                    <Route path="/song/:id" element={<SongDetail />} />
                    <Route path="/interactive" element={<Interactive />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Routes>
                  <ChatWidget />
              </Layout>
              </HashRouter>
          </DataProvider>
      </UserProvider>
    </LanguageProvider>
  );
};

export default App;
