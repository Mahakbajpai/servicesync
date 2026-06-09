import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ACTOR_PRIVATE_KEY = process.env.ACTOR_PRIVATE_KEY;

// Minimal ABI representing our contract structure
const CONTRACT_ABI = [
  "function recordStatusChange(string bookingId, string oldStatus, string newStatus, address actor) public",
  "function getAuditLogs(string bookingId) public view returns (tuple(string oldStatus, string newStatus, uint256 timestamp, address actor)[])"
];

// Fallback in-memory audit store if blockchain is not connected
const mockAuditStore = {};

const getContractInstance = async () => {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured in environment');
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Verify provider connection
  await provider.getNetwork();

  const wallet = new ethers.Wallet(ACTOR_PRIVATE_KEY, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
};

export const logStatusChangeOnChain = async (bookingId, oldStatus, newStatus, actorAddress) => {
  try {
    const contract = await getContractInstance();
    console.log(`[Blockchain] Recording status change for Booking ${bookingId}: ${oldStatus} -> ${newStatus}`);
    
    // Call the contract method
    // Convert bookingId to string to prevent overflow/type mismatch
    const tx = await contract.recordStatusChange(bookingId.toString(), oldStatus, newStatus, actorAddress);
    await tx.wait();
    console.log(`[Blockchain] Status successfully logged on-chain. TX Hash: ${tx.hash}`);
    return { success: true, txHash: tx.hash, mode: 'blockchain' };
  } catch (error) {
    console.warn(`[Blockchain Warning] Could not log status change on-chain, falling back to mock: ${error.message}`);
    
    // Fallback store
    if (!mockAuditStore[bookingId]) {
      mockAuditStore[bookingId] = [];
    }
    const record = {
      oldStatus,
      newStatus,
      timestamp: Math.floor(Date.now() / 1000),
      actor: actorAddress || '0x0000000000000000000000000000000000000000',
    };
    mockAuditStore[bookingId].push(record);
    return { success: true, txHash: 'MOCK_TX_HASH_' + Math.random().toString(36).substring(2, 15), mode: 'mock' };
  }
};

export const getAuditLogsFromChain = async (bookingId) => {
  try {
    const contract = await getContractInstance();
    console.log(`[Blockchain] Reading audit logs for Booking ${bookingId}`);
    
    const logs = await contract.getAuditLogs(bookingId.toString());
    
    // Convert BigInt types to strings/numbers for JSON parsing
    return {
      success: true,
      mode: 'blockchain',
      logs: logs.map(log => ({
        oldStatus: log.oldStatus,
        newStatus: log.newStatus,
        timestamp: Number(log.timestamp),
        actor: log.actor
      }))
    };
  } catch (error) {
    console.warn(`[Blockchain Warning] Could not read audit logs from chain, falling back to mock: ${error.message}`);
    
    const logs = mockAuditStore[bookingId] || [];
    return {
      success: true,
      mode: 'mock',
      logs
    };
  }
};
