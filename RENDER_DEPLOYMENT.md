# CS2 Marketplace Deployment Guide for Render.com

Follow these steps to deploy your CS2 Marketplace application to Render.com.

## Prerequisites

1. Create a Render.com account at [render.com](https://render.com)
2. Connect your MongoDB Atlas database
3. Have your Steam API keys ready

## Step 1: MongoDB Atlas Setup

1. Log in to MongoDB Atlas
2. Navigate to "Network Access" under Security
3. Click "Add IP Address"
4. Add `0.0.0.0/0` to allow access from anywhere (for development only)
   - For production, you would add Render.com's IP addresses
5. Click "Confirm"

## Step 2: Deploy the Backend Service

1. Log in to Render.com dashboard
2. Click "New" and select "Web Service"
3. Choose "Build and deploy from a Git repository"
4. Connect your GitHub account if not already connected
5. Find and select your cs2-marketplace repository
6. Configure the service:
   - **Name**: cs2-marketplace-api
   - **Region**: Choose closest to your target audience
   - **Branch**: main
   - **Root Directory**: server
   - **Runtime**: Node
   - **Build Command**: npm install
   - **Start Command**: npm start
   - **Plan**: Free

7. Add the following environment variables:
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

8. Click "Create Web Service"

## Step 3: Deploy the Frontend Static Site

1. From your Render dashboard, click "New" again and select "Static Site"
2. Choose your same Git repository
3. Configure the site:
   - **Name**: cs2-marketplace
   - **Branch**: main
   - **Root Directory**: client
   - **Build Command**: npm install && npm run build
   - **Publish Directory**: build
   - **Plan**: Free

4. Add the following environment variable:
   ```
   REACT_APP_API_URL=https://cs2-marketplace-api.onrender.com
   ```

5. Click "Create Static Site"

## Step 4: Update Steam API Configuration

After both services are deployed:

1. Go to [Steam Developer Portal](https://steamcommunity.com/dev/apikey)
2. Update your domain to your new Render domain
3. Make sure the callback URL matches your CALLBACK_URL environment variable

## Step 5: Testing

1. Once deployed, visit your frontend URL: `https://cs2-marketplace.onrender.com`
2. Try logging in with Steam
3. Test all the marketplace functionality

## Troubleshooting

- **MongoDB Connection Issues**: Make sure your IP whitelist in MongoDB Atlas includes Render.com
- **Steam Auth Problems**: Verify the callback URL is correct in both Steam and your environment variables
- **WebSocket Connection Issues**: Check that your frontend is correctly connecting to your backend URL

## Links to Your Deployed Apps

- Frontend: https://cs2-marketplace.onrender.com
- Backend API: https://cs2-marketplace-api.onrender.com