/**
 * Zcash Lightwalletd Client
 * 
 * Connects to Zcash lightwalletd servers via gRPC to:
 * - Get transparent address UTXOs
 * - Broadcast transactions
 * - Monitor the blockchain
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const crypto = require('crypto');

// Lightwalletd server endpoints
const SERVERS = {
  testnet: 'lightwalletd.testnet.electriccoin.co:9067',
  mainnet: 'mainnet.lightwalletd.com:9067',
};

class LightwalletdClient {
  constructor(network = 'testnet') {
    this.network = network;
    this.serverUrl = SERVERS[network] || SERVERS.testnet;
    this.client = null;
  }

  async connect() {
    console.log(`Connecting to Zcash ${this.network} lightwalletd: ${this.serverUrl}`);
    
    // Load proto files
    const protoPath = path.join(__dirname, 'proto', 'service.proto');
    
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [path.join(__dirname, 'proto')],
    });
    
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const CompactTxStreamer = protoDescriptor.cash.z.wallet.sdk.rpc.CompactTxStreamer;
    
    // Create client with SSL for production servers
    this.client = new CompactTxStreamer(
      this.serverUrl,
      grpc.credentials.createSsl()
    );
    
    // Test connection
    return new Promise((resolve, reject) => {
      this.client.getLatestBlock({}, (err, response) => {
        if (err) {
          console.error('Connection failed:', err.message);
          reject(err);
        } else {
          console.log(`✅ Connected! Latest block: ${response.height}`);
          resolve(response);
        }
      });
    });
  }

  /**
   * Get latest block height
   */
  getLatestBlock() {
    return new Promise((resolve, reject) => {
      this.client.getLatestBlock({}, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  /**
   * Get lightwalletd server info
   */
  getLightdInfo() {
    return new Promise((resolve, reject) => {
      this.client.getLightdInfo({}, (err, response) => {
        if (err) reject(err);
        else resolve(response);
      });
    });
  }

  /**
   * Get UTXOs for a transparent address
   * This is what we need for building transactions!
   */
  getAddressUtxos(address) {
    return new Promise((resolve, reject) => {
      const request = {
        addresses: [address],
        maxEntries: 1000,
      };
      
      console.log(`Getting UTXOs for ${address}...`);
      
      // Use streaming for potentially large results
      const utxos = [];
      const call = this.client.getAddressUtxosStream(request);
      
      call.on('data', (utxo) => {
        utxos.push({
          txid: Buffer.from(utxo.txid).reverse().toString('hex'), // Reverse for display
          outputIndex: utxo.index,
          script: Buffer.from(utxo.script).toString('hex'),
          valueZat: parseInt(utxo.valueZat),
          height: parseInt(utxo.height),
        });
      });
      
      call.on('end', () => {
        console.log(`Found ${utxos.length} UTXOs`);
        resolve(utxos);
      });
      
      call.on('error', (err) => {
        // If streaming fails, try non-streaming method
        this.client.getAddressUtxos(request, (err2, response) => {
          if (err2) {
            reject(err2);
          } else {
            const utxoList = (response.addressUtxos || []).map(u => ({
              txid: Buffer.from(u.txid).reverse().toString('hex'),
              outputIndex: u.index,
              script: Buffer.from(u.script).toString('hex'),
              valueZat: parseInt(u.valueZat),
              height: parseInt(u.height),
            }));
            resolve(utxoList);
          }
        });
      });
    });
  }

  /**
   * Send a raw transaction
   */
  sendTransaction(rawTxHex) {
    return new Promise((resolve, reject) => {
      const request = {
        data: Buffer.from(rawTxHex, 'hex'),
      };
      
      this.client.sendTransaction(request, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            errorCode: response.errorCode,
            errorMessage: response.errorMessage,
          });
        }
      });
    });
  }

  /**
   * Get a transaction by txid
   */
  getTransaction(txid) {
    return new Promise((resolve, reject) => {
      // Convert txid to bytes (reverse it)
      const txidBytes = Buffer.from(txid, 'hex').reverse();
      
      const request = {
        hash: txidBytes,
      };
      
      this.client.getTransaction(request, (err, response) => {
        if (err) reject(err);
        else resolve({
          data: Buffer.from(response.data).toString('hex'),
          height: parseInt(response.height),
        });
      });
    });
  }

  close() {
    if (this.client) {
      grpc.closeClient(this.client);
    }
  }
}

// Test the client
async function test() {
  const address = 'tmK3sgY8d8Mh3RZHVE57Td8Tk7RpUbm5KJJ';
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Zcash Lightwalletd Client Test');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const client = new LightwalletdClient('testnet');
  
  try {
    // Connect
    await client.connect();
    
    // Get server info
    console.log('\n📊 Server Info:');
    const info = await client.getLightdInfo();
    console.log(`   Version: ${info.version}`);
    console.log(`   Vendor: ${info.vendor}`);
    console.log(`   Network: ${info.chainName}`);
    console.log(`   Block Height: ${info.blockHeight}`);
    console.log(`   Sapling: ${info.saplingActivationHeight}`);
    
    // Get UTXOs
    console.log(`\n💰 UTXOs for ${address}:`);
    const utxos = await client.getAddressUtxos(address);
    
    if (utxos.length === 0) {
      console.log('   No UTXOs found');
    } else {
      let total = 0;
      utxos.forEach((utxo, i) => {
        const zec = utxo.valueZat / 100000000;
        total += utxo.valueZat;
        console.log(`   ${i + 1}. ${zec} ZEC (height: ${utxo.height})`);
        console.log(`      txid: ${utxo.txid}`);
      });
      console.log(`\n   Total: ${total / 100000000} ZEC`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.close();
  }
}

// Export and run
module.exports = { LightwalletdClient };

if (require.main === module) {
  test();
}
