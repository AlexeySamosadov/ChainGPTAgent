// Minimal Valid Contract Bytecode (does not revert)
// Runtime: 608060405200 (MSTORE(0x40, 0x80), STOP)
export const MOCK_TOKEN_BYTECODE = "0x6080604052348015600f57600080fd5b50600680601d6000396000f3fe608060405200";

// Standard ERC20 ABI (for reference/future use)
export const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
];
