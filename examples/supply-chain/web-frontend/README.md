# Supply Chain Management Web Frontend

A React-based web interface for the Linera Supply Chain Management application.

## Features

- **Product Registration**: Register new products in the supply chain with images/documents
- **Checkpoint Tracking**: Add location-based checkpoints as products move through the supply chain
- **Status Updates**: Update product status (Registered, InTransit, Delivered, Verified, Rejected)
- **Product Verification**: Quality assurance checkpoints with pass/fail verification
- **Custody Transfers**: Transfer product ownership between parties and facilities (chains)
- **Real-time Updates**: Automatic updates via GraphQL subscriptions
- **History Timeline**: Visual timeline of all checkpoints and verifications
- **Multi-tab Product Details**: Overview, checkpoint history, and verification records

## Prerequisites

- Node.js 14+ and npm
- Running Linera service with supply-chain application deployed
- Chain ID and owner address

## Local Development

### Install Dependencies

```bash
cd examples/supply-chain/web-frontend
npm install
```

### Start Development Server

```bash
npm start
```

The application will open at `http://localhost:3000`.

### Access the Application

Navigate to:
```
http://localhost:3000/<CHAIN_ID>?app=<APP_ID>&owner=<OWNER>&port=<PORT>
```

Example:
```
http://localhost:3000/802375eabe210e4683c9334780f522d3bcc872e56feec369fab3b47349e365ec?app=0b97e3f21bf2f629c8fb371ada50231a08ab5a32481aed1c5c126cd9461a4705&owner=4799c8fdbbc55497ad3aadf1a31a9e54273c4110af12a0840d0abb5d63c62b23&port=8080
```

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` directory.

## Deploying to Vercel

### Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

### Deploy

#### Option 1: Deploy via CLI

From the `web-frontend` directory:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `examples/supply-chain/web-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
6. Click "Deploy"

### Environment Variables

No environment variables are required at build time. The application accepts runtime parameters via URL:

- `chainId`: The chain ID (required, from URL path)
- `app`: The application ID (required, query parameter)
- `owner`: The owner address (required, query parameter)
- `port`: The Linera service port (optional, defaults to 8080)

### Access Your Deployed App

After deployment, access your app at:
```
https://your-app.vercel.app/<CHAIN_ID>?app=<APP_ID>&owner=<OWNER>&port=<PORT>
```

## Configuration

### Connecting to a Different Linera Service

By default, the app connects to `localhost:8080`. To connect to a different service:

1. **For local development**: Modify `src/GraphQLProvider.js` to change the endpoint
2. **For deployed app**: Pass the `port` query parameter in the URL

### GraphQL Endpoint

The application connects to:
- Node Service (for data blob publishing): `http://localhost:{PORT}/`
- Application Service (for supply chain operations): `http://localhost:{PORT}/chains/{CHAIN_ID}/applications/{APP_ID}`

## Features Documentation

### Register Product
- Upload product image/document
- Enter product name (e.g., "iPhone 15 Pro - Serial#ABC123")
- Automatically creates initial checkpoint with "Registered" status

### Add Checkpoint
- Record product location updates
- Add status changes (InTransit, Delivered, etc.)
- Include optional notes about the checkpoint

### Update Status
- Change product status with location context
- Automatically adds checkpoint to history

### Verify Product
- Quality assurance checkpoints
- Pass/Fail verification
- Detailed verification notes
- Creates verification record and checkpoint

### Transfer Custody
- Transfer between parties on same chain
- Transfer between different chains (facilities)
- Automatically adds InTransit and Delivered checkpoints

### View Product Details
- **Overview Tab**: Product information and current status
- **Checkpoint History Tab**: Timeline of all location/status updates
- **Verification Records Tab**: All quality assurance records

## Troubleshooting

### Cannot Connect to Linera Service

Make sure:
1. The Linera service is running (`linera service --port 8080`)
2. The correct port is specified in the URL
3. CORS is properly configured (Linera service allows cross-origin requests)

### Products Not Showing

Verify:
1. The owner address is correct
2. Products have been registered on the specified chain
3. The application ID is correct

### GraphQL Errors

Check:
1. The application is properly deployed on the chain
2. The GraphQL schema matches the backend implementation
3. Browser console for detailed error messages

## Technology Stack

- **React**: UI framework
- **Apollo Client**: GraphQL client
- **Ant Design**: UI component library
- **GraphQL**: API query language
- **Vercel**: Hosting platform

## Development

### Project Structure

```
web-frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js              # Main application component
│   ├── GraphQLProvider.js   # GraphQL client configuration
│   ├── index.js            # Entry point
│   ├── App.css             # Styles
│   └── index.css           # Global styles
├── package.json
├── vercel.json             # Vercel configuration
└── README.md
```

### Available Scripts

#### `npm start`

Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.

#### `npm run build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

### Adding New Features

1. Add GraphQL queries/mutations in `App.js`
2. Create mutation hooks with Apollo Client
3. Add UI components using Ant Design
4. Update modals and forms as needed

## License

Apache-2.0
