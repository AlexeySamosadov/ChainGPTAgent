export interface TokenDef {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    logoURI?: string;
}

export const TESTNET_TOKENS: TokenDef[] = [
    {
        symbol: 'WBNB',
        name: 'Wrapped BNB',
        address: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
        decimals: 18
    },
    {
        symbol: 'USDT',
        name: 'USDT (Official-ish)',
        address: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
        decimals: 18 // Often 18 on BSC Testnet
    },
    {
        symbol: 'USDT',
        name: 'USDT (Alternative 1)',
        address: '0x7ef95a0FEE0Dd31b22626fA2e10Ee6A223F8a684',
        decimals: 6
    },
    {
        symbol: 'USDT',
        name: 'USDT (Alternative 2)',
        address: '0x55d398326f99059fF775485246999027B3197955', // Mainnet address sometimes copied to testnet?
        decimals: 18
    },
    {
        symbol: 'BUSD',
        name: 'BUSD Token',
        address: '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f1218',
        decimals: 18
    },
    {
        symbol: 'DAI',
        name: 'Dai Token',
        address: '0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F956622',
        decimals: 18
    }
];

export const MAINNET_TOKENS: TokenDef[] = [
    {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0x55d398326f99059fF775485246999027B3197955',
        decimals: 18
    },
    {
        symbol: 'BUSD',
        name: 'BUSD Token',
        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        decimals: 18
    }
];

export function getTokensBySymbol(symbol: string, chainId: number): TokenDef[] {
    const list = chainId === 97 ? TESTNET_TOKENS : MAINNET_TOKENS;
    return list.filter(t => t.symbol.toUpperCase() === symbol.toUpperCase());
}
