// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title SignatureBasedExecutor
 * @notice Q402 Implementation Contract for EIP-7702 Delegated Payments
 * @dev This contract is designed to be delegated to via EIP-7702
 *      When EIP-7702 is not available, it can be used with approve+transferFrom
 */
contract SignatureBasedExecutor is EIP712 {
    using ECDSA for bytes32;

    // EIP-712 type hash for TransferAuthorization
    bytes32 public constant TRANSFER_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferAuthorization(address owner,address token,uint256 amount,address to,uint256 deadline,bytes32 paymentId,uint256 nonce)"
    );

    // Nonces for replay protection
    mapping(address => uint256) public nonces;

    // Processed payment IDs for replay protection
    mapping(bytes32 => bool) public processedPayments;

    // Events
    event TransferExecuted(
        address indexed owner,
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bytes32 paymentId,
        uint256 nonce
    );

    constructor() EIP712("q402", "1") {}

    /**
     * @notice Execute a token transfer with signature verification
     * @param owner The token owner who signed the authorization
     * @param facilitator The facilitator executing the transfer (for logging)
     * @param token The ERC20 token address
     * @param recipient The recipient address
     * @param amount The amount to transfer
     * @param nonce The nonce for replay protection
     * @param deadline The deadline timestamp
     * @param signature The EIP-712 signature from the owner
     */
    function executeTransfer(
        address owner,
        address facilitator,
        address token,
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        // Check deadline
        require(block.timestamp <= deadline, "SignatureBasedExecutor: expired deadline");

        // Check nonce
        require(nonce == nonces[owner], "SignatureBasedExecutor: invalid nonce");

        // Create payment ID from parameters
        bytes32 paymentId = keccak256(abi.encodePacked(owner, token, amount, recipient, nonce, deadline));

        // Check if payment already processed
        require(!processedPayments[paymentId], "SignatureBasedExecutor: payment already processed");

        // Verify signature
        bytes32 structHash = keccak256(abi.encode(
            TRANSFER_AUTHORIZATION_TYPEHASH,
            owner,
            token,
            amount,
            recipient,
            deadline,
            paymentId,
            nonce
        ));

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == owner, "SignatureBasedExecutor: invalid signature");

        // Increment nonce
        nonces[owner]++;

        // Mark payment as processed
        processedPayments[paymentId] = true;

        // Execute transfer
        // In EIP-7702 context, this contract's code runs in the owner's EOA context
        // so we can call transferFrom with the owner as the from address
        // For non-EIP-7702, the owner must have approved this contract
        bool success = IERC20(token).transferFrom(owner, recipient, amount);
        require(success, "SignatureBasedExecutor: transfer failed");

        emit TransferExecuted(owner, token, recipient, amount, paymentId, nonce);
    }

    /**
     * @notice Get the current nonce for an owner
     * @param owner The owner address
     * @return The current nonce
     */
    function getNonce(address owner) external view returns (uint256) {
        return nonces[owner];
    }

    /**
     * @notice Check if a payment has been processed
     * @param paymentId The payment ID
     * @return True if processed
     */
    function isPaymentProcessed(bytes32 paymentId) external view returns (bool) {
        return processedPayments[paymentId];
    }

    /**
     * @notice Get the domain separator for EIP-712
     * @return The domain separator
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}