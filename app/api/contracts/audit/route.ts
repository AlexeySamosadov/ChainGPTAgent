import { NextResponse } from 'next/server';
import { chainGPT } from '@/lib/chaingpt/client';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { address, sourceCode, chainId } = body;

        if (!address && !sourceCode) {
            return NextResponse.json({ error: 'Address or Source Code required' }, { status: 400 });
        }

        let codeToAudit = sourceCode;

        // Fetch code from BSCScan if address provided but no source code
        if (!codeToAudit && address) {
            try {
                const bscscanApiKey = process.env.BSCSCAN_API_KEY || '';
                const isTestnet = chainId === 97;
                const baseUrl = isTestnet
                    ? 'https://api-testnet.bscscan.com/api'
                    : 'https://api.bscscan.com/api';

                const response = await fetch(
                    `${baseUrl}?module=contract&action=getsourcecode&address=${address}&apikey=${bscscanApiKey}`
                );
                const data = await response.json();

                if (data.status === '1' && data.result[0]?.SourceCode) {
                    codeToAudit = data.result[0].SourceCode;
                } else {
                    return NextResponse.json({
                        error: 'Contract source code not verified on BSCScan',
                        address
                    }, { status: 400 });
                }
            } catch (error) {
                console.error('Failed to fetch contract code from BSCScan:', error);
                return NextResponse.json({
                    error: 'Failed to fetch contract code from explorer',
                    address
                }, { status: 500 });
            }
        }

        const result = await chainGPT.auditContract(codeToAudit);
        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
    }
}
