import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../config/constants';

const API_URL = 'http://localhost:5001';

// Status badge component
const StatusBadge = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return { bg: '#166534', text: '#4ade80' };
      case 'awaiting_seller':
        return { bg: '#1e40af', text: '#93c5fd' };
      case 'offer_sent':
        return { bg: '#854d0e', text: '#fde047' };
      case 'awaiting_confirmation':
        return { bg: '#9a3412', text: '#fdba74' };
      case 'cancelled':
      case 'failed':
        return { bg: '#7f1d1d', text: '#f87171' };
      default:
        return { bg: '#374151', text: '#e5e7eb' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'awaiting_seller':
        return 'Awaiting Seller';
      case 'offer_sent':
        return 'Offer Sent';
      case 'awaiting_confirmation':
        return 'Awaiting Confirmation';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'failed':
        return 'Failed';
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const colors = getStatusColor();
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.875rem',
      fontWeight: '500',
      textTransform: 'uppercase'
    }}>
      {getStatusText()}
    </span>
  );
};

const TradeDetails = ({ tradeId }) => {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [steamOfferUrl, setSteamOfferUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [steamStatus, setSteamStatus] = useState(null);
  const [confirmForceOverride, setConfirmForceOverride] = useState(false);

  useEffect(() => {
    if (tradeId) {
      loadTradeDetails();
    }
  }, [tradeId]);

  const loadTradeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}`, {
        withCredentials: true
      });
      setTrade(response.data);
    } catch (err) {
      console.error('Error loading trade details:', err);
      setError(err.response?.data?.error || 'Failed to load trade details');
    } finally {
      setLoading(false);
    }
  };

  const handleSellerApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/trades/${tradeId}/seller-approve`, {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error approving trade:', err);
      setError(err.response?.data?.error || 'Failed to approve trade');
    } finally {
      setLoading(false);
    }
  };

  const handleSellerSent = async () => {
    if (!steamOfferUrl) {
      setError('Please enter the Steam trade offer URL');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/trades/${tradeId}/seller-sent`, {
        steamOfferUrl
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setSteamOfferUrl('');
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error sending trade:', err);
      setError(err.response?.data?.error || 'Failed to send trade');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/trades/${tradeId}/buyer-confirm`, {
        forceConfirm: confirmForceOverride
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error confirming trade:', err);
      
      // Handle the case where Steam verification fails
      if (err.response?.data?.requireForceConfirm) {
        setError('Warning: ' + err.response.data.error);
        setConfirmForceOverride(true);
      } else {
        setError(err.response?.data?.error || 'Failed to confirm trade');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSteamStatus = async () => {
    setIsVerifying(true);
    setSteamStatus(null);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/trades/${tradeId}/check-steam-status`, {
        withCredentials: true
      });
      
      setSteamStatus(response.data);
      
      // If the trade status has changed, refresh the whole trade
      if (response.data.status === 'accepted' && trade.status !== 'completed') {
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error checking Steam status:', err);
      setError(err.response?.data?.error || 'Failed to check Steam trade status');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelTrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_URL}/trades/${tradeId}/cancel`, {
        reason: cancelReason
      }, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setCancelReason('');
        loadTradeDetails();
      }
    } catch (err) {
      console.error('Error cancelling trade:', err);
      setError(err.response?.data?.error || 'Failed to cancel trade');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !trade) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          borderTopColor: '#4ade80',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (error && !trade) {
    return (
      <div style={{
        backgroundColor: '#7f1d1d',
        color: '#f87171',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!trade) {
    return (
      <div style={{
        backgroundColor: '#1f2937',
        padding: '16px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <p>No trade found with ID: {tradeId}</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1f2937',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#f1f1f1', margin: '0' }}>Trade #{trade._id.substring(0, 8)}</h2>
        <StatusBadge status={trade.status} />
      </div>

      {error && (
        <div style={{
          backgroundColor: '#7f1d1d',
          color: '#f87171',
          padding: '10px 16px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Trade Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Left column: Item details */}
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '8px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ color: '#f1f1f1', marginTop: '0' }}>Item</h3>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <img
              src={trade.item.imageUrl || 'https://via.placeholder.com/120'}
              alt={trade.item.marketHashName}
              style={{
                width: '120px',
                height: '90px',
                objectFit: 'contain',
                borderRadius: '4px',
                marginRight: '16px'
              }}
            />
            <div>
              <h4 style={{ color: '#f1f1f1', margin: '0 0 8px 0' }}>{trade.item.marketHashName}</h4>
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                {trade.item.wear && <span>{trade.item.wear} | </span>}
                {trade.item.rarity && <span style={{ color: getRarityColor(trade.item.rarity) }}>{trade.item.rarity}</span>}
              </div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.125rem' }}>
                  {formatCurrency(trade.price, trade.currency)}
                </span>
              </div>
            </div>
          </div>
          
          <h4 style={{ color: '#f1f1f1', margin: '16px 0 8px 0' }}>Steam Trade Details</h4>
          <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            <div>Asset ID: {trade.assetId || 'N/A'}</div>
            {trade.tradeOfferId && (
              <div style={{ marginTop: '8px' }}>
                Trade Offer ID: {trade.tradeOfferId}
                <a
                  href={`https://steamcommunity.com/tradeoffer/${trade.tradeOfferId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3b82f6',
                    marginLeft: '8px',
                    textDecoration: 'none'
                  }}
                >
                  View on Steam
                </a>
              </div>
            )}
          </div>
          
          {steamStatus && (
            <div style={{
              backgroundColor: '#0c4a6e',
              color: '#bae6fd',
              padding: '10px',
              borderRadius: '4px',
              marginTop: '16px',
              fontSize: '0.875rem'
            }}>
              <div>Steam Status: <strong>{steamStatus.status}</strong></div>
              <div style={{ marginTop: '4px' }}>{steamStatus.message}</div>
            </div>
          )}
        </div>
        
        {/* Right column: User details and actions */}
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: '#f1f1f1', margin: '0 0 8px 0' }}>Seller</h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={trade.seller.avatar || 'https://via.placeholder.com/40'}
                  alt={trade.seller.displayName}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}
                />
                <div>
                  <div style={{ color: '#f1f1f1' }}>{trade.seller.displayName}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Steam ID: {trade.sellerSteamId}</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 style={{ color: '#f1f1f1', margin: '0 0 8px 0' }}>Buyer</h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src={trade.buyer.avatar || 'https://via.placeholder.com/40'}
                  alt={trade.buyer.displayName}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    marginRight: '8px'
                  }}
                />
                <div>
                  <div style={{ color: '#f1f1f1' }}>{trade.buyer.displayName}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Steam ID: {trade.buyerSteamId}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#f1f1f1', margin: '0 0 16px 0' }}>Trade Timeline</h3>
            <div style={{ maxHeight: '150px', overflowY: 'auto', color: '#9ca3af', fontSize: '0.875rem' }}>
              {trade.statusHistory && trade.statusHistory.map((history, index) => (
                <div key={index} style={{
                  display: 'flex',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderRadius: '4px'
                }}>
                  <div style={{ minWidth: '120px' }}>
                    {new Date(history.timestamp).toLocaleString()}
                  </div>
                  <div style={{ flex: '1', marginLeft: '8px' }}>
                    <StatusBadge status={history.status} /> 
                    {history.note && <span style={{ marginLeft: '8px' }}>{history.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Action buttons based on user role and trade status */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ color: '#f1f1f1', margin: '0 0 16px 0' }}>Actions</h3>

            {/* Seller actions */}
            {trade.isUserSeller && (
              <div>
                {trade.status === 'awaiting_seller' && (
                  <button
                    onClick={handleSellerApprove}
                    disabled={loading}
                    style={{
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      width: '100%',
                      fontWeight: 'bold',
                      marginBottom: '12px'
                    }}
                  >
                    {loading ? 'Processing...' : 'Approve Trade'}
                  </button>
                )}

                {trade.status === 'offer_sent' && (
                  <div>
                    <p style={{ color: '#d1d5db', marginBottom: '8px' }}>
                      Buyer's Trade URL:
                    </p>
                    <div style={{
                      backgroundColor: '#374151',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '12px',
                      wordBreak: 'break-all',
                      fontSize: '0.875rem',
                      color: '#9ca3af'
                    }}>
                      {trade.buyer.tradeUrl}
                      <a
                        href={trade.buyer.tradeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#3b82f6',
                          marginLeft: '8px',
                          textDecoration: 'none',
                          display: 'inline-block'
                        }}
                      >
                        Open
                      </a>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label 
                        htmlFor="steamOfferUrl" 
                        style={{ 
                          display: 'block', 
                          color: '#d1d5db', 
                          marginBottom: '8px' 
                        }}
                      >
                        Enter Steam Trade Offer URL:
                      </label>
                      <input
                        id="steamOfferUrl"
                        type="text"
                        value={steamOfferUrl}
                        onChange={(e) => setSteamOfferUrl(e.target.value)}
                        placeholder="https://steamcommunity.com/tradeoffer/..."
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#374151',
                          border: '1px solid #4b5563',
                          borderRadius: '4px',
                          color: '#f1f1f1'
                        }}
                      />
                    </div>

                    <button
                      onClick={handleSellerSent}
                      disabled={loading || !steamOfferUrl}
                      style={{
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        cursor: (loading || !steamOfferUrl) ? 'not-allowed' : 'pointer',
                        width: '100%',
                        fontWeight: 'bold',
                        marginBottom: '12px',
                        opacity: (!steamOfferUrl) ? 0.7 : 1
                      }}
                    >
                      {loading ? 'Processing...' : 'I\'ve Sent the Item'}
                    </button>
                  </div>
                )}

                {(['awaiting_seller', 'offer_sent'].includes(trade.status)) && (
                  <button
                    onClick={() => {
                      const modal = document.getElementById('cancelModal');
                      if (modal) modal.style.display = 'block';
                    }}
                    style={{
                      backgroundColor: '#7f1d1d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel Trade
                  </button>
                )}
              </div>
            )}

            {/* Buyer actions */}
            {trade.isUserBuyer && (
              <div>
                {trade.status === 'awaiting_confirmation' && (
                  <div>
                    <button
                      onClick={handleBuyerConfirm}
                      disabled={loading}
                      style={{
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        width: '100%',
                        fontWeight: 'bold',
                        marginBottom: '12px'
                      }}
                    >
                      {loading ? 'Processing...' : confirmForceOverride ? 'Yes, Confirm Receipt Anyway' : 'Confirm Item Receipt'}
                    </button>

                    <button
                      onClick={handleCheckSteamStatus}
                      disabled={isVerifying}
                      style={{
                        backgroundColor: '#1d4ed8',
                        color: 'white',
                        border: 'none',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        cursor: isVerifying ? 'not-allowed' : 'pointer',
                        width: '100%',
                        fontWeight: 'bold',
                        marginBottom: '12px'
                      }}
                    >
                      {isVerifying ? 'Checking...' : 'Check Steam Trade Status'}
                    </button>
                  </div>
                )}

                {trade.status === 'awaiting_seller' && (
                  <button
                    onClick={() => {
                      const modal = document.getElementById('cancelModal');
                      if (modal) modal.style.display = 'block';
                    }}
                    style={{
                      backgroundColor: '#7f1d1d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%',
                      fontWeight: 'bold'
                    }}
                  >
                    Cancel Trade
                  </button>
                )}
              </div>
            )}

            {/* Trade completed message */}
            {trade.status === 'completed' && (
              <div style={{
                backgroundColor: '#064e3b',
                color: '#a7f3d0',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>
                  Trade completed successfully
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>
                  Completed on {new Date(trade.completedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Trade cancelled message */}
            {trade.status === 'cancelled' && (
              <div style={{
                backgroundColor: '#7f1d1d',
                color: '#fca5a5',
                padding: '12px',
                borderRadius: '4px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0', fontWeight: 'bold' }}>
                  Trade was cancelled
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem' }}>
                  {trade.statusHistory.find(h => h.status === 'cancelled')?.note || 'No reason provided'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <div id="cancelModal" style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target.id === 'cancelModal') {
          e.target.style.display = 'none';
        }
      }}>
        <div style={{
          backgroundColor: '#1f2937',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%'
        }}
        onClick={(e) => e.stopPropagation()}>
          <h3 style={{ color: '#f1f1f1', marginTop: '0' }}>Cancel Trade</h3>
          <p style={{ color: '#d1d5db' }}>
            Are you sure you want to cancel this trade? This action cannot be undone.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="cancelReason" 
              style={{ 
                display: 'block', 
                color: '#d1d5db', 
                marginBottom: '8px' 
              }}
            >
              Reason for cancellation (optional):
            </label>
            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Explain why you're cancelling this trade..."
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                color: '#f1f1f1',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => {
                const modal = document.getElementById('cancelModal');
                if (modal) modal.style.display = 'none';
              }}
              style={{
                backgroundColor: '#374151',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                width: '48%'
              }}
            >
              Go Back
            </button>
            <button
              onClick={() => {
                handleCancelTrade();
                const modal = document.getElementById('cancelModal');
                if (modal) modal.style.display = 'none';
              }}
              disabled={loading}
              style={{
                backgroundColor: '#7f1d1d',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                width: '48%'
              }}
            >
              {loading ? 'Processing...' : 'Yes, Cancel Trade'}
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          #cancelModal {
            display: none;
          }
        `}
      </style>
    </div>
  );
};

// Helper function to determine rarity color
const getRarityColor = (rarity) => {
  const rarityColors = {
    'Consumer Grade': '#b0c3d9',
    'Industrial Grade': '#5e98d9',
    'Mil-Spec Grade': '#4b69ff',
    'Restricted': '#8847ff',
    'Classified': '#d32ee6',
    'Covert': '#eb4b4b',
    'Contraband': '#e4ae39',
    '★': '#e4ae39'  // For knives
  };
  
  return rarityColors[rarity] || '#b0c3d9';
};

export default TradeDetails;