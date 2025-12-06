import { useChainId, useSwitchChain } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';

export function NetworkToggle() {
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const isTestnet = chainId === bscTestnet.id;

    return (
        <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-800">
            <button
                onClick={() => switchChain({ chainId: bsc.id })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isTestnet
                        ? 'bg-yellow-500/20 text-yellow-400 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
            >
                Mainnet
            </button>
            <button
                onClick={() => switchChain({ chainId: bscTestnet.id })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isTestnet
                        ? 'bg-green-500/20 text-green-400 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
            >
                Testnet
            </button>
        </div>
    );
}
