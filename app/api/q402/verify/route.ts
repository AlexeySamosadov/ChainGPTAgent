import { NextRequest, NextResponse } from 'next/server';

// Q402 Verification Route
// Verifies EIP-712 witness signature and EIP-7702 authorization

export const runtime = 'edge';

interface SignedPaymentPayload {
    witnessSignature: string;
    authorization: {
        chainId: number;
        address: string;
        nonce: number;
        yParity: number;
        r: string;
        s: string;
    };
    paymentDetails: {
        scheme: string;
        networkId: string;
        token: string;
        amount: string;
        to: string;
        implementationContract: string;
        witness: {
            domain: {
                name: string;
                version: string;
                chainId: number;
                verifyingContract: string;
            };
            types: Record<string, Array<{ name: string; type: string }>>;
            primaryType: string;
            message: {
                owner: string;
                token: string;
                amount: string;
                to: string;
                deadline: string;
                paymentId: string;
                nonce: string;
            };
        };
        authorization: {
            chainId: number;
            address: string;
            nonce: number;
        };
    };
}

export async function POST(request: NextRequest) {
    try {
        const payload: SignedPaymentPayload = await request.json();

        console.log('🔍 Q402 Verify Request:', JSON.stringify(payload, null, 2));

        // 1. Basic payload validation
        if (!payload.witnessSignature || !payload.authorization || !payload.paymentDetails) {
            return NextResponse.json({
                isValid: false,
                invalidReason: 'INVALID_PAYLOAD',
            }, { status: 400 });
        }

        const witness = payload.paymentDetails.witness;
        if (!witness?.message || !witness?.domain) {
            return NextResponse.json({
                isValid: false,
                invalidReason: 'INVALID_WITNESS',
            }, { status: 400 });
        }

        // 2. Check deadline
        const now = Math.floor(Date.now() / 1000);
        if (witness.message.deadline && now > Number(witness.message.deadline)) {
            return NextResponse.json({
                isValid: false,
                invalidReason: 'PAYMENT_EXPIRED',
            }, { status: 400 });
        }

        // 3. Verify signature formats
        const witnessFormatValid = isValidSignature(payload.witnessSignature);
        const authorizationFormatValid = isValidAuthorization(payload.authorization);

        if (!witnessFormatValid) {
            return NextResponse.json({
                isValid: false,
                invalidReason: 'INVALID_SIGNATURE_FORMAT',
            }, { status: 400 });
        }

        if (!authorizationFormatValid) {
            return NextResponse.json({
                isValid: false,
                invalidReason: 'INVALID_AUTHORIZATION_FORMAT',
            }, { status: 400 });
        }

        // 4. Verify EIP-712 witness signature
        const { verifyTypedData } = await import('viem');

        let witnessValid = false;
        try {
            witnessValid = await verifyTypedData({
                address: witness.message.owner as `0x${string}`,
                domain: {
                    name: witness.domain.name,
                    version: witness.domain.version,
                    chainId: witness.domain.chainId,
                    verifyingContract: witness.domain.verifyingContract as `0x${string}`,
                },
                types: witness.types,
                primaryType: witness.primaryType as 'TransferAuthorization',
                message: witness.message,
                signature: payload.witnessSignature as `0x${string}`,
            });
        } catch (error) {
            console.error('EIP-712 verification error:', error);
            witnessValid = false;
        }

        if (!witnessValid) {
            console.error('❌ EIP-712 signature verification failed');
            return NextResponse.json({
                isValid: false,
                invalidReason: 'INVALID_SIGNATURE',
            }, { status: 400 });
        }

        console.log('✅ EIP-712 signature verified successfully');

        // 5. Verify EIP-7702 authorization signature
        const authorizationValid = await verifyEIP7702Authorization(
            payload.authorization,
            payload.paymentDetails.implementationContract,
            witness.message.owner
        );

        if (!authorizationValid) {
            console.error('❌ EIP-7702 authorization verification failed');
            return NextResponse.json({
                isValid: false,
                invalidReason: 'INVALID_AUTHORIZATION',
            }, { status: 400 });
        }

        console.log('✅ EIP-7702 authorization verified successfully');

        // All validations passed
        return NextResponse.json({
            isValid: true,
            payer: witness.message.owner,
            details: {
                witnessValid: true,
                authorizationValid: true,
                amountValid: true,
                deadlineValid: true,
                recipientValid: true,
            },
        });

    } catch (error) {
        console.error('Q402 Verify Error:', error);
        return NextResponse.json({
            isValid: false,
            invalidReason: 'UNEXPECTED_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

function isValidSignature(signature: string): boolean {
    return (
        typeof signature === 'string' &&
        signature.startsWith('0x') &&
        signature.length === 132 // 65 bytes = 130 hex chars + 0x prefix
    );
}

function isValidAuthorization(authorization: SignedPaymentPayload['authorization']): boolean {
    const { chainId, address, nonce, yParity, r, s } = authorization;

    return !!(
        typeof chainId === 'number' && chainId > 0 &&
        typeof address === 'string' && address.startsWith('0x') && address.length === 42 &&
        typeof nonce === 'number' && nonce >= 0 &&
        typeof yParity === 'number' && (yParity === 0 || yParity === 1) &&
        typeof r === 'string' && r.startsWith('0x') && r.length === 66 &&
        typeof s === 'string' && s.startsWith('0x') && s.length === 66
    );
}

async function verifyEIP7702Authorization(
    authorization: SignedPaymentPayload['authorization'],
    expectedContract: string,
    expectedSigner: string
): Promise<boolean> {
    try {
        const { recoverAddress, keccak256, toRlp, toHex, concat } = await import('viem');

        const { chainId, address, nonce, yParity, r, s } = authorization;

        console.log(`🔍 Verifying EIP-7702 Authorization:`);
        console.log(`   Contract address: ${address}`);
        console.log(`   Expected contract: ${expectedContract}`);
        console.log(`   Expected signer (owner): ${expectedSigner}`);

        // 1. Verify the authorization is for the expected contract
        if (address.toLowerCase() !== expectedContract.toLowerCase()) {
            console.error(`❌ Authorization contract mismatch: ${address} !== ${expectedContract}`);
            return false;
        }

        // 2. Construct EIP-7702 authorization message
        const MAGIC = '0x05';

        const rlpData = toRlp([
            toHex(chainId),
            address.toLowerCase() as `0x${string}`,
            toHex(nonce),
        ]);

        const authHash = keccak256(concat([MAGIC as `0x${string}`, rlpData]));
        console.log(`   Authorization hash: ${authHash.slice(0, 20)}...`);

        // 3. Recover signer from signature
        const recoveredAddress = await recoverAddress({
            hash: authHash,
            signature: { r: r as `0x${string}`, s: s as `0x${string}`, yParity: yParity as 0 | 1 },
        });

        console.log(`   Recovered signer: ${recoveredAddress}`);

        // 4. Verify the recovered address matches the expected signer
        if (recoveredAddress.toLowerCase() !== expectedSigner.toLowerCase()) {
            console.error(`❌ Authorization signer mismatch:`);
            console.error(`   Expected: ${expectedSigner}`);
            console.error(`   Got: ${recoveredAddress}`);
            return false;
        }

        console.log(`✅ Authorization signature is valid`);
        return true;

    } catch (error) {
        console.error('❌ EIP-7702 authorization verification error:', error);
        return false;
    }
}