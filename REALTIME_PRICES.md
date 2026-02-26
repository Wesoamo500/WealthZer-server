# Real-Time Asset Price Integration

## Overview
This implementation adds real-time stock and cryptocurrency price fetching to calculate accurate portfolio values, gains/losses, and percentage changes based on purchase price vs current market price.

## Features

### 1. Real-Time Price Fetching
- **Crypto Prices**: Fetched from CoinGecko API (primary) with Binance API fallback
- **Stock Prices**: Fetched from Alpha Vantage API (primary) with Yahoo Finance fallback
- **Caching**: 1-minute cache to reduce API calls and improve performance
- **Batch Processing**: Fetches multiple asset prices concurrently

### 2. Portfolio Calculations

#### Individual Asset Metrics
For each asset, the system calculates:
- `currentPrice`: Real-time market price
- `currentValue`: currentPrice × amount
- `purchaseValue`: purchasePrice × amount
- `gainLoss`: currentValue - purchaseValue (absolute dollar amount)
- `gainLossPercent`: (gainLoss / purchaseValue) × 100

#### Portfolio-Wide Metrics
- `totalInvestments`: Sum of all asset current values
- `totalGainLoss`: Sum of all individual asset gains/losses
- `totalGainLossPercent`: (totalGainLoss / totalPurchaseValue) × 100

## API Endpoints

### Get Portfolio with Real-Time Prices
```
Message Pattern: { cmd: 'get-portfolio' }
Payload: { userId: string }

Response: [
  {
    id: string,
    name: string,
    symbol: string,
    type: 'STOCK' | 'CRYPTO' | 'CASH',
    amount: number,
    purchasePrice: number,
    currentPrice: number,
    currentValue: number,
    purchaseValue: number,
    gainLoss: number,
    gainLossPercent: number
  }
]
```

### Get Net Worth with Portfolio Performance
```
Message Pattern: { cmd: 'get-net-worth' }
Payload: { userId: string }

Response: {
  totalNetWorth: number,
  totalInvestments: number,
  totalGainLoss: number,
  totalGainLossPercent: number,
  totalIncome: number,
  totalExpenses: number,
  dailyChange: number,
  dailyChangePercent: number,
  budgets: [...],
  assets: [...],
  currency: 'USD'
}
```

## Supported Assets

### Cryptocurrencies (via CoinGecko/Binance)
- BTC (Bitcoin)
- ETH (Ethereum)
- USDT (Tether)
- BNB (Binance Coin)
- SOL (Solana)
- XRP (Ripple)
- ADA (Cardano)
- DOGE (Dogecoin)
- MATIC (Polygon)
- DOT (Polkadot)
- AVAX (Avalanche)
- LINK (Chainlink)
- UNI (Uniswap)
- ATOM (Cosmos)
- LTC (Litecoin)
- And many more...

### Stocks (via Alpha Vantage/Yahoo Finance)
- All US stocks (AAPL, GOOGL, MSFT, TSLA, etc.)
- Major international stocks
- ETFs and indices

## Configuration

### Optional API Key
Add to your `.env` file:
```env
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

Get a free API key at: https://www.alphavantage.co/support/#api-key
- Free tier: 5 calls/minute, 100 calls/day
- If not provided, uses 'demo' key with limited functionality

### No API Key Required
- CoinGecko API: Free, no key required
- Binance API: Free, no key required
- Yahoo Finance: Free, no key required (fallback)

## Example Calculations

### Example 1: Single Asset
```
Asset: AAPL (Apple Stock)
Purchase Price: $150
Current Price: $180
Amount: 10 shares

Calculations:
- purchaseValue = $150 × 10 = $1,500
- currentValue = $180 × 10 = $1,800
- gainLoss = $1,800 - $1,500 = $300
- gainLossPercent = ($300 / $1,500) × 100 = 20%
```

### Example 2: Portfolio
```
Assets:
1. AAPL: 10 shares @ $150 → now $180
   - Purchase: $1,500, Current: $1,800, Gain: $300

2. BTC: 0.5 BTC @ $40,000 → now $50,000
   - Purchase: $20,000, Current: $25,000, Gain: $5,000

3. ETH: 5 ETH @ $2,000 → now $2,500
   - Purchase: $10,000, Current: $12,500, Gain: $2,500

Portfolio Totals:
- totalPurchaseValue = $31,500
- totalInvestments = $39,300
- totalGainLoss = $7,800
- totalGainLossPercent = ($7,800 / $31,500) × 100 = 24.76%
```

## Error Handling

### Price Fetch Failures
- Uses cached price if available
- Returns 0 if no cached price exists
- Logs warnings for debugging
- Continues processing other assets

### API Rate Limits
- 1-minute cache reduces API calls
- Batch processing optimizes requests
- Fallback APIs provide redundancy

## Performance Optimizations

1. **Caching**: 1-minute TTL reduces redundant API calls
2. **Batch Processing**: Fetches all prices concurrently using Promise.all
3. **Fallback APIs**: Multiple data sources ensure reliability
4. **Lazy Loading**: Only fetches prices when needed

## Future Enhancements

1. **WebSocket Integration**: Real-time price updates via WebSocket
2. **Historical Data**: Track portfolio performance over time
3. **Price Alerts**: Notify users of significant price changes
4. **More Assets**: Support for commodities, forex, bonds
5. **Advanced Analytics**: Sharpe ratio, beta, correlation analysis
