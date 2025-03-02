import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import socketService from './services/socketService';

// Pages
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import Profile from './pages/Profile';
import TradeDetailPage from './pages/TradeDetailPage';

// Components
import Navbar from './components/Navbar';
import SteamSettings from './components/SteamSettings';
import TradeHistory from './components/TradeHistory';
import NotificationCenter from './components/NotificationCenter';
import LanguageSwitcher from './components/LanguageSwitcher';

// Import constants
import { API_URL } from './config/constants';

// Auth-protected route component
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Page wrapper (removed animations)
const PageWrapper = ({ children }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/auth/user`, { withCredentials: true });
      if (res.data.authenticated) {
        setUser(res.data.user);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.get(`${API_URL}/auth/logout`, { withCredentials: true });
      setUser(null);
      navigate('/');
      
      // Show notification
      if (window.showNotification) {
        window.showNotification(
          t('common.signOut'),
          t('common.success'),
          'SUCCESS'
        );
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Get wallet balance from API
  const refreshWalletBalance = async () => {
    if (user) {
      try {
        const response = await axios.get(`${API_URL}/wallet/balance`, { withCredentials: true });
        if (response.data) {
          setUser({
            ...user,
            walletBalance: response.data.balance.USD,
            walletBalanceGEL: response.data.balance.GEL
          });
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      }
    }
  };

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (user) {
      // Initialize WebSocket connection
      socketService.init();
      
      // Setup event listeners
      const handleConnectionStatus = (status) => {
        setSocketConnected(status.connected);
        console.log('WebSocket connection status:', status);
      };

      const handleNotification = (notification) => {
        // Add the notification to state
        setNotifications(prevNotifications => [notification, ...prevNotifications]);
        
        // Show notification UI if available
        if (window.showNotification) {
          window.showNotification(
            notification.title,
            notification.message,
            notification.type === 'trade' ? 'INFO' : 'SUCCESS'
          );
        }
      };

      const handleTradeUpdate = (tradeData) => {
        console.log('Trade update:', tradeData);
        // Implement trade update logic - you might need to update the trade list
        // or refresh data in the current page if it's a trade page
      };

      const handleInventoryUpdate = (inventoryData) => {
        console.log('Inventory update:', inventoryData);
        // If user is on the inventory page, you might want to trigger a refresh
      };

      const handleWalletUpdate = (walletData) => {
        console.log('Wallet update:', walletData);
        // Update user's wallet balance
        setUser(prevUser => ({
          ...prevUser,
          walletBalance: walletData.balance,
          walletBalanceGEL: walletData.balanceGEL
        }));
      };

      const handleMarketUpdate = (marketData) => {
        console.log('Market update:', marketData);
        // If user is on the marketplace page, you might want to trigger a refresh
        // or update specific items in the list
      };

      // Register all event listeners
      const unsubscribeConnectionStatus = socketService.on('connection_status', handleConnectionStatus);
      const unsubscribeNotification = socketService.on('notification', handleNotification);
      const unsubscribeTradeUpdate = socketService.on('trade_update', handleTradeUpdate);
      const unsubscribeInventoryUpdate = socketService.on('inventory_update', handleInventoryUpdate);
      const unsubscribeWalletUpdate = socketService.on('wallet_update', handleWalletUpdate);
      const unsubscribeMarketUpdate = socketService.on('market_update', handleMarketUpdate);

      // Clean up function to remove all listeners when component unmounts
      return () => {
        unsubscribeConnectionStatus();
        unsubscribeNotification();
        unsubscribeTradeUpdate();
        unsubscribeInventoryUpdate();
        unsubscribeWalletUpdate();
        unsubscribeMarketUpdate();
        
        // Disconnect socket when user logs out or component unmounts
        socketService.disconnect();
      };
    }
  }, [user]);

  // Fetch wallet balance when user is loaded
  useEffect(() => {
    if (user) {
      refreshWalletBalance();
    }
  }, [user]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(45deg, #581845 0%, #900C3F 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <Navbar user={user} onLogout={handleLogout} />
      
      {/* WebSocket connection indicator */}
      {user && (
        <div 
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: socketConnected ? '#4ade80' : '#ef4444',
            boxShadow: `0 0 10px ${socketConnected ? 'rgba(74, 222, 128, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
          title={socketConnected ? 'Real-time connection active' : 'Real-time connection inactive'}
        />
      )}
      
      {/* Background patterns */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(circle at 15% 50%, rgba(74, 222, 128, 0.05) 0%, transparent 60%), radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.05) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      {/* CSS for spinner animation */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .spinner {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
      
      {/* These UI controls will be moved to the Navbar */}
      
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '80vh'
        }}>
          <div 
            className="spinner"
            style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              borderTopColor: '#4ade80',
              animation: 'spin 1s linear infinite'
            }}
          />
        </div>
      }>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '80vh',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div 
              className="spinner"
              style={{
                width: '80px',
                height: '80px',
                border: '4px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                borderTopColor: '#4ade80',
                borderRightColor: 'rgba(56, 189, 248, 0.5)',
                animation: 'spin 1s linear infinite'
              }}
            />
            <p
              style={{ 
                color: '#e2e8f0', 
                fontSize: '1.2rem',
                fontWeight: '500',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
              }}
            >
              {t('common.loading')}
            </p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={
              <PageWrapper key="home">
                <Home user={user} />
              </PageWrapper>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="inventory">
                  <Inventory />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/marketplace" element={
              <PageWrapper key="marketplace">
                <Marketplace user={user} />
              </PageWrapper>
            } />
            
            <Route path="/my-listings" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="my-listings">
                  <MyListings />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/settings/steam" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="steam-settings">
                  <SteamSettings />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/trades" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="trades">
                  <TradeHistory />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/trades/:tradeId" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="trade-detail">
                  <TradeDetailPage />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute user={user}>
                <PageWrapper key="profile">
                  <Profile user={user} onBalanceUpdate={refreshWalletBalance} />
                </PageWrapper>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Suspense>
      
      {/* Audio elements will be added later */}
    </div>
  );
}

export default App;
