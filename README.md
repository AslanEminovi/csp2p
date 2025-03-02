# CS2 Marketplace (CS2P2P)

A peer-to-peer marketplace for CS2 (Counter-Strike 2) items with Steam integration, featuring a fully localized interface for Georgian users with GEL currency support alongside USD.

## Features

- **Steam Integration**: Authentication and inventory sync through Steam API
- **Item Marketplace**: Browse, buy, and sell CS2 items with price history tracking
- **Trade System**: Secure peer-to-peer trading with escrow and dispute resolution
- **Wallet System**: Supports both USD and GEL currencies
- **User Verification**: Three-tier verification system for increased security and limits
- **Internationalization**: Georgian and English language support
- **3D Item Cards**: Interactive 3D item previews using CSS3D transforms
- **Real-time Notifications**: WebSocket-powered updates for trades, offers, and marketplace activity

## Technologies

- **Frontend**: React, React Router
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: Passport.js with Steam OAuth
- **API Integration**: Steam Web API
- **Real-time Updates**: Socket.io

## Deployment Instructions for Render.com

### Backend Deployment

1. Create a new Render.com account at [render.com](https://render.com).
2. In your dashboard, click "New" and select "Web Service".
3. Connect your GitHub repository or use the "Manual Deploy" option.
4. Configure the service with the following settings:
   - **Name**: cs2-marketplace-api
   - **Root Directory**: server
   - **Build Command**: npm install
   - **Start Command**: npm start
   - **Environment Variables**: Set up the following variables:
     ```
     PORT=10000
     MONGO_URI=mongodb+srv://eminoviaslan:asqo-140@csgeorgia.2hjvj.mongodb.net/cs2marketplace?retryWrites=true&w=majority&appName=CSGEorgia
     SESSION_SECRET=cs2marketplaceSecretKey789456123
     STEAMWEBAPI_KEY=FSWJNSWYW8QSAQ6W
     STEAM_API_KEY=F754A63D38C9F63C247615D6F88D868C
     CALLBACK_URL=https://cs2-marketplace-api.onrender.com/auth/steam/return
     API_URL=https://cs2-marketplace-api.onrender.com
     CLIENT_URL=https://cs2-marketplace.onrender.com
     ```
5. Click "Create Web Service" and wait for deployment.

### Frontend Deployment

1. In your Render.com dashboard, click "New" and select "Static Site".
2. Connect your GitHub repository or use the "Manual Deploy" option.
3. Configure the site with the following settings:
   - **Name**: cs2-marketplace
   - **Root Directory**: client
   - **Build Command**: npm install && npm run build
   - **Publish Directory**: build
   - **Environment Variables**: Set up the following variables:
     ```
     REACT_APP_API_URL=https://cs2-marketplace-api.onrender.com
     ```
4. Click "Create Static Site" and wait for deployment.

### Post-Deployment Setup

1. In your Steam Developer Dashboard, update the allowed callback URL to:
   ```
   https://cs2-marketplace-api.onrender.com/auth/steam/return
   ```

2. Update your MongoDB connection settings if needed.

3. Test the application by navigating to:
   ```
   https://cs2-marketplace.onrender.com
   ```

## Local Development Setup

### Prerequisites

- Node.js (v14+)
- MongoDB
- Steam API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AslanEminovi/csp2p.git
   cd csp2p
   ```

2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

4. Copy the example environment file and update with your values:
   ```bash
   cp .env.example .env
   ```

5. Start the MongoDB service:
   ```bash
   # On most systems
   sudo service mongod start
   # Or
   mongod
   ```

6. Start the development server:
   ```bash
   # Start backend (from server directory)
   npm run dev

   # Start frontend (from client directory)
   npm start
   ```

## API Routes

### Authentication
- `GET /auth/steam`: Initiate Steam login
- `GET /auth/steam/return`: Steam login callback
- `GET /auth/user`: Get current user data
- `GET /auth/logout`: Log out

### User 
- `GET /user/profile`: Get user profile
- `PUT /user/settings`: Update user settings
- `GET /user/notifications`: Get user notifications
- `PUT /user/notifications/read`: Mark notifications as read

### Inventory
- `GET /inventory/my`: Get user's Steam inventory

### Marketplace
- `GET /marketplace`: Get all marketplace listings
- `POST /marketplace/list`: List an item for sale
- `POST /marketplace/buy/:itemId`: Buy an item
- `GET /marketplace/my-listings`: Get user's listings
- `PUT /marketplace/cancel/:itemId`: Cancel a listing
- `PUT /marketplace/update-price/:itemId`: Update item price

### Trades
- `GET /trades/history`: Get trade history
- `GET /trades/:tradeId`: Get specific trade details
- `PUT /trades/:tradeId/seller-approve`: Seller approves trade
- `PUT /trades/:tradeId/seller-sent`: Seller confirms item sent
- `PUT /trades/:tradeId/buyer-confirm`: Buyer confirms receipt
- `PUT /trades/:tradeId/cancel`: Cancel a trade
- `PUT /trades/:tradeId/check-steam-status`: Check Steam trade status

### Wallet
- `GET /wallet/balance`: Get wallet balance
- `GET /wallet/transactions`: Get transaction history
- `POST /wallet/deposit`: Deposit funds
- `POST /wallet/withdraw`: Withdraw funds
- `POST /wallet/exchange`: Exchange between currencies

## WebSocket Events

- `notification`: Real-time notifications
- `trade_update`: Updates on trade status changes
- `market_update`: Updates for marketplace listings
- `inventory_update`: Changes to user's inventory
- `wallet_update`: Updates to wallet balance